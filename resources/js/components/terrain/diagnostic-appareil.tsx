import {
    CircleAlert,
    HardDrive,
    MessageSquareHeart,
    RefreshCw,
    Send,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SectionCompte } from '@/components/entete-compte';
import { TonAvis } from '@/components/terrain/ton-avis';
import { Button } from '@/components/ui/button';
import { formaterJourHeure } from '@/lib/dates';
import { useHorsLigne } from '@/lib/hors-ligne';
import {
    dernierDiagnostic,
    diagnostiquer,
    envoyerDiagnostic,
} from '@/lib/terrain';
import type { DiagnosticEnvoye } from '@/lib/terrain';
import {
    alertesDiagnostic,
    formaterDecalage,
    formaterOctets,
} from '@/lib/terrain/diagnostic';
import type { Diagnostic } from '@/lib/terrain/diagnostic';
import { pluriel } from '@/lib/utils';

const ETAT_TRAVAILLEUR: Record<Diagnostic['service_worker'], string> = {
    actif: 'Actif',
    en_attente: 'Nouvelle version en attente',
    installation: 'En cours d’installation',
    absent: 'Pas encore installé',
    indisponible: 'Indisponible sur ce navigateur',
};

/**
 * « Mon compte › Appareils › Cet appareil » (lot 14, terrain) : l'état de
 * ce téléphone, lu sur le téléphone (hors ligne aussi), et « Envoyer ce
 * diagnostic » par la file avec un code court à donner à l'équipe.
 * Rien de personnel n'y figure.
 */
export function DiagnosticAppareil() {
    const { enAttente } = useHorsLigne();
    // La version de la page servie : connue dès le premier rendu, avant
    // tout événement de navigation.
    const { version } = usePage();
    const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
    const [envoye, setEnvoye] = useState<DiagnosticEnvoye | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [avis, setAvis] = useState(false);

    const relire = useCallback(() => {
        void diagnostiquer(version)
            .then(setDiagnostic)
            .catch(() => undefined);
    }, [version]);

    useEffect(() => {
        relire();
        void dernierDiagnostic().then(setEnvoye);
    }, [relire, enAttente]);

    function envoyer() {
        if (diagnostic === null) {
            return;
        }

        setEnvoi(true);
        envoyerDiagnostic(diagnostic)
            .then((resultat) => {
                setEnvoye(resultat);
                toast.success(`Diagnostic ${resultat.code} prêt à partir.`, {
                    description:
                        'Donne ce code à la personne qui t’aide : il part tout seul dès qu’il y a du réseau.',
                });
            })
            .catch(() =>
                toast.error(
                    'Le diagnostic n’a pas pu être gardé sur le téléphone. Réessaie.',
                ),
            )
            .finally(() => setEnvoi(false));
    }

    const alertes = diagnostic ? alertesDiagnostic(diagnostic) : [];
    const libre =
        diagnostic?.stockage_quota != null &&
        diagnostic.stockage_utilise != null
            ? diagnostic.stockage_quota - diagnostic.stockage_utilise
            : null;

    const lignes: [string, string][] = diagnostic
        ? [
              ['Version', diagnostic.version_app?.slice(0, 8) ?? 'inconnue'],
              ['Mode hors ligne', ETAT_TRAVAILLEUR[diagnostic.service_worker]],
              [
                  'Application installée',
                  diagnostic.installee ? 'Oui' : 'Non (navigateur)',
              ],
              [
                  'Téléchargements',
                  diagnostic.packs === 0
                      ? 'Aucun'
                      : `${pluriel(diagnostic.packs, 'matière')} · ${formaterOctets(diagnostic.packs_poids)}`,
              ],
              [
                  'Place utilisée',
                  `${formaterOctets(diagnostic.stockage_utilise)}${libre !== null ? ` · ${formaterOctets(libre)} libres` : ''}`,
              ],
              [
                  'Réponses en attente',
                  diagnostic.en_attente === 0
                      ? 'Aucune'
                      : String(diagnostic.en_attente),
              ],
              [
                  'Dernier envoi réussi',
                  diagnostic.derniere_synchro
                      ? formaterJourHeure(diagnostic.derniere_synchro)
                      : 'Pas encore',
              ],
              [
                  'Heure du téléphone',
                  formaterDecalage(diagnostic.decalage_horloge_ms),
              ],
              [
                  'Navigateur',
                  [diagnostic.navigateur, diagnostic.systeme]
                      .filter(Boolean)
                      .join(' · ') || 'inconnu',
              ],
              [
                  'Réseau',
                  diagnostic.reseau
                      ? `${diagnostic.reseau.toUpperCase()}${diagnostic.economie_donnees ? ' · économie de données' : ''}`
                      : 'inconnu',
              ],
          ]
        : [];

    return (
        <SectionCompte
            titre="Cet appareil"
            description="Si quelque chose ne marche pas, envoie ce diagnostic et donne son code à la personne qui t’aide. Il ne contient ni ton nom ni ton numéro."
        >
            {alertes.length > 0 && (
                <ul
                    className="grid gap-1.5 rounded-controle border border-indice-400/50 bg-indice-400/15 p-3 text-aide"
                    data-capture="variable"
                    data-alertes-appareil
                >
                    {alertes.map((alerte) => (
                        <li key={alerte} className="flex items-start gap-2">
                            <CircleAlert
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-indice-700 dark:text-indice-400"
                            />
                            {alerte}
                        </li>
                    ))}
                </ul>
            )}

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-controle border bg-border">
                {diagnostic === null ? (
                    <div className="col-span-2 flex items-center gap-2 bg-card p-4 text-aide text-ink-500">
                        <HardDrive aria-hidden className="size-4" />
                        Lecture de l’appareil…
                    </div>
                ) : (
                    lignes.map(([terme, valeur]) => (
                        <div
                            key={terme}
                            className="grid content-start gap-0.5 bg-card px-3 py-2.5 sm:px-4"
                        >
                            <dt className="text-meta text-ink-500">{terme}</dt>
                            <dd
                                className="text-aide font-medium break-words text-ink-900 sm:text-interface"
                                data-capture="variable"
                            >
                                {valeur}
                            </dd>
                        </div>
                    ))
                )}
            </dl>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                    disabled={diagnostic === null || envoi}
                    onClick={envoyer}
                >
                    <Send aria-hidden />
                    Envoyer ce diagnostic
                </Button>
                <Button variant="outline" onClick={relire}>
                    <RefreshCw aria-hidden />
                    Relire
                </Button>
                {!avis && (
                    <Button
                        variant="ghost"
                        className="sm:ml-auto"
                        onClick={() => setAvis(true)}
                    >
                        <MessageSquareHeart aria-hidden />
                        Donner mon avis
                    </Button>
                )}
            </div>

            {envoye && (
                <p
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-controle bg-craie-100 px-4 py-3 text-aide text-ink-600 dark:bg-relief/60"
                    data-capture="variable"
                >
                    <span>Code du dernier diagnostic :</span>
                    <strong className="text-xl font-bold tracking-[0.12em] text-ink-900 font-data">
                        {envoye.code}
                    </strong>
                    <span>{formaterJourHeure(envoye.le)}</span>
                </p>
            )}

            {avis && (
                <TonAvis
                    ecran="appareils"
                    question="N’karamögö t’aide à réviser ?"
                    onFermer={() => setAvis(false)}
                />
            )}
        </SectionCompte>
    );
}
