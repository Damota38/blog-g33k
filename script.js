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
                const userInfoElement = document.getElementById('userInfo');
                if (userInfoElement) {
                    userInfoElement.textContent = `Bonjour, ${userData.displayName || user.email}`;
                }
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
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const adminPanel = document.getElementById('adminPanel');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        if (isAdmin && adminPanel) {
            adminPanel.style.display = 'block';
        }
    } else {
        console.log('👤 Utilisateur déconnecté');
        
        // Réinitialisation
        const userInfoElement = document.getElementById('userInfo');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const adminPanel = document.getElementById('adminPanel');
        
        if (userInfoElement) userInfoElement.textContent = '';
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'none';
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
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => openModal('loginModal'));
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => openModal('registerModal'));
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Bouton nouvel article (admin)
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => {
            currentEditingArticle = null;
            const articleModalTitle = document.getElementById('articleModalTitle');
            const articleForm = document.getElementById('articleForm');
            
            if (articleModalTitle) {
                articleModalTitle.textContent = 'Nouvel Article';
            }
            if (articleForm) {
                articleForm.reset();
            }
            openModal('articleModal');
        });
    }
    
    // Formulaires
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const articleForm = document.getElementById('articleForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    if (articleForm) {
        articleForm.addEventListener('submit', handleArticleSubmit);
    }
});

// ========================================
// FONCTIONS UTILITAIRES MANQUANTES
// ========================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showMessage(message, type) {
    // Créer ou utiliser un élément pour afficher les messages
    let messageElement = document.getElementById('messageContainer');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'messageContainer';
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 15px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            min-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.className = type === 'success' ? 'message-success' : 'message-error';
    messageElement.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
    messageElement.style.display = 'block';
    
    // Auto-hide après 5 secondes
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

function loadArticles() {
    // Fonction placeholder - implémentez selon vos besoins
    if (typeof loadArticlesImplementation === 'function') {
        loadArticlesImplementation();
    } else {
        console.log('📰 Chargement des articles...');
        // Implémentation basique
        if (!isLoadingArticles) {
            isLoadingArticles = true;
            // Votre logique de chargement ici
            isLoadingArticles = false;
        }
    }
}

function handleArticleSubmit(e) {
    // Fonction placeholder - implémentez selon vos besoins
    e.preventDefault();
    console.log('📝 Soumission d\'article...');
    // Votre logique de soumission d'article ici
}

// ========================================
// CONNEXION
// ========================================
async function handleLogin(e) {
    e.preventDefault();
    
    const emailElement = document.getElementById('loginEmail');
    const passwordElement = document.getElementById('loginPassword');
    
    if (!emailElement || !passwordElement) {
        showMessage('Éléments de formulaire manquants', 'error');
        return;
    }
    
    const email = emailElement.value;
    const password = passwordElement.value;
    
    try {
        console.log('🔐 Tentative de connexion...');
        await auth.signInWithEmailAndPassword(email, password);
        closeModal('loginModal');
        showMessage('✅ Connexion réussie !', 'success');
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.reset();
        }
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
    
    const nameElement = document.getElementById('registerName');
    const emailElement = document.getElementById('registerEmail');
    const passwordElement = document.getElementById('registerPassword');
    
    if (!nameElement || !emailElement || !passwordElement) {
        showMessage('Éléments de formulaire manquants', 'error');
        return;
    }
    
    const name = nameElement.value;
    const email = emailElement.value;
    const password = passwordElement.value;
    
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

// ========================================
// FONCTIONS DE RECHERCHE ET UTILITAIRES
// ========================================
async function searchArticles(searchTerm) {
    try {
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
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showMessage('Erreur lors de la recherche', 'error');
    }
}

function displaySearchResults(results) {
    // Fonction placeholder - implémentez selon vos besoins
    console.log('🔍 Résultats de recherche:', results);
    // Votre logique d'affichage ici
}

// JavaScript pour le toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Au chargement du mode sombre
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// ========================================
// PAGINATION
// ========================================
let lastVisible = null;
const articlesPerPage = 10;

async function loadArticlesWithPagination(isNext = true) {
    try {
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
            console.log('📰 Articles chargés:', snapshot.docs.length);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        showMessage('Erreur lors du chargement des articles', 'error');
    }
}

// ========================================
// UPLOAD D'IMAGES
// ========================================
async function uploadImage(file) {
    try {
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child('images/' + Date.now() + '_' + file.name);
        
        const snapshot = await imageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return downloadURL;
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        showMessage('Erreur lors de l\'upload de l\'image', 'error');
        return null;
    }
}

// Gestionnaire d'événement pour l'upload d'image
document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const imageUrl = await uploadImage(file);
                if (imageUrl) {
                    console.log('✅ Image uploadée:', imageUrl);
                    // Insérer l'URL dans le contenu de l'article
                }
            }
        });
    }
});