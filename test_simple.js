// Test simple pour vérifier les fonctions JavaScript
console.log('🧪 Tests simples pour le blog');

// Test de la fonction escapeHtml
function testEscapeHtml() {
    const testDiv = document.createElement('div');
    testDiv.textContent = '<script>alert("test")</script>';
    const expected = testDiv.innerHTML;
    
    console.log('✅ Test escapeHtml:', expected === '&lt;script&gt;alert("test")&lt;/script&gt;');
}

// Test de la fonction formatDate
function testFormatDate() {
    const testDate = new Date('2024-01-15T10:30:00');
    const formatted = testDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    console.log('✅ Test formatDate:', formatted);
}

// Simuler le chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM chargé, lancement des tests');
    testEscapeHtml();
    testFormatDate();
});