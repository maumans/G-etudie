/** Message flash affiché en notification (Inertia::flash('toast', …)). */
export type FlashToast = {
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
};
