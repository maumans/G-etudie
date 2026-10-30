<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Fond du canevas avant le chargement du CSS (craie-50, DESIGN.md § 2.1) --}}
        <style>
            html {
                background-color: #FCF7F4;
            }

            html.dark {
                background-color: #110E0B;
            }
        </style>

        <meta name="theme-color" content="#D04904">

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <link rel="manifest" href="/manifest.webmanifest">

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />

        {{--
            Filet de démarrage (HORS_LIGNE.md A.3.3, défaut 2) : le document est
            arrivé mais pas le code de l'application (coupure juste après un
            déploiement). Rien de l'application ne tourne : ce filet vit donc ici,
            en HTML et script en ligne, sans dépendance. Caché par un style en
            ligne, pas par `hidden` : son propre display:flex l'emporterait.
        --}}
        <div id="filet-demarrage" role="alert" style="display:none;position:fixed;inset:0;z-index:2147483647;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;background:#FCF7F4;color:#1E1814">
            <p style="margin:0;font-size:20px;font-weight:600;max-width:26rem">Tes réponses déjà faites sont gardées sur ce téléphone.</p>
            <p style="margin:0;max-width:26rem;color:#5E544D">La nouvelle version arrive dès que le réseau revient : la page se rechargera toute seule.</p>
            <button type="button" onclick="location.reload()" style="min-height:44px;padding:0 18px;border:0;border-radius:10px;background:#D04904;color:#fff;font:inherit;font-weight:500;cursor:pointer">Recharger</button>
        </div>
        <script>
            (function () {
                var filet = document.getElementById('filet-demarrage');
                var prefixe = location.origin + '/build/';
                var ouvert = false;

                function ouvrir() {
                    if (ouvert || window.__nkaramogoPret) {
                        return;
                    }
                    ouvert = true;
                    if (document.documentElement.classList.contains('dark')) {
                        filet.style.background = '#110E0B';
                        filet.style.color = '#F8F4F1';
                    }
                    filet.style.display = 'flex';
                    window.addEventListener('online', function () { location.reload(); });
                }

                // Phase de capture : une erreur de chargement ne remonte pas.
                // Seuls les fichiers du build comptent (hors ligne, une police
                // ou une ressource tierce échoue sans que l'application soit
                // en cause).
                window.addEventListener('error', function (evenement) {
                    var cible = evenement.target;
                    var adresse = cible && (cible.src || cible.href);
                    if (typeof adresse === 'string' && adresse.indexOf(prefixe) === 0) {
                        setTimeout(ouvrir, 1500);
                    }
                }, true);

                setTimeout(ouvrir, 12000);
            })();
        </script>
    </body>
</html>
