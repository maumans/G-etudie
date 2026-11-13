<?php

namespace App\Services\Tuteur;

use Anthropic\Beta\Messages\BetaMessage;
use Anthropic\Beta\Messages\BetaRawContentBlockDeltaEvent;
use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Beta\Messages\BetaTextDelta;
use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\BadRequestException;
use Anthropic\Core\Exceptions\RateLimitException;
use Anthropic\Lib\Streaming\MessageAccumulator;
use Closure;
use Illuminate\Support\Facades\Log;

/**
 * L'API Claude écrit l'explication, en flux (PLAN M11 : « réponses
 * diffusées en flux »). Chaque morceau de texte part vers l'élève dès qu'il
 * arrive ; le message complet (jetons, fin) est recomposé à côté.
 *
 *  - Consignes fixes en premier, avec un point de cache ; le contexte de la
 *    question ensuite, avec le sien : les relances d'une même conversation
 *    relisent les deux depuis le cache.
 *  - Effort `low` (config) : une reformulation courte démarre vite.
 *  - Repli côté serveur (`fallbacks: default`) : si le modèle décline par
 *    prudence, un modèle de repli reprend au lieu de laisser l'élève sans
 *    réponse ; si toute la chaîne décline, `fin = refus`.
 *  - `metadata.userID` : une empreinte opaque, jamais l'identité.
 */
class TuteurClaude implements MoteurTuteur
{
    public function repondre(RequeteTuteur $requete, Closure $surTexte): ReponseMoteur
    {
        $cle = config('services.anthropic.cle');

        if (! is_string($cle) || $cle === '') {
            throw new TuteurIndisponible('Le tuteur n’est pas encore ouvert sur la plateforme.');
        }

        $messages = [];

        foreach ($requete->messages as $rang => $message) {
            $messages[] = $rang === 0
                ? ['role' => 'user', 'content' => [
                    ['type' => 'text', 'text' => $requete->contexte, 'cacheControl' => ['type' => 'ephemeral']],
                    ['type' => 'text', 'text' => $message['content']],
                ]]
                : $message;
        }

        try {
            $client = new Client(apiKey: $cle);
            $accumulateur = MessageAccumulator::forBetaMessages();

            $flux = $client->beta->messages->createStream(
                model: (string) config('tuteur.modele'),
                maxTokens: (int) config('tuteur.jetons_max'),
                system: [['type' => 'text', 'text' => $requete->systeme, 'cacheControl' => ['type' => 'ephemeral']]],
                messages: $messages,
                metadata: ['userID' => $requete->utilisateur],
                outputConfig: ['effort' => self::effort()],
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );

            foreach ($flux as $evenement) {
                $accumulateur->accumulate($evenement);

                if ($evenement instanceof BetaRawContentBlockDeltaEvent && $evenement->delta instanceof BetaTextDelta) {
                    $surTexte($evenement->delta->text);
                }
            }

            /** @var BetaMessage $message */
            $message = $accumulateur->message();
        } catch (AuthenticationException) {
            Log::error('Tuteur : clé de l’API Claude refusée.');

            throw new TuteurIndisponible('Le tuteur est momentanément fermé. Réessaie plus tard.');
        } catch (RateLimitException) {
            throw new TuteurIndisponible('Beaucoup d’élèves demandent le tuteur en ce moment. Réessaie dans une minute.');
        } catch (BadRequestException $e) {
            Log::warning('Tuteur : demande refusée par l’API', ['message' => $e->getMessage()]);

            throw new TuteurIndisponible('Le tuteur n’a pas pu lire cette demande. Reformule-la plus court.');
        } catch (APIStatusException|APIConnectionException $e) {
            Log::warning('Tuteur : API injoignable', ['message' => $e->getMessage()]);

            throw new TuteurIndisponible('Le tuteur ne répond pas en ce moment. Réessaie dans un instant.');
        }

        $texte = '';

        foreach ($message->content as $bloc) {
            if ($bloc instanceof BetaTextBlock) {
                $texte .= $bloc->text;
            }
        }

        return new ReponseMoteur(
            texte: $texte,
            fin: match ($message->stopReason) {
                'refusal' => 'refus',
                'max_tokens' => 'coupee',
                default => 'complete',
            },
            modele: $message->model,
            jetonsEntree: $message->usage->inputTokens,
            jetonsSortie: $message->usage->outputTokens,
            jetonsCacheLus: $message->usage->cacheReadInputTokens ?? 0,
            jetonsCacheEcrits: $message->usage->cacheCreationInputTokens ?? 0,
        );
    }

    /** @return 'low'|'medium'|'high'|'xhigh'|'max' */
    private static function effort(): string
    {
        $effort = config('tuteur.effort');

        return match ($effort) {
            'medium', 'high', 'xhigh', 'max' => $effort,
            default => 'low',
        };
    }
}
