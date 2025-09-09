// Script de test pour YouTube
console.log('🧪 Test YouTube Debug');

// Fonction de test YouTube
window.testYouTube = function(url) {
    console.log('🎬 Test avec URL:', url);
    
    // Test d'extraction d'ID
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    const videoId = match ? match[1] : null;
    
    console.log('🎯 ID extrait:', videoId);
    
    if (!videoId) {
        console.error('❌ Impossible d\'extraire l\'ID');
        return false;
    }
    
    // Test d'URL embed
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    console.log('🔗 URL embed:', embedUrl);
    
    // Créer un iframe de test
    const testContainer = document.createElement('div');
    testContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        height: 200px;
        background: white;
        border: 2px solid #a100b6;
        border-radius: 10px;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    testContainer.innerHTML = `
        <div style="padding: 10px; background: #a100b6; color: white; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span>🧪 Test YouTube</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
        </div>
        <iframe 
            src="${embedUrl}" 
            style="width: calc(100% - 4px); height: calc(100% - 34px); border: none; margin: 2px;"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
    
    document.body.appendChild(testContainer);
    
    console.log('✅ iframe de test créé en haut à droite');
    return true;
};

// Tests automatiques avec des URLs courantes
window.testYouTubeUrls = function() {
    const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=jNQXAC9IVRw&feature=youtu.be',
        'https://youtu.be/jNQXAC9IVRw?t=21'
    ];
    
    console.log('🧪 Test de plusieurs formats YouTube...');
    
    testUrls.forEach((url, index) => {
        console.log(`\n${index + 1}. Test: ${url}`);
        const isValid = testYouTube(url);
        console.log(`   Résultat: ${isValid ? '✅' : '❌'}`);
    });
};

// Fonction pour tester l'intégration dans un article
window.testYouTubeInArticle = function(url) {
    console.log('📝 Test intégration dans article...');
    
    // Simuler les données d'un article
    const fakeArticle = {
        title: 'Test Article',
        content: 'Contenu de test',
        youtubeUrl: url,
        author: 'Test User',
        createdAt: new Date()
    };
    
    // Créer un container de test
    const testArticle = document.createElement('div');
    testArticle.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        max-width: 600px;
        background: white;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 9999;
        overflow: hidden;
    `;
    
    // Extraire l'ID et construire l'HTML
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    const videoId = match ? match[1] : null;
    
    let youtubeHtml = '';
    if (videoId) {
        youtubeHtml = `
            <div class="youtube-container">
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="width: 100%; height: 300px; border: none;">
                </iframe>
            </div>
        `;
    }
    
    testArticle.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #a100b6; color: white; padding: 15px; margin: -20px -20px 20px -20px;">
                <h3 style="margin: 0;">🧪 Test Article avec YouTube</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px;">×</button>
            </div>
            <h2 style="color: #333; margin-bottom: 10px;">${fakeArticle.title}</h2>
            <div style="color: #666; margin-bottom: 15px;">👤 ${fakeArticle.author} • 📅 ${fakeArticle.createdAt.toLocaleDateString()}</div>
            <div style="margin-bottom: 15px;">${fakeArticle.content}</div>
            ${youtubeHtml}
        </div>
    `;
    
    document.body.appendChild(testArticle);
    
    console.log('✅ Article de test créé avec YouTube intégré');
};

console.log('💡 Fonctions disponibles:');
console.log('  - testYouTube("URL") : Teste une URL YouTube');
console.log('  - testYouTubeUrls() : Teste plusieurs formats');  
console.log('  - testYouTubeInArticle("URL") : Teste dans un article simulé');