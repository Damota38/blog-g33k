// ========================================
// CONFIGURATION FIREBASE
// ========================================
// IMPORTANT : Remplacez par votre propre configuration !
const firebaseConfig = {
  apiKey: "AIzaSyAQlgfSP8vXHQWWjGECHie3QdvbgsGQ0Ek",
  authDomain: "blog-g33k.firebaseapp.com",
  projectId: "blog-g33k",
  storageBucket: "blog-g33k.firebasestorage.app",
  messagingSenderId: "30345195046",
  appId: "1:30345195046:web:abc459bc5612d0087140e7"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========================================
// VARIABLES GLOBALES
// ========================================
let currentUser = null;          // Utilisateur connecté
let currentEditingArticle = null; // Article en cours d'édition
let isAdmin = false;             // Statut admin
let isLoadingArticles = false;   // Flag de chargement

// ========================================
// OBSERVER D'AUTHENTIFICATION
// ========================================
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    
    if (user) {
        console.log('✅ Utilisateur connecté:', user.email);
        
        // Récupérer les informations utilisateur
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                isAdmin = userData.role === 'admin';
                document.getElementById('userInfo').textContent = 
                    `Bonjour, ${userData.displayName || user.email}`;
            } else {
                // Créer le profil si inexistant
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    role: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error);
        }

        // Mise à jour de l'interface
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        
        if (isAdmin) {
            document.getElementById('adminPanel').style.display = 'block';
        }
    } else {
        console.log('👤 Utilisateur déconnecté');
        
        // Réinitialisation
        document.getElementById('userInfo').textContent = '';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('registerBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'none';
        isAdmin = false;
    }
    
    // Recharger les articles
    loadArticles();
});

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Boutons d'authentification
    document.getElementById('loginBtn').addEventListener('click', 
        () => openModal('loginModal'));
    
    document.getElementById('registerBtn').addEventListener('click', 
        () => openModal('registerModal'));
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Bouton nouvel article (admin)
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => {
            currentEditingArticle = null;
            document.getElementById('articleModalTitle').textContent = 'Nouvel Article';
            document.getElementById('articleForm').reset();
            openModal('articleModal');
        });
    }
    
    // Formulaires
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('articleForm').addEventListener('submit', handleArticleSubmit);
});

// ========================================
// CONNEXION
// ========================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        console.log('🔐 Tentative de connexion...');
        await auth.signInWithEmailAndPassword(email, password);
        closeModal('loginModal');
        showMessage('✅ Connexion réussie !', 'success');
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error('Erreur de connexion:', error);
        
        // Messages d'erreur personnalisés
        let message = 'Erreur de connexion';
        switch(error.code) {
            case 'auth/user-not-found':
                message = 'Aucun compte trouvé avec cet email';
                break;
            case 'auth/wrong-password':
                message = 'Mot de passe incorrect';
                break;
            case 'auth/invalid-email':
                message = 'Email invalide';
                break;
            case 'auth/too-many-requests':
                message = 'Trop de tentatives. Réessayez plus tard';
                break;
        }
        showMessage(message, 'error');
    }
}

// ========================================
// INSCRIPTION
// ========================================
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        console.log('📝 Création du compte...');
        
        // Créer le compte
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Mettre à jour le profil
        await user.updateProfile({
            displayName: name
        });
        
        // Créer le document utilisateur
        await db.collection('users').doc(user.uid).set({
            email: email,
            displayName: name,
            role: 'user', // Par défaut, tous les nouveaux utilisateurs sont 'user'
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeModal('registerModal');
        showMessage('✅ Inscription réussie ! Bienvenue ' + name, 'success');
        document.getElementById('registerForm').reset();
        
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

// ========================================
// DÉCONNEXION
// ========================================
function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        auth.signOut()
            .then(() => {
                showMessage('👋 Déconnexion réussie', 'success');
            })
            .catch((error) => {
                console.error('Erreur de déconnexion:', error);
                showMessage('Erreur lors de la déconnexion', 'error');
            });
    }
}

async function searchArticles(searchTerm) {
    const snapshot = await db.collection('articles')
        .where('published', '==', true)
        .get();
    
    const results = [];
    snapshot.forEach(doc => {
        const article = doc.data();
        if (article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push({ id: doc.id, data: article });
        }
    });
    
    displaySearchResults(results);
}

// JavaScript pour le toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Au chargement
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

let lastVisible = null;
const articlesPerPage = 10;

async function loadArticlesWithPagination(isNext = true) {
    let query = db.collection('articles')
        .where('published', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(articlesPerPage);
    
    if (isNext && lastVisible) {
        query = query.startAfter(lastVisible);
    }
    
    const snapshot = await query.get();
    
    if (!snapshot.empty) {
        lastVisible = snapshot.docs[snapshot.docs.length - 1];
        // Afficher les articles...
    }
}

async function uploadImage(file) {
    const storageRef = firebase.storage().ref();
    const imageRef = storageRef.child('images/' + Date.now() + '_' + file.name);
    
    const snapshot = await imageRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    return downloadURL;
}

// Dans votre formulaire d'article
document.getElementById('imageInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const imageUrl = await uploadImage(file);
        // Insérer l'URL dans le contenu de l'article
    }
});