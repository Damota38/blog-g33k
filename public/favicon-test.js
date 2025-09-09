// Script de test pour le favicon
console.log('🎯 Test Favicon Debug');

// Fonction pour tester le favicon
window.testFavicon = function() {
    console.log('🔍 Vérification du favicon...');
    
    // Vérifier les éléments link dans le head
    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    
    console.log(`📋 ${faviconLinks.length} éléments favicon trouvés:`);
    
    faviconLinks.forEach((link, index) => {
        console.log(`${index + 1}. Type: ${link.rel}, Href: ${link.href}, Sizes: ${link.sizes || 'non spécifié'}`);
        
        // Tester si le fichier existe
        const img = new Image();
        img.onload = function() {
            console.log(`✅ Favicon ${index + 1} chargé avec succès (${this.width}x${this.height})`);
        };
        img.onerror = function() {
            console.error(`❌ Favicon ${index + 1} ÉCHEC DE CHARGEMENT: ${link.href}`);
        };
        img.src = link.href;
    });
    
    // Créer un test visuel
    const testContainer = document.createElement('div');
    testContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: white;
        border: 2px solid #a100b6;
        border-radius: 10px;
        padding: 15px;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 300px;
        font-family: Arial, sans-serif;
        font-size: 12px;
    `;
    
    let testHTML = `
        <div style="background: #a100b6; color: white; padding: 10px; margin: -15px -15px 10px -15px; border-radius: 8px 8px 0 0;">
            <strong>🎯 Test Favicon</strong>
            <button onclick="this.parentElement.parentElement.remove()" style="float: right; background: none; border: none; color: white; cursor: pointer;">×</button>
        </div>
        <div><strong>Titre onglet:</strong> "${document.title}"</div>
        <div><strong>Liens favicon:</strong> ${faviconLinks.length}</div>
        <div style="margin-top: 10px;"><strong>Aperçu:</strong></div>
    `;
    
    // Ajouter les aperçus
    faviconLinks.forEach((link, index) => {
        testHTML += `
            <div style="display: flex; align-items: center; margin: 5px 0; padding: 5px; background: #f5f5f5; border-radius: 5px;">
                <img src="${link.href}" style="width: 16px; height: 16px; margin-right: 8px; border: 1px solid #ddd;" onerror="this.style.display='none'">
                <span style="font-size: 10px;">${link.href.split('/').pop()}</span>
            </div>
        `;
    });
    
    testContainer.innerHTML = testHTML;
    document.body.appendChild(testContainer);
    
    // Auto-suppression après 10 secondes
    setTimeout(() => {
        if (testContainer.parentNode) {
            testContainer.remove();
        }
    }, 10000);
};

// Fonction pour forcer le rafraîchissement du favicon
window.refreshFavicon = function() {
    console.log('🔄 Rafraîchissement forcé du favicon...');
    
    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    
    faviconLinks.forEach(link => {
        const newLink = link.cloneNode();
        newLink.href = link.href + '?v=' + new Date().getTime();
        link.parentNode.replaceChild(newLink, link);
        console.log('🔄 Favicon rafraîchi:', newLink.href);
    });
    
    console.log('✅ Tous les favicons ont été rafraîchis');
};

// Fonction pour changer le favicon dynamiquement (test)
window.changeFaviconTest = function(newUrl) {
    console.log('🎨 Test changement favicon vers:', newUrl);
    
    // Supprimer les anciens
    const oldLinks = document.querySelectorAll('link[rel*="icon"]');
    oldLinks.forEach(link => link.remove());
    
    // Ajouter le nouveau
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.type = 'image/png';
    newLink.href = newUrl;
    document.head.appendChild(newLink);
    
    console.log('✅ Favicon changé temporairement');
};

// Test automatique au chargement
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        console.log('🚀 Test automatique du favicon...');
        testFavicon();
    }, 2000);
});

console.log('💡 Fonctions disponibles:');
console.log('  - testFavicon() : Test complet avec aperçu visuel');
console.log('  - refreshFavicon() : Forcer le rafraîchissement');
console.log('  - changeFaviconTest("URL") : Changer temporairement');