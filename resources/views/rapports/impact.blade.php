@php
    use App\Support\Gnf;
    use Carbon\CarbonImmutable;

    /** @var array<string, mixed> $impact */
    $nombre = fn ($v) => $v === null ? '—' : Gnf::formaterNombre($v);
    $signe = fn ($v) => $v === null ? '—' : ($v > 0 ? '+' : '').Gnf::formaterNombre($v);
    $date = fn (string $d) => CarbonImmutable::parse($d)->locale('fr')->translatedFormat('j F Y');
    $assidus = $impact['assidus'];
    $autres = $impact['autres'];
    $methode = $impact['methode'];
    $comparable = $assidus['jauge']['ecart'] !== null && $autres['jauge']['ecart'] !== null;
@endphp
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rapport d’impact — N’karamögö</title>
    <style>
        @foreach ($polices as $graisse => $fichier)
        @font-face {
            font-family: 'bricolage';
            font-style: normal;
            font-weight: {{ $graisse }};
            src: url('{{ $fichier }}') format('truetype');
        }
        @endforeach

        @page { margin: 30px 38px 44px; }
        * { box-sizing: border-box; }
        body { font-family: 'bricolage', sans-serif; font-size: 11px; line-height: 1.45; color: #1e1814; margin: 0; }
        .entete { border-bottom: 1px solid #ddd4ce; padding-bottom: 10px; margin-bottom: 14px; }
        .entete td { vertical-align: bottom; }
        .marque { font-size: 13px; font-weight: 700; }
        .marque .point { color: #f6641b; }
        .meta { color: #766d66; font-size: 10px; }
        h1 { font-size: 24px; font-weight: 400; margin: 10px 0 4px; letter-spacing: -0.2px; }
        h1 strong { font-weight: 700; }
        h2 { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
        .chapeau { color: #655c55; font-size: 11.5px; margin: 0; }
        .exemple { background: #fff4d6; border: 1px solid #f0d58a; color: #6b4e00; padding: 7px 10px; border-radius: 8px; font-weight: 600; margin-bottom: 14px; }
        .fort { background: #1e1814; color: #fcf7f4; border-radius: 14px; padding: 14px 18px; margin-bottom: 14px; }
        .fort .grand { font-size: 16px; font-weight: 400; line-height: 1.3; }
        .fort .grand strong { font-weight: 700; color: #feb295; }
        .fort .petit { color: #c9bfb7; font-size: 10px; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; }
        .groupes td.colonne { width: 50%; vertical-align: top; padding: 0; }
        .groupes td.colonne:first-child { padding-right: 7px; }
        .groupes td.colonne:last-child { padding-left: 7px; }
        .carte { border: 1px solid #ddd4ce; border-radius: 14px; padding: 12px 16px; background: #fcf7f4; }
        .carte.marque-g { border-color: #feb295; background: #fef4f1; }
        .pastille { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 6px; }
        .ligne td { padding: 4px 0; border-bottom: 1px solid #e9e2d6; }
        .ligne tr:last-child td { border-bottom: 0; }
        .ligne td.v { text-align: right; font-weight: 600; }
        .chiffre { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
        .unite { font-size: 11px; font-weight: 400; color: #766d66; }
        .section { margin-top: 14px; }
        .legende span { margin-right: 14px; color: #655c55; font-size: 10px; }
        .methode p, .methode li { color: #4f4741; margin: 0 0 3px; font-size: 10px; line-height: 1.4; }
        .methode ul { margin: 0; padding-left: 14px; }
        .pied { position: fixed; bottom: -30px; left: 0; right: 0; color: #988f87; font-size: 9px; border-top: 1px solid #e9e2d6; padding-top: 6px; }
        .vide { color: #766d66; font-style: italic; }
    </style>
</head>
<body>
    <div class="pied">
        N’karamögö · G-Étudie — rapport généré le {{ $date($le->toDateString()) }}. Chiffres agrégés : aucun nom, pseudo ni numéro d’élève ; un groupe de moins de {{ $methode['seuil'] }} élèves n’est pas chiffré.
    </div>

    <table class="entete">
        <tr>
            <td>
                <div class="marque">N’karamögö<span class="point"> ·</span> G-Étudie</div>
                <h1>Rapport d’<strong>impact</strong></h1>
                <p class="chapeau">
                    Du {{ $date($impact['periode']['debut']) }} au {{ $date($impact['periode']['fin']) }}
                    ({{ $impact['filtres']['semaines'] }} semaines) · {{ $impact['libelles']['examen'] }} · {{ $impact['libelles']['etablissement'] }}
                </p>
            </td>
            <td style="text-align: right;" class="meta">
                {{ $nombre($impact['eleves']) }} élèves dans le périmètre
            </td>
        </tr>
    </table>

    @if ($impact['est_exemple'])
        <div class="exemple">EXEMPLE — contenu fictif. Ces chiffres viennent des données de démonstration.</div>
    @endif

    <div class="fort">
        @if ($comparable)
            <div class="grand">
                En {{ $impact['filtres']['semaines'] }} semaines, la jauge de préparation des élèves assidus a évolué de
                <strong>{{ $signe($assidus['jauge']['ecart']) }} points</strong>, contre {{ $signe($autres['jauge']['ecart']) }} pour les autres élèves.
            </div>
            <div class="petit">
                Jauge moyenne : de {{ $nombre($assidus['jauge']['debut']) }} % à {{ $nombre($assidus['jauge']['fin']) }} % pour les {{ $nombre($assidus['jauge']['mesures']) }} assidus mesurés ;
                de {{ $nombre($autres['jauge']['debut']) }} % à {{ $nombre($autres['jauge']['fin']) }} % pour les {{ $nombre($autres['jauge']['mesures']) }} autres.
            </div>
        @else
            <div class="grand">Pas encore assez de mesures pour comparer les élèves assidus et les autres sur cette période.</div>
            <div class="petit">Il faut au moins {{ $methode['seuil'] }} élèves par groupe, avec deux relevés de jauge chacun. Les relevés sont hebdomadaires.</div>
        @endif
    </div>

    <table class="groupes">
        <tr>
            @foreach ([['Élèves assidus', $assidus, true], ['Autres élèves', $autres, false]] as [$titre, $groupe, $mis])
                <td class="colonne">
                    <div class="carte {{ $mis ? 'marque-g' : '' }}">
                        <h2><span class="pastille" style="background: {{ $mis ? '#f6641b' : '#8a7f72' }};"></span>{{ $titre }}</h2>
                        <div class="chiffre">{{ $nombre($groupe['eleves']) }} <span class="unite">élèves</span></div>
                        <table class="ligne" style="margin-top: 8px;">
                            <tr><td>Jauge au début</td><td class="v">{{ $groupe['jauge']['debut'] === null ? '—' : $nombre($groupe['jauge']['debut']).' %' }}</td></tr>
                            <tr><td>Jauge à la fin</td><td class="v">{{ $groupe['jauge']['fin'] === null ? '—' : $nombre($groupe['jauge']['fin']).' %' }}</td></tr>
                            <tr><td>Évolution</td><td class="v">{{ $groupe['jauge']['ecart'] === null ? '—' : $signe($groupe['jauge']['ecart']).' pts' }}</td></tr>
                            <tr><td>Élèves en progrès</td><td class="v">{{ $groupe['jauge']['en_progres'] === null ? '—' : $groupe['jauge']['en_progres'].' %' }}</td></tr>
                            <tr><td>Examens blancs (sur 20)</td><td class="v">
                                @if ($groupe['examens_blancs']['ecart'] === null)
                                    —
                                @else
                                    de {{ $nombre($groupe['examens_blancs']['debut']) }} à {{ $nombre($groupe['examens_blancs']['fin']) }} ({{ $signe($groupe['examens_blancs']['ecart']) }})
                                @endif
                            </td></tr>
                        </table>
                        @if ($groupe['jauge']['ecart'] === null)
                            <p class="vide" style="margin: 6px 0 0;">{{ $nombre($groupe['jauge']['mesures']) }} élève(s) mesuré(s) : en dessous du seuil de {{ $methode['seuil'] }}.</p>
                        @endif
                    </div>
                </td>
            @endforeach
        </tr>
    </table>

    <div class="section">
        <h2>Jauge moyenne, semaine par semaine</h2>
        <p class="legende">
            <span><span class="pastille" style="background: #f6641b;"></span>élèves assidus</span>
            <span><span class="pastille" style="background: #8a7f72;"></span>autres élèves (pointillés)</span>
        </p>
        <img src="{{ $courbe }}" style="width: 100%;" alt="">
    </div>

    <div class="section methode">
        <h2>Méthode</h2>
        <ul>
            <li><strong>Élève assidu</strong> : au moins {{ $methode['seances_par_semaine'] }} séances terminées par semaine, pendant au moins {{ $methode['semaines_minimum'] }} des {{ $impact['filtres']['semaines'] }} semaines (séances du jour et devoirs ; les quiz de culture générale ne comptent pas).</li>
            <li><strong>Jauge de préparation</strong> : la maîtrise des notions du programme de l’examen, pondérée par les coefficients quand ils sont saisis. Elle est relevée chaque semaine ; l’évolution compare le premier et le dernier relevé de chaque élève qui en a au moins deux sur la période.</li>
            <li><strong>Examens blancs</strong> : premier et dernier examen blanc terminé sur la période, pour les élèves qui en ont passé au moins deux.</li>
            <li><strong>Lecture</strong> : la comparaison montre une association, pas une cause — un élève assidu est peut-être déjà plus motivé. Le résultat à l’examen national reste la mesure qui compte.</li>
            @if ($impact['releves']['premiere_semaine'])
                <li>Relevés de jauge disponibles depuis la semaine du {{ $date((string) $impact['releves']['premiere_semaine']) }} ({{ $impact['releves']['semaines_relevees'] }} semaine(s) relevée(s) sur la période).</li>
            @else
                <li>Aucun relevé de jauge encore : le premier a lieu le dimanche soir qui suit la mise en ligne.</li>
            @endif
        </ul>
    </div>
</body>
</html>
