// Script de diagnostic pour identifier les problèmes
console.log('🔍 DIAGNOSTIC BLOG G33K');

// Vérifier les dépendances
window.addEventListener('load', function() {
    console.log('📄 Page chargée, vérification des dépendances...');
    
    // Vérifier Firebase
    if (typeof firebase !== 'undefined') {
        console.log('✅ Firebase chargé');
    } else {
        console.error('❌ Firebase NON chargé');
    }
    
    // Vérifier Cloudinary
    if (typeof cloudinary !== 'undefined') {
        console.log('✅ Cloudinary chargé');
        console.log('📦 Version Cloudinary:', cloudinary.version || 'version inconnue');
    } else {
        console.error('❌ Cloudinary NON chargé');
    }
    
    // Vérifier la configuration
    if (typeof cloudinaryConfig !== 'undefined') {
        console.log('✅ Configuration Cloudinary trouvée');
        console.log('🏷️ Cloud Name:', cloudinaryConfig.cloudName);
        console.log('🔑 API Key:', cloudinaryConfig.apiKey ? 'Présent' : 'Manquant');
        console.log('📋 Upload Preset:', cloudinaryConfig.uploadPreset);
    } else {
        console.error('❌ Configuration Cloudinary manquante');
    }
    
    // Vérifier les boutons
    const addMediaBtn = document.getElementById('addMediaBtn');
    const addAudioBtn = document.getElementById('addAudioBtn');
    
    if (addMediaBtn) {
        console.log('✅ Bouton "Ajouter médias" trouvé');
        // Test du clic
        addMediaBtn.addEventListener('click', function() {
            console.log('👆 Clic sur "Ajouter médias" détecté');
        });
    } else {
        console.error('❌ Bouton "Ajouter médias" NON trouvé');
    }
    
    if (addAudioBtn) {
        console.log('✅ Bouton "Enregistrer audio" trouvé');
        // Test du clic
        addAudioBtn.addEventListener('click', function() {
            console.log('👆 Clic sur "Enregistrer audio" détecté');
        });
    } else {
        console.error('❌ Bouton "Enregistrer audio" NON trouvé');
    }
    
    // Tester l'API MediaDevices pour l'audio
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('✅ API MediaDevices disponible pour audio');
    } else {
        console.error('❌ API MediaDevices NON disponible (HTTPS requis)');
    }
    
    console.log('🏁 Diagnostic terminé');
});

// Intercepter toutes les erreurs JavaScript
window.addEventListener('error', function(e) {
    console.error('💥 Erreur JavaScript:', e.error);
    console.error('📍 Fichier:', e.filename, 'Ligne:', e.lineno);
});

// Fonction de test manuel
window.testCloudinary = function() {
    console.log('🧪 Test manuel Cloudinary...');
    
    if (typeof cloudinary === 'undefined') {
        console.error('❌ Cloudinary non disponible');
        return;
    }
    
    try {
        const testWidget = cloudinary.createUploadWidget({
            cloudName: 'dzfigb7bb',
            uploadPreset: 'blog-g33k-uploads',
            sources: ['local'],
            multiple: false,
            maxFileSize: 10000000,
            resourceType: 'auto'
        }, (error, result) => {
            if (error) {
                console.error('❌ Erreur widget:', error);
                return;
            }
            
            if (result && result.event === 'success') {
                console.log('✅ Upload réussi:', result.info);
                alert('Test réussi ! Fichier uploadé: ' + result.info.secure_url);
            }
            
            console.log('📤 Événement widget:', result.event);
        });
        
        testWidget.open();
        console.log('✅ Widget de test ouvert');
        
    } catch (error) {
        console.error('❌ Erreur création widget test:', error);
    }
};

console.log('💡 Pour tester manuellement: tapez "testCloudinary()" dans la console');