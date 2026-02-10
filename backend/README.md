# Wevy Backend API

Backend Node.js/Express pour l'application Wevy avec MongoDB Atlas.

## 🚀 Installation

```bash
cd backend
npm install
```

## ⚙️ Configuration

1. Copiez `.env.example` vers `.env`
2. Votre MongoDB est déjà configuré dans `.env`
3. (Optionnel) Pour Firebase Auth, ajoutez `config/firebase-adminsdk.json`

## 🏃 Lancer le serveur

### Mode développement (avec auto-reload)
```bash
npm run dev
```

### Mode production
```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` - Créer profil utilisateur
- `GET /api/auth/me` - Récupérer profil
- `PUT /api/auth/profile` - Mettre à jour profil

### Households
- `POST /api/households` - Créer household
- `GET /api/households` - Liste des households
- `GET /api/households/:id` - Détails household
- `POST /api/households/join` - Rejoindre avec code
- `DELETE /api/households/:id/leave` - Quitter household

### Recipes
- `POST /api/recipes` - Créer recette
- `GET /api/recipes/household/:id` - Recettes du household
- `GET /api/recipes/:id` - Détails recette
- `PUT /api/recipes/:id` - Modifier recette
- `DELETE /api/recipes/:id` - Supprimer recette
- `POST /api/recipes/:id/cooked` - Marquer comme cuisiné
- `POST /api/recipes/:id/favorite` - Toggle favori

### Swipe
- `POST /api/swipe/session` - Créer session swipe
- `GET /api/swipe/session/:householdId` - Session active
- `POST /api/swipe/swipe` - Enregistrer swipe
- `GET /api/swipe/history/:householdId` - Historique

### Shopping List
- `GET /api/shopping/:householdId` - Liste de courses active
- `POST /api/shopping/:householdId/add-recipe` - Ajouter recette
- `PUT /api/shopping/:householdId` - Mettre à jour items
- `POST /api/shopping/:householdId/complete` - Compléter la liste
- `DELETE /api/shopping/:householdId/clear` - Vider la liste

## 🔐 Authentification

**Mode développement** : Auth désactivée par défaut
**Mode production** : Requiert Firebase ID token dans header:
```
Authorization: Bearer <firebase-id-token>
```

## 🗄️ Base de données

MongoDB Atlas avec les collections :
- `users` - Profils utilisateurs
- `households` - Foyers/groupes
- `recipes` - Recettes
- `swipe_sessions` - Sessions de swipe
- `shopping_lists` - Listes de courses

Les index sont créés automatiquement au démarrage.

## 🔧 Structure du projet

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Configuration MongoDB
│   │   └── firebase.js      # Configuration Firebase Admin
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── household.routes.js
│   │   ├── recipe.routes.js
│   │   ├── swipe.routes.js
│   │   └── shopping.routes.js
│   └── server.js
├── .env
├── .gitignore
└── package.json
```

## 🧪 Tester l'API

```bash
# Health check
curl http://localhost:3000/health

# Créer un household (dev mode)
curl -X POST http://localhost:3000/api/households \
  -H "Content-Type: application/json" \
  -d '{"name": "Ma Famille"}'
```

## 📝 Notes

- En mode développement, l'auth Firebase est désactivée pour faciliter les tests
- Les credentials MongoDB sont déjà dans `.env`
- Pour la production, ajoutez un reverse proxy (nginx) et HTTPS
