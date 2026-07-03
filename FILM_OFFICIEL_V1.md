# Film Officiel V1

Teaser officiel Tahiti Trip Fishing.

Durée cible : 55 secondes.

MP4 cible : `public/media/films/tahiti-trip-official.mp4`

Statut export : MP4 non généré dans cet environnement, car `ffmpeg` / `ffprobe` ne sont pas disponibles.

## Intention

Style cinématique, transitions douces, fondus simples, aucun effet tape-à-l'oeil.

Rythme progressif : ouverture calme, montée avec la pêche, respiration émotionnelle avec les baleines et Tetiaroa, conclusion drone.

Musique : ne pas intégrer de musique. Prévoir une piste audio vide/silencieuse.

Textes autorisés :

- Début : `TAHITI TRIP FISHING`
- Fin : `Vivez l'océan autrement`

## Timeline de montage

| # | Timecode | Séquence | Fichier recommandé | Dossier | Entrée | Sortie | Durée | Transition | Commentaire montage |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 00:00 -> 00:04 | Drone / départ bateau | DJI_0156.MP4 | public/media/peche/drone | 00:00 | 00:04 | 4 s | Fondu depuis noir 12 images | Ouvrir large et cinématique. Ajouter le texte `TAHITI TRIP FISHING` centré, blanc, discret, de 00:00 à 00:03. |
| 2 | 00:04 -> 00:09 | Navigation | hero.mp4 | public/media/peche/hero | 00:00 | 00:05 | 5 s | Fondu enchaîné 12 images | Plan fluide du bateau, conserver le mouvement naturel. Pas de texte. |
| 3 | 00:09 -> 00:13 | Préparation pêche | film haura fred.MP4 | public/media/commun/videos | 00:00 | 00:04 | 4 s | Fondu enchaîné 10 images | Choisir un passage de préparation ou d'ambiance pêche. Si le clip montre surtout la prise, garder un plan de mains, cannes ou pont. |
| 4 | 00:13 -> 00:19 | Combat | Gros.mp4 | public/media/peche/videos | 00:00 | 00:06 | 6 s | Fondu court 8 images | Accélérer légèrement le rythme. Couper sur l'effort et la tension, sans effet agressif. |
| 5 | 00:19 -> 00:24 | Capture | marlin-pont.jpg | public/media/peche/captures | image fixe | image fixe | 5 s | Fondu enchaîné 12 images | Léger zoom avant 100 % -> 108 %. Mettre en valeur le marlin comme moment fort. |
| 6 | 00:24 -> 00:28 | Sourires / clients | depart.jpg | public/media/baleines/hero | image fixe | image fixe | 4 s | Fondu enchaîné 12 images | Plan humain et chaleureux. À remplacer plus tard par une vraie photo clients dédiée si ajoutée à la médiathèque. |
| 7 | 00:28 -> 00:36 | Baleines | nage.mp4 | public/media/baleines/videos | 00:00 | 00:08 | 8 s | Fondu doux 16 images | Ralentir légèrement si nécessaire. Laisser respirer l'image sous l'eau, ambiance émotionnelle. |
| 8 | 00:36 -> 00:42 | Tetiaroa | tetia 1.jpeg | public/media/tetiaroa/plage | image fixe | image fixe | 6 s | Fondu enchaîné 14 images | Léger panoramique ou zoom lent. Donner une sensation de destination et d'évasion. |
| 9 | 00:42 -> 00:52 | Drone de conclusion | DJI_0156.MP4 | public/media/peche/drone | 00:04 | 00:14 | 10 s | Fondu enchaîné 16 images | Reprendre un plan drone plus ample pour conclure. Garder une trajectoire stable et premium. |
| 10 | 00:52 -> 00:55 | Logo Tahiti Trip Fishing | cover.jpg | public/media/films | image fixe | image fixe | 3 s | Fondu vers noir 18 images | Fond image avec texte final `Vivez l'océan autrement`. Aucun fichier logo dédié n'existe actuellement dans `public/media`. |

## Pistes

| Piste | Contenu | Notes |
|---|---|---|
| V1 | Vidéos et photos principales | Recadrage plein écran 16:9, fondus doux uniquement. |
| V2 | Textes | `TAHITI TRIP FISHING` au début, `Vivez l'océan autrement` à la fin. |
| A1 | Silence | Piste vide/silencieuse. Ne pas intégrer de musique dans cette V1. |

## Réglages d'export

| Paramètre | Valeur |
|---|---|
| Format | MP4 |
| Codec vidéo | H.264 |
| Ratio | 16:9 |
| Résolution | 1920 x 1080 |
| Images par seconde | 25 fps |
| Audio | AAC silencieux ou piste audio désactivée |
| Nom de sortie | tahiti-trip-official.mp4 |
| Emplacement | public/media/films/tahiti-trip-official.mp4 |

## Notes pour l'étalonnage

- Harmoniser les plans pêche, baleines et Tetiaroa avec un rendu lumineux, naturel et premium.
- Éviter les contrastes trop durs.
- Garder les bleus de l'océan propres et les blancs du bateau non brûlés.
- Stabiliser uniquement si nécessaire.

## Médias utilisés

| Usage | Fichier | Dossier |
|---|---|---|
| Drone ouverture / conclusion | DJI_0156.MP4 | public/media/peche/drone |
| Navigation | hero.mp4 | public/media/peche/hero |
| Préparation pêche | film haura fred.MP4 | public/media/commun/videos |
| Combat | Gros.mp4 | public/media/peche/videos |
| Capture | marlin-pont.jpg | public/media/peche/captures |
| Sourires / clients | depart.jpg | public/media/baleines/hero |
| Baleines | nage.mp4 | public/media/baleines/videos |
| Tetiaroa | tetia 1.jpeg | public/media/tetiaroa/plage |
| Fond final | cover.jpg | public/media/films |
