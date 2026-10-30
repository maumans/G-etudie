{{--
    Page de repli du service worker (HORS_LIGNE.md A.3.7) : rechargement complet
    ou adresse tapée, hors ligne, d'un écran sans copie. Autonome : styles en
    ligne, aucune feuille ni script (ils peuvent manquer), clair et sombre.
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#D04904">
<title>Pas de connexion · N'karamögö</title>
<style>
    :root { color-scheme: light dark; --fond: #FCF7F4; --carte: #FFFFFF; --encre: #1E1814; --texte: #5E544D; --trait: #EAE1DA; --nimba: #D04904; }
    @media (prefers-color-scheme: dark) { :root { --fond: #110E0B; --carte: #1A1612; --encre: #F8F4F1; --texte: #B3A79E; --trait: #2E2721; --nimba: #F07A3A; } }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; background: var(--fond); color: var(--encre); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
    main { width: 100%; max-width: 26rem; background: var(--carte); border: 1px solid var(--trait); border-radius: 16px; padding: 28px 24px; text-align: center; }
    .marque { display: inline-flex; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 12px; background: var(--nimba); color: #fff; font-weight: 700; font-size: 18px; margin-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    p { margin: 0 0 12px; color: var(--texte); }
    .rassure { color: var(--encre); font-weight: 500; }
    a { display: inline-flex; margin-top: 8px; min-height: 44px; align-items: center; padding: 0 18px; border-radius: 10px; background: var(--nimba); color: #fff; text-decoration: none; font-weight: 500; }
</style>
</head>
<body>
<main role="main">
    <div class="marque" aria-hidden="true">N'</div>
    <h1>Cet écran demande une connexion</h1>
    <p>Ou il n'a pas encore été ouvert sur ce téléphone avec du réseau : il n'y en a pas de copie ici.</p>
    <p class="rassure">Tes réponses déjà faites sont gardées sur ce téléphone.</p>
    <a href="/eleve">Retour à l'accueil</a>
</main>
<script>
    // Retour du réseau : on vérifie qu'il répond (HEAD : jamais intercepté par
    // le service worker) avant de recharger ; sinon on réessaie toutes les 15 s.
    (function () {
        function essayer() {
            fetch(location.href, { method: 'HEAD', cache: 'no-store' })
                .then(function () { location.reload(); })
                .catch(function () {});
        }
        window.addEventListener('online', function () { setTimeout(essayer, 1000); });
        setInterval(essayer, 15000);
    })();
</script>
</body>
</html>
