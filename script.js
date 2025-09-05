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
        modal.style.display = 'flex'; // Utilise flexbox pour centrer
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
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
    console.log('📰 Chargement des articles...');
    
    if (isLoadingArticles) return;
    isLoadingArticles = true;
    
    const container = document.getElementById('articlesContainer'); // Bon ID
    if (!container) {
        console.error('Container articles non trouvé');
        isLoadingArticles = false;
        return;
    }
    
    // Afficher le spinner
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Chargement des articles...
        </div>
    `;
    
    try {
        // Charger depuis Firestore
        db.collection('articles')
            .where('published', '==', true)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    container.innerHTML = `
                        <div class="loading">
                            <p>Aucun article publié pour le moment.</p>
                            ${isAdmin ? '<button onclick="openModal(\'articleModal\')" class="btn-primary">Créer le premier article</button>' : ''}
                        </div>
                    `;
                    return;
                }
                
                let articlesHTML = '';
                snapshot.forEach(doc => {
                    const article = doc.data();
                    const articleDate = article.createdAt ? article.createdAt.toDate().toLocaleDateString('fr-FR') : 'Date inconnue';
                    
                    articlesHTML += `
                        <div class="article-card">
                            <div class="article-header">
                                <h2 class="article-title">${article.title}</h2>
                                ${isAdmin ? `
                                    <div class="article-actions">
                                        <button onclick="editArticle('${doc.id}')" class="btn-secondary btn-small">Modifier</button>
                                        <button onclick="deleteArticle('${doc.id}')" class="btn-danger btn-small">Supprimer</button>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="article-meta">
                                <span>📅 ${articleDate}</span>
                                <span>👤 ${article.author || 'Auteur inconnu'}</span>
                            </div>
                            <div class="article-content">${article.content}</div>
                        </div>
                    `;
                });
                
                container.innerHTML = articlesHTML;
                console.log('✅ Articles chargés avec succès');
            })
            .catch(error => {
                console.error('❌ Erreur lors du chargement:', error);
                container.innerHTML = `
                    <div class="loading">
                        <p>❌ Erreur lors du chargement des articles</p>
                        <button onclick="loadArticles()" class="btn-primary">Réessayer</button>
                    </div>
                `;
            });
    } catch (error) {
        console.error('❌ Erreur:', error);
        container.innerHTML = '<div class="loading">❌ Erreur de connexion</div>';
    } finally {
        isLoadingArticles = false;
    }
}

// Remplacer la fonction handleArticleSubmit() vide par :
function handleArticleSubmit(e) {
    e.preventDefault();
    console.log('📝 Soumission d\'article...');
    
    if (!currentUser || !isAdmin) {
        showMessage('❌ Accès refusé', 'error');
        return;
    }
    
    const title = document.getElementById('articleTitle').value.trim();
    const content = document.getElementById('articleContent').value.trim();
    const published = document.getElementById('articlePublished').checked;
    
    if (!title || !content) {
        showMessage('❌ Titre et contenu requis', 'error');
        return;
    }
    
    const articleData = {
        title: title,
        content: content,
        published: published,
        author: currentUser.displayName || currentUser.email,
        authorId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (currentEditingArticle) {
        // Modification
        db.collection('articles').doc(currentEditingArticle).update(articleData)
            .then(() => {
                showMessage('✅ Article modifié avec succès', 'success');
                closeModal('articleModal');
                loadArticles();
                currentEditingArticle = null;
            })
            .catch(error => {
                console.error('❌ Erreur de modification:', error);
                showMessage('❌ Erreur lors de la modification', 'error');
            });
    } else {
        // Création
        db.collection('articles').add(articleData)
            .then(() => {
                showMessage('✅ Article créé avec succès', 'success');
                closeModal('articleModal');
                loadArticles();
                document.getElementById('articleForm').reset();
            })
            .catch(error => {
                console.error('❌ Erreur de création:', error);
                showMessage('❌ Erreur lors de la création', 'error');
            });
    }
}

// Fonctions manquantes pour la gestion des articles
function editArticle(articleId) {
    if (!isAdmin) {
        showMessage('❌ Accès refusé', 'error');
        return;
    }
    
    db.collection('articles').doc(articleId).get()
        .then(doc => {
            if (doc.exists) {
                const article = doc.data();
                currentEditingArticle = articleId;
                
                // Pré-remplir le formulaire
                document.getElementById('articleTitle').value = article.title;
                document.getElementById('articleContent').value = article.content;
                document.getElementById('articlePublished').checked = article.published;
                document.getElementById('articleModalTitle').textContent = 'Modifier l\'article';
                
                openModal('articleModal');
            }
        })
        .catch(error => {
            console.error('❌ Erreur lors de la récupération:', error);
            showMessage('❌ Erreur lors de la récupération de l\'article', 'error');
        });
}

function deleteArticle(articleId) {
    if (!isAdmin) {
        showMessage('❌ Accès refusé', 'error');
        return;
    }
    
    if (confirm('❓ Êtes-vous sûr de vouloir supprimer cet article ?')) {
        db.collection('articles').doc(articleId).delete()
            .then(() => {
                showMessage('🗑️ Article supprimé', 'success');
                loadArticles();
            })
            .catch(error => {
                console.error('❌ Erreur de suppression:', error);
                showMessage('❌ Erreur lors de la suppression', 'error');
            });
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