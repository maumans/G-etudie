/**
 * Dates du back-office, en français et à l'heure de Conakry (UTC+0, sans
 * heure d'été). `maintenant` se passe en test pour figer l'horloge.
 */
const FUSEAU = 'Africa/Conakry';

const JOUR = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: FUSEAU,
});

const JOUR_HEURE = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSEAU,
});

const HEURE = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSEAU,
});

const RELATIF = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

export function formaterJour(iso: string): string {
    return JOUR.format(new Date(iso));
}

export function formaterJourHeure(iso: string): string {
    return JOUR_HEURE.format(new Date(iso));
}

export function formaterHeure(date: Date): string {
    return HEURE.format(date);
}

/** « à l'instant », « il y a 5 minutes », « hier », puis la date. */
export function depuis(iso: string, maintenant: Date = new Date()): string {
    const secondes = Math.round(
        (new Date(iso).getTime() - maintenant.getTime()) / 1000,
    );
    const ecart = Math.abs(secondes);

    if (ecart < 60) {
        return 'à l’instant';
    }

    if (ecart < 3600) {
        return RELATIF.format(Math.round(secondes / 60), 'minute');
    }

    if (ecart < 86_400) {
        return RELATIF.format(Math.round(secondes / 3600), 'hour');
    }

    if (ecart < 7 * 86_400) {
        return RELATIF.format(Math.round(secondes / 86_400), 'day');
    }

    return formaterJour(iso);
}
