// Script de débogage pour tester les commentaires
console.log('🔍 Script de débogage des commentaires chargé');

// Fonction de test à exécuter dans la console
window.testComments = async function() {
    console.log('🧪 Test des commentaires...');
    
    // Vérifier que les services sont disponibles
    console.log('Services disponibles:');
    console.log('- commentService:', !!window.commentService);
    console.log('- authService:', !!window.authService);
    console.log('- articleService:', !!window.articleService);
    
    if (!window.commentService) {
        console.error('❌ CommentService non disponible');
        return;
    }
    
    // Tester le chargement des commentaires pour l'article spécifique
    const articleId = 'x0lhyComBIYJimAInT6f';
    console.log(`📝 Test chargement commentaires pour article: ${articleId}`);
    
    try {
        const comments = await window.commentService.getComments(articleId);
        console.log('✅ Commentaires récupérés:', comments);
        
        if (comments.length > 0) {
            console.log('📋 Détails du premier commentaire:');
            console.log(comments[0]);
        } else {
            console.log('📭 Aucun commentaire trouvé');
        }
        
        // Tester le comptage
        const count = await window.commentService.getCommentsCount(articleId);
        console.log(`🔢 Nombre de commentaires: ${count}`);
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        console.error('Détails:', {
            code: error.code,
            message: error.message
        });
    }
};

// Fonction pour tester les règles Firebase
window.testFirebaseRules = async function() {
    console.log('🔐 Test des règles Firebase...');
    
    if (!window.firebaseService || !window.firebaseService.getFirestore()) {
        console.error('❌ Firebase non initialisé');
        return;
    }
    
    const db = window.firebaseService.getFirestore();
    
    try {
        // Test lecture articles
        console.log('📰 Test lecture articles...');
        const articlesSnapshot = await db.collection('articles').limit(1).get();
        console.log(`✅ Articles accessibles: ${articlesSnapshot.size} trouvé(s)`);
        
        // Test lecture commentaires
        console.log('💬 Test lecture commentaires...');
        const commentsSnapshot = await db.collection('comments').limit(1).get();
        console.log(`✅ Commentaires accessibles: ${commentsSnapshot.size} trouvé(s)`);
        
        // Test lecture réactions
        console.log('❤️ Test lecture réactions...');
        const reactionsSnapshot = await db.collection('reactions').limit(1).get();
        console.log(`✅ Réactions accessibles: ${reactionsSnapshot.size} trouvé(s)`);
        
    } catch (error) {
        console.error('❌ Erreur de règles Firebase:', error);
        console.error('Code:', error.code);
        console.error('Message:', error.message);
    }
};

// Ajouter les fonctions au menu d'aide
console.log(`
🛠️ Fonctions de débogage disponibles:

1. testComments() - Tester le chargement des commentaires
2. testFirebaseRules() - Tester les règles Firebase
3. window.commentService.getComments('x0lhyComBIYJimAInT6f') - Test direct

Exemple d'utilisation:
> testComments()
> testFirebaseRules()
`);