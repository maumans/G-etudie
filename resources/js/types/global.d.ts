import type { Auth } from '@/types/auth';

export type QuotaTuteur = {
    limite: number;
    utilises: number;
    restants: number;
    abonne: boolean;
};

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare global {
    interface Window {
        /** Posé par app.tsx au démarrage ; lu par le filet de app.blade.php. */
        __nkaramogoPret?: boolean;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            /** Lot 10 : le quota du jour du tuteur (élèves seulement). */
            tuteur: QuotaTuteur | null;
            [key: string]: unknown;
        };
    }
}
