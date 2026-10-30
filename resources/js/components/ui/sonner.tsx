import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Notifications brèves (succès et erreurs des messages flash). Jamais pour
 * une information qu'on doit retrouver : elle disparaît.
 */
function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            position="bottom-center"
            containerAriaLabel="Notifications"
            toastOptions={{
                classNames: {
                    toast: 'font-sans text-interface rounded-[12px]! shadow-flottant!',
                    description: 'text-ink-600!',
                    title: 'font-medium!',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
