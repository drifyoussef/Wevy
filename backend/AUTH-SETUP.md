# Wevy Backend - JWT Authentication

Backend refactoré pour utiliser JWT + bcrypt au lieu de Firebase.

## Changements

- ✅ Authentification JWT (jsonwebtoken)
- ✅ Hash de mot de passe avec bcryptjs
- ✅ Routes /login et /register fonctionnelles
- ✅ MongoDB uniquement (pas de Firebase)

## Installation

```bash
cd backend
npm install
```

Les nouvelles dépendances :
- `jsonwebtoken` - Génération et vérification de tokens JWT
- `bcryptjs` - Hash sécurisé des mots de passe

## Variables d'environnement

Le fichier `.env` contient maintenant :
- `JWT_SECRET` - Clé secrète pour signer les tokens (changez en production!)

## Flux d'authentification

1. **Register** : `POST /api/auth/register`
   - Hash le mot de passe avec bcrypt
   - Crée l'utilisateur dans MongoDB
   - Retourne user + token JWT (expire après 30 jours)

2. **Login** : `POST /api/auth/login`
   - Vérifie email + mot de passe
   - Retourne user + token JWT

3. **Requêtes authentifiées**
   - Header: `Authorization: Bearer <token>`
   - Le middleware vérifie le token JWT
   - Attache `req.user` avec userId et email

## Lancer le backend

```bash
npm run dev
```

Le backend démarre sur `http://localhost:3000`
