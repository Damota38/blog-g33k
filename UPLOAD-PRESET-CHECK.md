# 🔧 Vérification Upload Preset Cloudinary

## 🚨 URGENT : Créer l'Upload Preset

Le problème vient probablement du fait que l'upload preset `blog-g33k-uploads` n'existe pas encore sur votre compte Cloudinary.

### 📋 Étapes OBLIGATOIRES

#### 1. Allez sur Cloudinary Dashboard
- Ouvrez : https://cloudinary.com/console
- Connectez-vous avec votre compte

#### 2. Créer l'Upload Preset
1. Cliquez sur **Settings** ⚙️ (en haut à droite)
2. Cliquez sur **Upload** dans le menu de gauche
3. Cliquez sur **Add upload preset** (bouton bleu)

#### 3. Configuration EXACTE de l'Upload Preset

**Onglet "Settings":**
```
Preset name: blog-g33k-uploads
Signing mode: Unsigned ✅ (TRÈS IMPORTANT!)
Use filename: No
Unique filename: Yes
Overwrite: No
```

**Onglet "Upload Control":**
```
Resource type: Auto
Access mode: Public
Allowed formats: jpg,jpeg,png,gif,webp,mp4,webm,mov,avi
Max file size: 10000000 (10MB)
Max video file size: 50000000 (50MB)
```

**Onglet "Media Analysis":**
```
Quality analysis: On (optionnel)
Google AI Vision: Off
AWS Rekognition: Off
```

#### 4. Sauvegarder
- Cliquez sur **Save** en bas de la page
- Vous devriez voir `blog-g33k-uploads` dans la liste des presets

### 🧪 Test Rapide

1. **Retournez sur votre blog**
2. **Ouvrez la console** (F12)
3. **Tapez :** `testCloudinary()`
4. **Sélectionnez une petite image** (< 1MB)
5. **Si ça marche :** Vous verrez "Test réussi !" ✅

### ❌ Si l'Upload Preset n'existe toujours pas

**Erreur typique :**
```
Upload preset 'blog-g33k-uploads' not found
```

**Solutions :**

#### Option 1: Créer avec un autre nom
Si vous avez créé le preset avec un nom différent :

1. Allez voir dans **Settings > Upload**
2. Notez le nom exact du preset
3. Modifiez le fichier `cloudinary-config.js` :
```javascript
const cloudinaryConfig = {
    cloudName: 'dzfigb7bb',
    apiKey: '624281159944536',
    uploadPreset: 'VOTRE-NOM-EXACT-DU-PRESET' // ⬅️ Changez ici
};
```

#### Option 2: Utiliser un preset par défaut
Certains comptes Cloudinary ont un preset par défaut. Essayez :
```javascript
uploadPreset: 'ml_default'
```

### 🔍 Vérifier que le Preset Fonctionne

Testez directement avec cette URL dans votre navigateur :
```
https://api.cloudinary.com/v1_1/dzfigb7bb/image/upload?upload_preset=blog-g33k-uploads
```

- **Si ça affiche une page d'erreur** → Le preset n'existe pas
- **Si ça affiche un formulaire d'upload** → Le preset fonctionne ✅

### 📞 Solution d'Urgence

Si vous n'arrivez pas à créer le preset :

1. Utilisez ce preset temporaire dans `cloudinary-config.js` :
```javascript
const cloudinaryConfig = {
    cloudName: 'dzfigb7bb',
    apiKey: '624281159944536',
    uploadPreset: 'ml_default' // Preset par défaut Cloudinary
};
```

2. Testez avec `testCloudinary()` dans la console

---

## ✅ Une fois l'Upload Preset créé

Votre blog devrait fonctionner parfaitement :
- ✅ Bouton "Ajouter médias" ouvre le widget
- ✅ Sélection d'image fonctionne
- ✅ Upload vers Cloudinary réussit
- ✅ Image apparaît dans la prévisualisation
- ✅ Article se publie avec l'image

**Faites ça en premier et testez !** 🚀