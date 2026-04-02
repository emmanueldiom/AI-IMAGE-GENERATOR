# 🎨 AI Image Generator

Une application web complète permettant de générer des images à partir de descriptions textuelles (Text-to-Image) en utilisant plusieurs APIs d’intelligence artificielle avec un système de fallback intelligent.

---

## 🚀 Aperçu du projet

AI Image Generator permet à l’utilisateur de :

- Entrer une description (prompt)
- Générer une ou plusieurs images IA
- Choisir différents modèles
- Télécharger les images générées
- Basculer entre thème clair et sombre

👉 Exemple de prompt :
> "Un dragon dans une grotte en cristal"

---

## 🧠 Fonctionnalités

- ✍️ Saisie de prompt personnalisé
- 🎲 Génération de prompt aléatoire
- 🤖 Sélection de modèles IA
- 🖼️ Génération de plusieurs images
- 📐 Choix du ratio (1:1, 16:9, 9:16)
- 🖼️ Galerie avec chargement dynamique
- ⬇️ Téléchargement d’images
- 🌙 Mode clair / sombre (localStorage)
- 🔄 Système de fallback multi-API

---

## 🏗️ Architecture

Frontend (HTML, CSS, JS)
↓
Backend (Node.js + Express)
↓
APIs IA (Gemini, Pollinations, Stable Horde)



### 🔐 Pourquoi cette architecture ?

- Sécurité des clés API (backend uniquement)
- Contournement des problèmes CORS
- Meilleur contrôle des requêtes

---

## ⚙️ Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript (ES6)
- **Backend** : Node.js, Express
- **APIs IA** :
  - Google Gemini
  - Pollinations AI
  - Stable Horde
- **Configuration** : dotenv

---

## 📂 Structure du projet

ai-image-generator/
│
├── server.js # Backend (API + logique IA)
├── script.js # Frontend (logique JS)
├── index.html # Interface utilisateur
├── style.css # Design et thème
├── .env # Clés API (non versionné)
├── package.json # Dépendances
└── node_modules/



---

## 🔄 Fonctionnement

1. L’utilisateur saisit un prompt
2. Le frontend envoie une requête POST → `/generate`
3. Le backend traite la demande :
   - Essai 1 : Gemini
   - Essai 2 : Pollinations
   - Essai 3 : Stable Horde
4. L’image est renvoyée au frontend
5. Affichage dans la galerie

---

## 🔁 Système de fallback

| API | Rôle |
|-----|------|
| Gemini | Principal |
| Pollinations | Fallback 1 |
| Stable Horde | Fallback final |

👉 Cela garantit que l’application fonctionne même si une API échoue.

---

## ⚡ Stable Horde (Solution finale)

- Gratuit et illimité
- Basé sur un réseau communautaire
- Fonctionne avec un système de polling :

### Étapes :
1. Soumission du job
2. Vérification (polling)
3. Récupération de l’image
4. Conversion base64 → image

---

## ▶️ Installation

### 1. Cloner le projet
```bash
git clone <repo_url>
cd ai-image-generator
