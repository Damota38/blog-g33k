// Configuration Cloudinary
// Remplacez ces valeurs par vos propres identifiants Cloudinary

const cloudinaryConfig = {
    cloudName: 'dzfigb7bb',
    apiKey: '624281159944536',
    // API Secret supprimé pour la sécurité (ne jamais l'exposer côté client)
    uploadPreset: 'blog-g33k-uploads'
};

// Initialisation du widget Cloudinary
function initCloudinaryWidget() {
    if (typeof cloudinary === 'undefined') {
        console.error('Cloudinary SDK not loaded');
        return null;
    }
    
    return cloudinary.createUploadWidget({
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        sources: ['local', 'url', 'camera'],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 10000000, // 10MB
        resourceType: 'auto',  // Détecte automatiquement image/vidéo
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi'],
        maxVideoFileSize: 50000000, // 50MB pour les vidéos
        cropping: true,
        croppingAspectRatio: null,
        showSkipCropButton: true,
        styles: {
            palette: {
                window: "#FFFFFF",
                windowBorder: "#90A0B3",
                tabIcon: "#a100b6",
                menuIcons: "#5A616A",
                textDark: "#000000",
                textLight: "#FFFFFF",
                link: "#a100b6",
                action: "#a100b6",
                inactiveTabIcon: "#0E2F5A",
                error: "#F44336",
                inProgress: "#0078FF",
                complete: "#20B832",
                sourceBg: "#E4EBF1"
            }
        },
        text: {
            fr: {
                "or": "ou",
                "back": "Retour",
                "close": "Fermer",
                "crop": "Recadrer",
                "done": "Terminé",
                "image": "Image",
                "video": "Vidéo",
                "local": "Fichier local",
                "url": "URL",
                "camera": "Caméra",
                "uploading": "Upload en cours...",
                "upload_complete": "Upload terminé !",
                "upload_failed": "Échec de l'upload",
                "retry": "Réessayer"
            }
        }
    });
}

// Configuration des transformations d'images par défaut
const defaultImageTransformations = {
    article: "w_800,h_450,c_fill,q_auto,f_auto",
    comment: "w_400,h_300,c_fill,q_auto,f_auto",
    thumbnail: "w_200,h_150,c_fill,q_auto,f_auto"
};

// Configuration des transformations de vidéos par défaut
const defaultVideoTransformations = {
    article: "w_800,h_450,c_fill,q_auto:good,f_auto",
    comment: "w_400,h_300,c_fill,q_auto:good,f_auto"
};

// Fonction utilitaire pour générer l'URL optimisée
function getOptimizedUrl(publicId, resourceType = 'image', transformationType = 'article') {
    const transformations = resourceType === 'video' 
        ? defaultVideoTransformations[transformationType] 
        : defaultImageTransformations[transformationType];
    
    return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/${resourceType}/upload/${transformations}/${publicId}`;
}

// Fonction pour uploader directement avec l'API Cloudinary
async function uploadToCloudinary(file, folder = 'blog-uploads') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('folder', folder);
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        const data = await response.json();
        
        if (response.ok) {
            return {
                success: true,
                publicId: data.public_id,
                secureUrl: data.secure_url,
                resourceType: data.resource_type,
                format: data.format,
                bytes: data.bytes,
                width: data.width,
                height: data.height,
                duration: data.duration || null
            };
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Erreur upload Cloudinary:', error);
        return {
            success: false,
            error: error.message
        };
    }
}