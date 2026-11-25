import { Form, Head, Link } from '@inertiajs/react';
import { GraduationCap, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { EnTeteConnexion } from '@/layouts/connexion-layout';
import { Button } from '@/components/ui/button';
import { Champ } from '@/components/ui/champ';
import { Input } from '@/components/ui/input';
import { MotDePasseInput } from '@/components/ui/mot-de-passe-input';
import { Spinner } from '@/components/ui/spinner';
import { TelephoneInput } from '@/components/ui/telephone-input';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';

/** Mêmes clés que `CreateNewUser::PROFILS`. */
type Profil = 'eleve' | 'parent';

const PROFILS: { cle: Profil; libelle: string; icone: LucideIcon }[] = [
    { cle: 'eleve', libelle: 'Je suis élève', icone: GraduationCap },
    { cle: 'parent', libelle: 'Je suis parent', icone: UsersRound },
];

const TEXTES: Record<
    Profil,
    { description: string; aidePseudo: string; aideNumero?: string }
> = {
    eleve: {
        description:
            'Une minute suffit. Ton numéro sert à te connecter et à retrouver ton compte.',
        aidePseudo:
            'Les autres élèves verront ton pseudo, jamais ton nom ni ton numéro.',
    },
    parent: {
        description:
            'Une minute suffit. Votre enfant vous donnera ensuite un code pour que vous suiviez ses révisions.',
        aidePseudo:
            'Il s’affiche dans votre espace ; votre nom et votre numéro restent privés.',
        aideNumero: 'Il sert à vous connecter et à retrouver votre compte.',
    },
};

/** « /register?profil=parent » ouvre la page sur le choix « parent ». */
function profilDeLAdresse(): Profil {
    if (typeof window === 'undefined') {
        return 'eleve';
    }

    return new URLSearchParams(window.location.search).get('profil') ===
        'parent'
        ? 'parent'
        : 'eleve';
}

/**
 * Inscription (D3, PLAN § 10) : prénom, pseudo, téléphone, mot de passe —
 * rien d'autre. Pas d'e-mail, pas de date de naissance. Le numéro se vérifie
 * juste après, sans bloquer. Deux profils (2026-11-25) : élève (par défaut)
 * ou parent ; un parent suit ensuite son enfant avec le code que l'enfant
 * lui donne.
 */
export default function Inscription() {
    const [profil, setProfil] = useState<Profil>(profilDeLAdresse);
    const textes = TEXTES[profil];

    return (
        <>
            <Head title="Créer un compte" />
            <EnTeteConnexion
                titre="Créer un compte"
                description={textes.description}
            />

            <Form
                {...store.form()}
                resetOnError={['password']}
                className="grid gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <fieldset className="grid gap-1.5">
                            <legend className="sr-only">
                                Pour qui est ce compte ?
                            </legend>
                            <div className="grid grid-cols-2 gap-1 rounded-controle bg-craie-100 p-1">
                                {PROFILS.map(
                                    ({ cle, libelle, icone: Icone }) => (
                                        <label
                                            key={cle}
                                            className={cn(
                                                'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[7px] text-interface font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                                                profil === cle
                                                    ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                                    : 'text-ink-600 hover:text-ink-900',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="profil"
                                                value={cle}
                                                checked={profil === cle}
                                                onChange={() => setProfil(cle)}
                                                className="sr-only"
                                            />
                                            <Icone
                                                aria-hidden
                                                className="size-[1.125rem]"
                                            />
                                            {libelle}
                                        </label>
                                    ),
                                )}
                            </div>
                            {errors.profil && (
                                <p className="text-aide text-faux-700 dark:text-faux-400">
                                    {errors.profil}
                                </p>
                            )}
                        </fieldset>

                        <Champ libelle="Prénom" erreur={errors.prenom}>
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    name="prenom"
                                    required
                                    autoFocus
                                    autoComplete="given-name"
                                    maxLength={60}
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Pseudo"
                            aide={textes.aidePseudo}
                            erreur={errors.pseudo}
                        >
                            {(attributs) => (
                                <Input
                                    {...attributs}
                                    name="pseudo"
                                    required
                                    autoComplete="nickname"
                                    autoCapitalize="none"
                                    maxLength={20}
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Numéro de téléphone"
                            aide={textes.aideNumero}
                            erreur={errors.telephone}
                        >
                            {(attributs) => (
                                <TelephoneInput
                                    {...attributs}
                                    name="telephone"
                                    required
                                />
                            )}
                        </Champ>
                        <Champ
                            libelle="Mot de passe"
                            aide="8 caractères au moins."
                            erreur={errors.password}
                        >
                            {(attributs) => (
                                <MotDePasseInput
                                    {...attributs}
                                    name="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            )}
                        </Champ>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Créer mon compte
                        </Button>
                    </>
                )}
            </Form>

            <p className="text-center text-ink-600">
                Déjà un compte ?{' '}
                <Link
                    href={login()}
                    prefetch
                    className="font-medium text-lien underline-offset-4 transition-colors hover:underline"
                >
                    Se connecter
                </Link>
            </p>
        </>
    );
}
