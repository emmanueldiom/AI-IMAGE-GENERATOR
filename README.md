# AI Image Generator

Application web qui transforme une description en images, en s'appuyant sur [Stable Horde](https://stablehorde.net), un réseau communautaire et gratuit de génération d'images.

Démo : https://ai-image-generator-9679.onrender.com
(hébergée sur l'offre gratuite de Render : le premier chargement peut prendre jusqu'à une minute)

## Fonctionnalités

- Saisie d'une description, avec suggestion aléatoire parmi des exemples
- Choix du modèle : **Automatique** (Stable Horde choisit un modèle disponible, souvent le plus rapide) ou **Deliberate**
- Choix du format : carré (512 × 512), paysage (640 × 384) ou portrait (384 × 640)
- Génération de 1 à 4 images, lancées l'une après l'autre
- Une carte de chargement par image, remplacée par l'image ou par un message d'erreur clair
- Téléchargement de chaque image (format WebP)
- Thème clair ou sombre, mémorisé dans le navigateur

## Architecture

```
Navigateur (public/ : HTML, CSS, JavaScript)
   │  POST /generate { prompt, ratio, model }
   ▼
Serveur Node.js + Express (server.js)
   │  1. soumet la tâche      POST /api/v2/generate/async
   │  2. vérifie toutes les 5 s   GET /api/v2/generate/check/:id   (3 min maximum)
   │  3. récupère l'image     GET /api/v2/generate/status/:id
   ▼
Stable Horde
```

Le serveur :

- garde la clé Stable Horde côté serveur (le navigateur n'appelle que `/generate`) ;
- valide les entrées (description de 500 caractères maximum, format et modèle limités à une liste connue) ;
- convertit l'image reçue en base64 en binaire et la renvoie directement avec son type MIME ;
- renvoie des messages d'erreur explicites : file d'attente trop longue, modèle indisponible, trop de demandes.

Seul le dossier `public/` est servi au navigateur. Le CORS n'est pas activé, pour que d'autres sites ne puissent pas utiliser le quota du serveur.

## Lancer le projet

Node.js 18 ou plus récent.

```bash
npm install
cp .env.example .env   # facultatif
npm start              # http://localhost:3000
```

### Variables d'environnement

| Variable | Rôle | Par défaut |
| --- | --- | --- |
| `STABLE_HORDE_KEY` | Clé API Stable Horde ([créer une clé gratuite](https://stablehorde.net/register)). Une clé personnelle donne une meilleure priorité dans la file d'attente. | clé anonyme `0000000000` |
| `PORT` | Port du serveur | `3000` |

## Déploiement sur Render

- Build command : `npm install`
- Start command : `npm start`
- Variable d'environnement : `STABLE_HORDE_KEY`

## Limites connues

- Stable Horde est un réseau bénévole : avec la clé anonyme, une image peut prendre de quelques secondes à plusieurs minutes.
- Si la file d'attente dépasse 3 minutes, la génération est abandonnée avec un message d'erreur.

## Pistes d'évolution

- Ajouter un second fournisseur pour prendre le relais quand la file d'attente est saturée
- Afficher la position dans la file d'attente pendant la génération

## Technologies

Node.js, Express 5, JavaScript, HTML, CSS, API Stable Horde, Render.
