# Wevy - Setup Guide

## 🏗️ Architecture

- **Frontend**: Ionic 7 + Angular 17 + Capacitor 5
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Authentication**: Firebase Auth
- **Mobile**: Capacitor pour iOS/Android

## 📋 Prérequis

1. Node.js 18+ et npm
2. Compte MongoDB Atlas (gratuit)
3. Compte Firebase (gratuit)
4. VS Code recommandé

## 🚀 Installation

### 1. Backend

```bash
cd backend
npm install
```

**Configuration:**
- Votre MongoDB est déjà configuré dans `backend/.env`
- Pour Firebase Admin (optionnel), téléchargez le service account depuis Firebase Console
- Placez le fichier dans `backend/src/config/firebase-adminsdk.json`

### 2. Frontend

```bash
# Depuis la racine du projet
npm install
```

**Configuration Firebase:**
1. Créez un projet sur [Firebase Console](https://console.firebase.google.com)
2. Activez "Authentication" > "Email/Password"
3. Copiez vos credentials dans `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  firebase: {
    apiKey: 'VOTRE_API_KEY',
    authDomain: 'votre-projet.firebaseapp.com',
    projectId: 'votre-projet-id',
    storageBucket: 'votre-projet.appspot.com',
    messagingSenderId: 'VOTRE_SENDER_ID',
    appId: 'VOTRE_APP_ID'
  }
};
```

## 🏃 Lancer l'application

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
Le backend démarre sur `http://localhost:3000`

### Terminal 2 - Frontend
```bash
npm start
```
Le frontend démarre sur `http://localhost:8100`

## 📱 Test sur mobile

### Android/iOS
```bash
# Build web assets
npm run build

# Sync avec Capacitor
npx cap sync

# Ouvrir dans Android Studio
npx cap open android

# Ouvrir dans Xcode
npx cap open ios
```

## 🗄️ Base de données MongoDB

Votre base de données est déjà configurée avec MongoDB Atlas. Les collections sont :

- **users** - Profils utilisateurs
- **households** - Foyers/groupes
- **recipes** - Recettes
- **swipe_sessions** - Sessions de swipe quotidiennes
- **shopping_lists** - Listes de courses

Les index sont créés automatiquement au premier lancement du backend.

## 🔑 Authentification

Le projet utilise **Firebase Authentication** côté frontend avec synchronisation backend :

1. L'utilisateur se connecte via Firebase (frontend)
2. Firebase génère un ID token
3. Chaque requête API envoie ce token
4. Le backend vérifie le token et autorise l'accès

**Mode développement**: L'auth peut être désactivée dans le backend pour faciliter les tests.

## 🛠️ Développement

### Structure du backend
```
backend/
├── src/
│   ├── config/          # Configuration DB & Firebase
│   ├── middleware/      # Auth middleware
│   ├── routes/          # Routes API
│   └── server.js        # Point d'entrée
├── .env                 # Variables d'environnement
└── package.json
```

### Structure du frontend
```
src/app/
├── models/             # Interfaces TypeScript
├── services/
│   ├── api.service.ts  # Client HTTP générique
│   ├── auth.service.ts # Authentification
│   └── *.service.ts    # Services métier
└── pages/              # Pages Ionic
```

## 🧪 Tester l'API

```bash
# Health check
curl http://localhost:3000/health

# Créer un household (en mode dev sans auth)
curl -X POST http://localhost:3000/api/households \
  -H "Content-Type: application/json" \
  -d '{"name": "Ma Famille"}'
```

## 📝 Prochaines étapes

1. ✅ Backend Node.js + Express configuré
2. ✅ MongoDB Atlas connecté
3. ✅ Routes API créées
4. ✅ Frontend Auth avec Firebase
5. 🔄 Implémenter les autres services Angular
6. 🔄 Gérer l'upload d'images (recettes)
7. 🔄 Notifications push Firebase FCM
8. 🔄 Tests et déploiement

## 🐛 Troubleshooting

**Backend ne démarre pas:**
- Vérifiez que MongoDB Atlas autorise votre IP
- Vérifiez les credentials dans `.env`

**Frontend - Erreur Firebase:**
- Vérifiez la configuration dans `environment.ts`
- Assurez-vous que Email/Password est activé dans Firebase Console

**API 401 Unauthorized:**
- En dev, vérifiez que `NODE_ENV=development` dans `.env`
- Sinon, vérifiez que le token Firebase est bien envoyé

## 🤝 Contribution

Pour contribuer, créez une branche depuis `main` et soumettez une Pull Request.

## 📄 Licence

MIT
