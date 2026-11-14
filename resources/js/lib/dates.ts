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

const JOUR_COURT = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: FUSEAU,
});

/** « 18 nov. » : une date proche, dans une ligne de liste. */
export function formaterJourCourt(iso: string): string {
    return JOUR_COURT.format(new Date(iso));
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

const JOUR_CIVIL = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: FUSEAU,
});

/**
 * Lot 11 : une échéance comptée en jours du calendrier de Conakry —
 * « aujourd’hui », « demain », « dans 3 jours », « il y a 2 jours ».
 */
export function echeanceRelative(
    iso: string,
    maintenant: string | Date = new Date(),
): string {
    const jour = (d: string | Date) =>
        Date.parse(`${JOUR_CIVIL.format(new Date(d))}T00:00:00Z`) / 86_400_000;
    const ecart = Math.round(jour(iso) - jour(maintenant));

    if (ecart === 0) {
        return 'aujourd’hui';
    }

    if (ecart === 1) {
        return 'demain';
    }

    if (ecart > 1) {
        return `dans ${ecart} jours`;
    }

    return ecart === -1 ? 'hier' : `il y a ${-ecart} jours`;
}
