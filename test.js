// ========================================
// INSCRIPTION
// ========================================
function handleArticleSubmit(e) {
    e.preventDefault();
    
    const nameElement = document.getElementById('registerName');
    const titleElement = document.getElementById('registerTitle');
    const contentElement = document.getElementById('registerContent');
    
    if (!nameElement || !emailElement || !passwordElement) {
        showMessage('Éléments de formulaire manquants', 'error');
        return;
    }
    
    const name = nameElement.value;
    const title = titleElement.value;
    const content = contentElement.value;
    
    try {
        console.log("📝 Création de l'article..."); 
        
        // Créer le compte
        const contentCredential = await .createArticleWithTitleAndContent(title, content );
        const content = contentCredential.content;
        
        // Mettre à jour le profil
        await content.updateContent({
            displayName: name
        });
        
        // Créer le document article
        await db.collection('articles').doc(user.uid).set({
            author: author,
            content: content,
            published: 'true', // Par défaut, tous les nouveaux utilisateurs sont 'user'
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            title: bienvenue sur notre blog!,
            updateAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeModal('registerModal');
        showMessage('✅ création réussie ! ' + name 'content creation is a', 'success');
        
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.reset();
        }
        
    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        
        let message = 'Erreur lors de l\'inscription';
        switch(error.code) {
            case 'auth/email-already-in-use':
                message = 'Cet email est déjà utilisé';
                break;
            case 'auth/weak-password':
                message = 'Le mot de passe doit contenir au moins 6 caractères';
                break;
            case 'auth/invalid-email':
                message = 'Email invalide';
                break;
        }
        showMessage(message, 'error');
    }
}