// ========================================
// CONFIGURATION FIREBASE
// ========================================
// La configuration Firebase est maintenant dans config.js (non versionnée)

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

async function loadArticles() {
    if (isLoadingArticles) return;
    
    try {
        isLoadingArticles = true;
        const container = document.getElementById('articlesContainer');
        
        if (!container) return;
        
        // Afficher le loading
        container.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement des articles...</div>';
        
        // Récupérer les articles publiés, triés par date
        const snapshot = await db.collection('articles')
            .where('published', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="no-articles">Aucun article pour le moment.</div>';
            return;
        }
        
        // Afficher chaque article
        snapshot.forEach(doc => {
            const article = doc.data();
            const articleElement = createArticleElement(doc.id, article);
            container.appendChild(articleElement);
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        const container = document.getElementById('articlesContainer');
        if (container) {
            container.innerHTML = '<div class="error">Erreur lors du chargement des articles</div>';
        }
    } finally {
        isLoadingArticles = false;
    }
}

async function handleArticleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const titre = form.querySelector('#articleTitle').value.trim();
    const contenu = form.querySelector('#articleContent').value.trim();
    const published = form.querySelector('#articlePublished').checked;

    if (!titre || !contenu) {
        showMessage("⚠️ Veuillez remplir tous les champs !", "error");
        return;
    }

    try {
        const article = {
            author: currentUser ? currentUser.email : "anonyme",
            title: titre,
            content: contenu,
            published: published,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (currentEditingArticle) {
            // 🔄 Mise à jour d'un article existant
            const updateData = { ...article };
            delete updateData.createdAt; // Ne pas modifier la date de création
            await db.collection("articles").doc(currentEditingArticle).update(updateData);
            showMessage("✅ Article mis à jour avec succès", "success");
            currentEditingArticle = null;
        } else {
            // ➕ Création d'un nouvel article
            await db.collection("articles").add(article);
            showMessage("✅ Nouvel article ajouté", "success");
        }

        form.reset();
        closeModal("articleModal");
        loadArticles();
    } catch (error) {
        console.error("❌ Erreur lors de la soumission de l'article :", error);
        showMessage("Erreur lors de l'enregistrement de l'article", "error");
    }
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

function createArticleElement(id, article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-card';
    articleDiv.innerHTML = `
        <div class="article-header">
            <h3>${escapeHtml(article.title)}</h3>
            <div class="article-meta">
                <span>Par ${escapeHtml(article.author)}</span>
                <span>${formatDate(article.createdAt)}</span>
            </div>
        </div>
        <div class="article-content">
            <p>${escapeHtml(article.content).substring(0, 200)}${article.content.length > 200 ? '...' : ''}</p>
        </div>
        ${isAdmin ? `
            <div class="article-actions">
                <button onclick="editArticle('${id}')" class="btn-edit">✏️ Modifier</button>
                <button onclick="deleteArticle('${id}')" class="btn-delete">🗑️ Supprimer</button>
            </div>
        ` : ''}
    `;
    return articleDiv;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Date inconnue';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function editArticle(articleId) {
    try {
        const doc = await db.collection('articles').doc(articleId).get();
        if (doc.exists) {
            const article = doc.data();
            
            // Remplir le formulaire
            document.getElementById('articleTitle').value = article.title;
            document.getElementById('articleContent').value = article.content;
            document.getElementById('articlePublished').checked = article.published;
            
            // Définir l'article en cours d'édition
            currentEditingArticle = articleId;
            
            // Changer le titre du modal
            document.getElementById('articleModalTitle').textContent = 'Modifier l\'article';
            
            // Ouvrir le modal
            openModal('articleModal');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'article:', error);
        showMessage('Erreur lors de la récupération de l\'article', 'error');
    }
}

async function deleteArticle(articleId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
        try {
            await db.collection('articles').doc(articleId).delete();
            showMessage('✅ Article supprimé avec succès', 'success');
            loadArticles();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showMessage('Erreur lors de la suppression de l\'article', 'error');
        }
    }
}

function displaySearchResults(results) {
    const container = document.getElementById('articlesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div class="no-articles">Aucun résultat trouvé.</div>';
        return;
    }
    
    results.forEach(result => {
        const articleElement = createArticleElement(result.id, result.data);
        container.appendChild(articleElement);
    });
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