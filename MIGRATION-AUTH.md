# Migration de Firebase/Supabase vers MongoDB + JWT

## ✅ Changements effectués

### Frontend
- ✅ AuthService refactoré pour utiliser l'API backend uniquement
- ✅ Utilisation de localStorage pour stocker le token JWT
- ✅ Suppression de toutes les références à Firebase Auth
- ✅ FormsModule ajouté pour corriger les erreurs d'input
- ✅ Environment simplifié (plus de config Firebase)

### Backend  
- ✅ Routes `/api/auth/register` et `/api/auth/login` créées
- ✅ Authentification JWT avec jsonwebtoken
- ✅ Hash des mots de passe avec bcryptjs
- ✅ Middleware auth mis à jour pour vérifier les tokens JWT

## 📋 Étapes à suivre

### 1. Installer les dépendances du backend

```bash
cd backend
npm install
```

Cela va installer :
- `jsonwebtoken` - Pour les tokens JWT
- `bcryptjs` - Pour hasher les mots de passe

### 2. Lancer le backend

```bash
cd backend
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### 3. Lancer le frontend

Dans un nouveau terminal :

```bash
npm start
```

L'app démarre sur `http://localhost:8100`

### 4. Tester l'inscription

1. Allez sur la page Welcome
2. Cliquez sur "Commencer"  
3. Remplissez le formulaire d'inscription
4. Soumettez

Le backend va :
- Vérifier que l'email n'existe pas déjà
- Hasher le mot de passe avec bcrypt
- Créer l'utilisateur dans MongoDB
- Retourner un token JWT valide 30 jours

### 5. Tester la connexion

Les tokens sont stockés dans `localStorage` donc vous restez connecté même après un refresh.

## 🔧 Nettoyage optionnel

Si vous voulez retirer complètement Firebase et Supabase du projet :

```bash
npm uninstall firebase @supabase/supabase-js
```

Mais ce n'est pas urgent, ça ne cause pas de problème.

## ⚠️ Important pour la production

Dans `.env` du backend, changez :
```
JWT_SECRET=votre_vraie_clé_secrète_très_longue_et_aléatoire
```

Utilisez une vraie clé secrète longue et aléatoire !

## 🐛 Troubleshooting

**Erreur "Email already in use"** :
- Cet email existe déjà dans la DB, utilisez-en un autre

**Erreur "Invalid email or password"** :
- Vérifiez vos credentials

**token expired** :
- Le token est expiré, reconnectez-vous

**No token provided** en dev :
- Le middleware autorise les requêtes sans token en mode dev pour faciliter les tests
