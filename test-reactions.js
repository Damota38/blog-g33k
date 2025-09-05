// Script de test pour les réactions
console.log('🧪 Script de test des réactions chargé');

window.testReactions = async function() {
    console.log('🔍 Test des réactions...');
    
    if (!window.reactionService) {
        console.error('❌ ReactionService non disponible');
        return;
    }
    
    if (!window.authService || !window.authService.getCurrentUser()) {
        console.error('❌ Utilisateur non connecté');
        return;
    }
    
    const articleId = 'x0lhyComBIYJimAInT6f'; // Utilisez un ID d'article réel
    console.log(`📝 Test avec l'article: ${articleId}`);
    
    try {
        // Test 1: Récupérer les données actuelles
        console.log('1️⃣ Récupération des données de réaction...');
        const data = await window.reactionService.getArticleReactionData(articleId);
        console.log('✅ Données récupérées:', data);
        
        // Test 2: Tenter un like
        console.log('2️⃣ Test du like...');
        const likeResult = await window.reactionService.toggleLike(articleId);
        console.log('✅ Résultat du like:', likeResult);
        
        // Test 3: Tenter un dislike
        console.log('3️⃣ Test du dislike...');
        const dislikeResult = await window.reactionService.toggleDislike(articleId);
        console.log('✅ Résultat du dislike:', dislikeResult);
        
        // Test 4: Vérifier les nouvelles données
        console.log('4️⃣ Nouvelles données...');
        const newData = await window.reactionService.getArticleReactionData(articleId);
        console.log('✅ Nouvelles données:', newData);
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        
        if (error.code === 'permission-denied') {
            console.log('💡 Solution: Vérifiez vos règles Firebase');
        } else if (error.code === 'failed-precondition') {
            console.log('💡 Solution: Créez les index Firestore manquants');
        }
    }
};

// Test des règles d'écriture
window.testWritePermissions = async function() {
    console.log('🔐 Test des permissions d\'écriture...');
    
    if (!window.authService || !window.authService.getCurrentUser()) {
        console.error('❌ Utilisateur non connecté');
        return;
    }
    
    const user = window.authService.getCurrentUser();
    const testReaction = {
        articleId: 'test_article',
        userId: user.uid,
        userEmail: user.email,
        type: 'like',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        // Test d'écriture direct
        const docRef = window.firebaseService.getFirestore().collection('reactions').doc('test_reaction');
        await docRef.set(testReaction);
        console.log('✅ Écriture réussie');
        
        // Nettoyer le test
        await docRef.delete();
        console.log('✅ Nettoyage réussi');
        
    } catch (error) {
        console.error('❌ Erreur d\'écriture:', error);
        console.error('Code:', error.code);
    }
};

console.log(`
🛠️ Fonctions de test disponibles:

1. testReactions() - Test complet des réactions
2. testWritePermissions() - Test des permissions d'écriture

Utilisez ces fonctions après avoir:
- Corrigé les règles Firebase
- Créé les index Firestore
- Vous être connecté

Exemple:
> testReactions()
`);