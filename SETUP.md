# Blog G33K - Configuration et Utilisation

## 🚀 Nouvelles Fonctionnalités Implémentées

### 1. Système de Recherche et Filtres
- **Barre de recherche** : Recherche dans le titre, contenu et auteur des articles
- **Filtres de tri** : Plus récents, plus anciens, plus aimés, plus commentés
- **Filtre par auteur** : Affichage des articles par auteur spécifique
- **Recherche en temps réel** avec debounce (300ms)

### 2. Upload d'Images et Vidéos avec Cloudinary
- **Support multi-formats** : JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI
- **Optimisation automatique** avec transformations Cloudinary
- **Upload dans articles et commentaires**
- **Prévisualisation avant publication**

### 3. Enregistrement Audio
- **Enregistrement direct** depuis le navigateur
- **Format WebM** avec fallback OGG
- **Timer temps réel** pendant l'enregistrement
- **Upload automatique** vers Cloudinary
- **Lecteur audio intégré**

## 🛠️ Configuration Requise

### 1. Configuration Cloudinary

#### Étape 1 : Créer un compte Cloudinary
1. Allez sur [cloudinary.com](https://cloudinary.com)
2. Créez un compte gratuit
3. Notez vos identifiants depuis le Dashboard

#### Étape 2 : Créer un Upload Preset
1. Dans votre Dashboard Cloudinary, allez dans **Settings** > **Upload**
2. Cliquez sur **Add upload preset**
3. Configurez :
   - **Preset name** : `blog-g33k-uploads` (ou votre choix)
   - **Signing Mode** : **Unsigned**
   - **Folder** : `blog-uploads` (optionnel)
   - **Resource Type** : **Auto**
   - **Access Mode** : **Public**

#### Étape 3 : Configurer les identifiants
Éditez le fichier `public/cloudinary-config.js` :

```javascript
const cloudinaryConfig = {
    cloudName: 'votre-cloud-name',           // Remplacez par votre Cloud Name
    apiKey: 'votre-api-key',                 // Remplacez par votre API Key
    apiSecret: 'votre-api-secret',           // Remplacez par votre API Secret
    uploadPreset: 'blog-g33k-uploads'        // Remplacez par votre Upload Preset
};
```

### 2. Structure des Fichiers

```
blog-g33k/
├── public/
│   ├── index.html                    # Page principale
│   ├── script.js                     # Logique principale
│   ├── style.css                     # Styles CSS
│   ├── config.js                     # Configuration Firebase
│   └── cloudinary-config.js          # Configuration Cloudinary
├── firebase.json                     # Configuration Firebase Hosting
└── SETUP.md                         # Ce fichier
```

## 🎯 Comment Utiliser

### Système de Recherche
1. **Recherche simple** : Tapez dans la barre de recherche
2. **Filtres** : Utilisez les menus déroulants pour trier et filtrer
3. **Reset** : Cliquez sur le ✕ pour effacer la recherche

### Upload de Médias dans les Articles
1. Cliquez sur **✍️ Nouvel Article** (admin uniquement)
2. Remplissez titre et contenu
3. Cliquez sur **📎 Ajouter des médias** pour images/vidéos
4. Ou cliquez sur **🎤 Enregistrer audio** pour l'audio
5. Prévisualisez vos médias
6. Publiez l'article

### Upload de Médias dans les Commentaires
1. Ouvrez la section commentaires d'un article
2. Écrivez votre commentaire
3. Cliquez sur **📎 Ajouter média** pour images/vidéos
4. Ou cliquez sur **🎤 Enregistrer audio** pour l'audio
5. Publiez le commentaire

### Enregistrement Audio
1. Cliquez sur **🎤 Enregistrer audio**
2. Autorisez l'accès au microphone
3. Cliquez sur le bouton rouge pour commencer
4. Cliquez sur ⏹️ pour arrêter
5. L'audio sera automatiquement uploadé

## 📱 Compatibilité

### Navigateurs Supportés
- **Chrome** 60+ ✅
- **Firefox** 55+ ✅
- **Safari** 11+ ✅
- **Edge** 79+ ✅

### Fonctionnalités par Navigateur
| Fonction | Chrome | Firefox | Safari | Edge |
|----------|--------|---------|--------|------|
| Recherche | ✅ | ✅ | ✅ | ✅ |
| Upload Images/Vidéos | ✅ | ✅ | ✅ | ✅ |
| Enregistrement Audio | ✅ | ✅ | ✅ | ✅ |

## 🔒 Sécurité

### Permissions Requises
- **Microphone** : Pour l'enregistrement audio
- **Caméra** : Pour les photos via Cloudinary (optionnel)

### Limites de Sécurité
- Upload limité à 10MB pour les images
- Upload limité à 50MB pour les vidéos
- Formats autorisés : JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI
- Upload Preset Cloudinary en mode "Unsigned" pour la sécurité

## 🐛 Résolution de Problèmes

### Problèmes Courants

#### 1. "Widget d'upload non disponible"
- Vérifiez que Cloudinary SDK est chargé
- Vérifiez la configuration dans `cloudinary-config.js`
- Vérifiez votre Upload Preset

#### 2. "Impossible d'accéder au microphone"
- Autorisez l'accès microphone dans votre navigateur
- Vérifiez que vous êtes en HTTPS (requis pour l'audio)
- Testez sur `localhost` ou domaine sécurisé

#### 3. Erreur d'upload Cloudinary
- Vérifiez vos identifiants Cloudinary
- Vérifiez que l'Upload Preset existe et est "Unsigned"
- Vérifiez la taille du fichier (limites dépassées)

#### 4. Audio ne se lit pas
- Vérifiez le format (WebM supporté)
- Testez avec différents navigateurs
- Vérifiez que Cloudinary a bien traité le fichier

### Logs de Débogage
Ouvrez la Console développeur (F12) pour voir les messages d'erreur détaillés.

## 📊 Performances

### Optimisations Cloudinary
- **Images** : Compression automatique, format WebP quand supporté
- **Vidéos** : Compression automatique, format MP4 optimisé
- **Audio** : Format WebM avec fallback OGG

### Recommandations
- Utilisez des images < 2MB pour de meilleures performances
- Les vidéos > 10MB peuvent prendre du temps à charger
- L'audio est automatiquement optimisé

## 🚀 Déploiement

### Firebase Hosting
```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter
firebase login

# Déployer
firebase deploy
```

### Configuration Domaine
Pour l'enregistrement audio en production, assurez-vous que votre site utilise HTTPS.

## 📝 Structure de Données

### Articles avec Médias
```javascript
{
  title: "Titre de l'article",
  content: "Contenu...",
  mediaFiles: [
    {
      publicId: "blog-uploads/xyz123",
      secureUrl: "https://res.cloudinary.com/...",
      resourceType: "image", // ou "video"
      format: "jpg",
      bytes: 150000,
      isAudio: false // true pour les fichiers audio
    }
  ]
}
```

### Commentaires avec Médias
```javascript
{
  content: "Mon commentaire",
  articleId: "article-id",
  userId: "user-id",
  mediaFiles: [/* structure identique aux articles */]
}
```

## 🤝 Support

Pour toute question ou problème :
1. Vérifiez ce guide de configuration
2. Consultez les logs dans la console développeur
3. Vérifiez les configurations Cloudinary et Firebase

Bon développement ! 🎉