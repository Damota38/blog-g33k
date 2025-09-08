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

// =====================
// FONCTIONS UTILITAIRES
// =====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
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

// ========================================
// SYSTÈME DE COMMENTAIRES ET LIKES/DISLIKES
// ========================================

// Variables globales pour les réactions
let userReactions = {}; // Cache des réactions de l'utilisateur
let articleStats = {}; // Cache des statistiques des articles

// ========================================
// MISE À JOUR DE LA FONCTION loadArticles()
// ========================================
function loadArticles() {
    console.log('📰 Chargement des articles...');
    
    if (isLoadingArticles) return;
    isLoadingArticles = true;
    
    const container = document.getElementById('articlesContainer');
    if (!container) {
        console.error('Container articles non trouvé');
        isLoadingArticles = false;
        return;
    }
    
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Chargement des articles...
        </div>
    `;
    
    try {
        db.collection('articles')
            .where('published', '==', true)
            .orderBy('createdAt', 'desc')
            .get()
            .then(async snapshot => {
                if (snapshot.empty) {
                    container.innerHTML = `
                        <div class="loading">
                            <p>Aucun article publié pour le moment.</p>
                            ${isAdmin ? '<button onclick="openModal(\'articleModal\')" class="btn-primary">Créer le premier article</button>' : ''}
                        </div>
                    `;
                    return;
                }
                
                // Charger les réactions de l'utilisateur si connecté
                if (currentUser) {
                    await loadUserReactions();
                }
                
                let articlesHTML = '';
                const articlePromises = [];
                
                snapshot.forEach(doc => {
                    articlePromises.push(buildArticleHTML(doc.id, doc.data()));
                });
                
                const articleHTMLs = await Promise.all(articlePromises);
                container.innerHTML = articleHTMLs.join('');
                
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

// =============================================
// CONSTRUCTION HTML DES ARTICLES AVEC RÉACTIONS
// =============================================
async function buildArticleHTML(articleId, article) {
    const articleDate = article.createdAt ? article.createdAt.toDate().toLocaleDateString('fr-FR') : 'Date inconnue';
    
    // Récupérer les statistiques de l'article
    const stats = await getArticleStats(articleId);
    const userReaction = userReactions[articleId] || null;
    
    // Récupérer les commentaires
    const comments = await getArticleComments(articleId);
    
    return `
        <div class="article-card" data-article-id="${articleId}">
            <div class="article-header">
                <h2 class="article-title">${article.title}</h2>
                ${isAdmin ? `
                    <div class="article-actions">
                        <button onclick="editArticle('${articleId}')" class="btn-secondary btn-small">Modifier</button>
                        <button onclick="deleteArticle('${articleId}')" class="btn-danger btn-small">Supprimer</button>
                    </div>
                ` : ''}
            </div>
            <div class="article-meta">
                <span>📅 ${articleDate}</span>
                <span>👤 ${article.author || 'Auteur inconnu'}</span>
            </div>
            <div class="article-content">${article.content}</div>
            
            <!-- Système de réactions -->
            <div class="reactions">
                <button onclick="toggleReaction('${articleId}', 'like')" 
                        class="reaction-btn ${userReaction === 'like' ? 'active like' : ''}">
                    👍 <span id="likes-${articleId}">${stats.likes}</span>
                </button>
                <button onclick="toggleReaction('${articleId}', 'dislike')" 
                        class="reaction-btn ${userReaction === 'dislike' ? 'active dislike' : ''}">
                    👎 <span id="dislikes-${articleId}">${stats.dislikes}</span>
                </button>
                <button onclick="toggleComments('${articleId}')" class="reaction-btn">
                    💬 ${comments.length} commentaire(s)
                </button>
            </div>
            
            <!-- Section des commentaires -->
            <div id="comments-section-${articleId}" class="comments-section" style="display: none;">
                ${currentUser ? `
                    <form onsubmit="addComment(event, '${articleId}')" class="comment-form">
                        <textarea id="comment-input-${articleId}" placeholder="Écrivez votre commentaire..." required></textarea>
                        <button type="submit" class="btn-primary btn-small">Commenter</button>
                    </form>
                ` : '<p class="login-prompt">Connectez-vous pour commenter</p>'}
                
                <div id="comments-list-${articleId}" class="comments-list">
                    ${buildCommentsHTML(comments)}
                </div>
            </div>
        </div>
    `;
}

// ======================================
// GESTION DES RÉACTIONS (LIKES/DISLIKES)
// ======================================
async function toggleReaction(articleId, reactionType) {
    if (!currentUser) {
        showMessage('Connectez-vous pour réagir', 'error');
        return;
    }
    
    try {
        const reactionRef = db.collection('reactions').doc(`${currentUser.uid}_${articleId}`);
        const reactionDoc = await reactionRef.get();
        
        let newReaction = null;
        
        if (reactionDoc.exists) {
            const currentReaction = reactionDoc.data().type;
            
            if (currentReaction === reactionType) {
                // Supprimer la réaction si c'est la même
                await reactionRef.delete();
            } else {
                // Changer le type de réaction
                newReaction = reactionType;
                await reactionRef.update({
                    type: reactionType,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } else {
            // Créer une nouvelle réaction
            newReaction = reactionType;
            await reactionRef.set({
                userId: currentUser.uid,
                articleId: articleId,
                type: reactionType,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Mettre à jour le cache local
        userReactions[articleId] = newReaction;
        
        // Rafraîchir l'affichage des compteurs
        await updateReactionCounters(articleId);
        
    } catch (error) {
        console.error('Erreur lors de la réaction:', error);
        showMessage('Erreur lors de l\'enregistrement de votre réaction', 'error');
    }
}

async function updateReactionCounters(articleId) {
    try {
        const stats = await getArticleStats(articleId);
        
        // Mettre à jour l'affichage
        const likesSpan = document.getElementById(`likes-${articleId}`);
        const dislikesSpan = document.getElementById(`dislikes-${articleId}`);
        
        if (likesSpan) likesSpan.textContent = stats.likes;
        if (dislikesSpan) dislikesSpan.textContent = stats.dislikes;
        
        // Mettre à jour les classes des boutons
        const articleCard = document.querySelector(`[data-article-id="${articleId}"]`);
        if (articleCard) {
            const likeBtn = articleCard.querySelector('.reaction-btn:nth-child(1)');
            const dislikeBtn = articleCard.querySelector('.reaction-btn:nth-child(2)');
            
            // Reset des classes
            likeBtn.className = 'reaction-btn';
            dislikeBtn.className = 'reaction-btn';
            
            // Application de la classe active
            const userReaction = userReactions[articleId];
            if (userReaction === 'like') {
                likeBtn.classList.add('active', 'like');
            } else if (userReaction === 'dislike') {
                dislikeBtn.classList.add('active', 'dislike');
            }
        }
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des compteurs:', error);
    }
}

// ========================
// GESTION DES COMMENTAIRES
// ========================
function toggleComments(articleId) {
    const commentsSection = document.getElementById(`comments-section-${articleId}`);
    if (commentsSection) {
        const isVisible = commentsSection.style.display !== 'none';
        commentsSection.style.display = isVisible ? 'none' : 'block';
    }
}

async function addComment(event, articleId) {
    event.preventDefault();
    
    if (!currentUser) {
        showMessage('Connectez-vous pour commenter', 'error');
        return;
    }
    
    const commentInput = document.getElementById(`comment-input-${articleId}`);
    const content = commentInput.value.trim();
    
    if (!content) {
        showMessage('Le commentaire ne peut pas être vide', 'error');
        return;
    }
    
    try {
        const commentData = {
            articleId: articleId,
            userId: currentUser.uid,
            author: currentUser.displayName || currentUser.email,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('comments').add(commentData);
        
        // Vider le champ de saisie
        commentInput.value = '';
        
        // Rafraîchir les commentaires
        await refreshComments(articleId);
        
        showMessage('Commentaire ajouté avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
        showMessage('Erreur lors de l\'ajout du commentaire', 'error');
    }
}

async function refreshComments(articleId) {
    try {
        const comments = await getArticleComments(articleId);
        const commentsList = document.getElementById(`comments-list-${articleId}`);
        
        if (commentsList) {
            commentsList.innerHTML = buildCommentsHTML(comments);
        }
        
        // Mettre à jour le compteur de commentaires
        const commentButton = document.querySelector(`[onclick="toggleComments('${articleId}')"]`);
        if (commentButton) {
            commentButton.innerHTML = `💬 ${comments.length} commentaire(s)`;
        }
        
    } catch (error) {
        console.error('Erreur lors du rafraîchissement des commentaires:', error);
    }
}

function buildCommentsHTML(comments) {
    if (comments.length === 0) {
        return '<p class="no-comments">Aucun commentaire pour le moment.</p>';
    }
    
    return comments.map(comment => {
        const commentDate = comment.createdAt ? 
            comment.createdAt.toDate().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Date inconnue';
            
        const canDelete = currentUser && (
            currentUser.uid === comment.userId || isAdmin
        );
        
        return `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${commentDate}</span>
                    ${canDelete ? `
                        <button onclick="deleteComment('${comment.id}', '${comment.articleId}')" 
                                class="btn-danger btn-small">
                            🗑️
                        </button>
                    ` : ''}
                </div>
                <div class="comment-content">${comment.content}</div>
            </div>
        `;
    }).join('');
}

async function deleteComment(commentId, articleId) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    
    try {
        await db.collection('comments').doc(commentId).delete();
        await refreshComments(articleId);
        showMessage('Commentaire supprimé', 'success');
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showMessage('Erreur lors de la suppression', 'error');
    }
}

// =====================
// FONCTIONS UTILITAIRES
// =====================
async function loadUserReactions() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('reactions')
            .where('userId', '==', currentUser.uid)
            .get();
        
        userReactions = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            userReactions[data.articleId] = data.type;
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des réactions:', error);
    }
}

async function getArticleStats(articleId) {
    try {
        const likesSnapshot = await db.collection('reactions')
            .where('articleId', '==', articleId)
            .where('type', '==', 'like')
            .get();
        
        const dislikesSnapshot = await db.collection('reactions')
            .where('articleId', '==', articleId)
            .where('type', '==', 'dislike')
            .get();
        
        return {
            likes: likesSnapshot.size,
            dislikes: dislikesSnapshot.size
        };
        
    } catch (error) {
        console.error('Erreur lors du chargement des stats:', error);
        return { likes: 0, dislikes: 0 };
    }
}

async function getArticleComments(articleId) {
    try {
        const snapshot = await db.collection('comments')
            .where('articleId', '==', articleId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return comments;
        
    } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
        return [];
    }
}

// Mettre à jour l'observer d'authentification pour recharger les réactions
const originalAuthObserver = auth.onAuthStateChanged;
auth.onAuthStateChanged = async (user) => {
    // Appeler l'observer original
    await originalAuthObserver(user);
    
    // Recharger les réactions si l'utilisateur change
    if (user) {
        await loadUserReactions();
    } else {
        userReactions = {};
    }
};

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

// =========
// CONNEXION
// =========
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

// ===========
// INSCRIPTION
// ===========
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

// ===========
// DÉCONNEXION
// ===========
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

// =====================================
// FONCTIONS DE RECHERCHE ET UTILITAIRES
// =====================================
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

// ==========
// PAGINATION
// ==========
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

// ===============
// UPLOAD D'IMAGES
// ===============
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

// TEST AUTRES FONCTIONNALITES

// ========================================
// SYSTÈME DE RECHERCHE, CATÉGORIES ET NOTIFICATIONS
// ========================================

// Variables globales
let allArticles = []; // Cache de tous les articles
let currentCategory = 'all';
let searchTerm = '';
let notifications = [];

// ========================================
// 1. SYSTÈME DE RECHERCHE
// ========================================

// Fonction de recherche améliorée
function initializeSearch() {
    // Ajouter la barre de recherche dans le header
    const headerContent = document.querySelector('.header-content');
    
    const searchHTML = `
        <div class="search-container">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Rechercher un article...">
                <button onclick="performSearch()" class="btn-primary">Rechercher</button>
                <button onclick="clearSearch()" class="btn-secondary" id="clearSearchBtn" style="display:none;">X</button>
            </div>
            <div class="search-filters">
                <select id="categoryFilter" onchange="filterByCategory(this.value)">
                    <option value="all">📂 Toutes les catégories</option>
                    <option value="all">📂 Jeux-vidéos</option>
                </select>
                <select id="sortFilter" onchange="sortArticles(this.value)">
                    <option value="date-desc">📅 Plus récent</option>
                    <option value="date-asc">📅 Plus ancien</option>
                    <option value="likes-desc">👍 Plus aimé</option>
                    <option value="comments-desc">💬 Plus commenté</option>
                </select>
            </div>
        </div>
    `;
    
    // Insérer après le titre
    const title = headerContent.querySelector('h1');
    title.insertAdjacentHTML('afterend', searchHTML);
    
    // Event listener pour la recherche en temps réel
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(performSearch, 300));
    
    // Event listener pour Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Fonction de recherche avec debounce
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    searchTerm = searchInput.value.toLowerCase().trim();
    
    const clearBtn = document.getElementById('clearSearchBtn');
    clearBtn.style.display = searchTerm ? 'inline-block' : 'none';
    
    displayFilteredArticles();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    searchTerm = '';
    currentCategory = 'all';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('clearSearchBtn').style.display = 'none';
    displayFilteredArticles();
}

// ========================
// 2. SYSTÈME DE CATÉGORIES
// ========================

function initializeCategories() {
    // Charger les catégories depuis Firestore
    loadCategories();
}

async function loadCategories() {
    try {
        const snapshot = await db.collection('categories').orderBy('name').get();
        const categoryFilter = document.getElementById('categoryFilter');
        
        // Clear existing options except "all"
        while (categoryFilter.children.length > 1) {
            categoryFilter.removeChild(categoryFilter.lastChild);
        }
        
        snapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${category.emoji || '📁'} ${category.name}`;
            categoryFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
    }
}

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    displayFilteredArticles();
}

// Ajouter le champ catégorie au formulaire d'article
function enhanceArticleForm() {
    const contentTextarea = document.getElementById('articleContent');
    
    const categoryHTML = `
        <div class="form-group">
            <label>Catégorie</label>
            <select id="articleCategory">
                <option value="">Sélectionner une catégorie</option>
            </select>
            <button type="button" onclick="openCategoryModal()" class="btn-secondary btn-small">+ Nouvelle catégorie</button>
        </div>
        <div class="form-group">
            <label>Tags (séparés par des virgules)</label>
            <input type="text" id="articleTags" placeholder="javascript, tutorial, débutant">
        </div>
    `;
    
    contentTextarea.parentNode.insertAdjacentHTML('afterend', categoryHTML);
    
    // Charger les catégories dans le select
    loadCategoriesInForm();
}

async function loadCategoriesInForm() {
    try {
        const snapshot = await db.collection('categories').orderBy('name').get();
        const categorySelect = document.getElementById('articleCategory');
        
        // Clear existing options except first
        while (categorySelect.children.length > 1) {
            categorySelect.removeChild(categorySelect.lastChild);
        }
        
        snapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${category.emoji || '📁'} ${category.name}`;
            categorySelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
    }
}

// ===========================
// 3. SYSTÈME DE NOTIFICATIONS
// ===========================

function initializeNotifications() {
    // Ajouter l'icône de notification dans le header
    const authSection = document.querySelector('.auth-section');
    
    const notificationHTML = `
        <div class="notification-container">
            <button id="notificationBtn" class="notification-btn" onclick="toggleNotifications()">
                🔔 <span id="notificationCount" class="notification-count">0</span>
            </button>
            <div id="notificationPanel" class="notification-panel" style="display:none;">
                <h3>🔔 Notifications</h3>
                <div id="notificationList" class="notification-list">
                    <p class="no-notifications">Aucune notification</p>
                </div>
                <button onclick="clearAllNotifications()" class="btn-danger btn-small">Tout effacer</button>
            </div>
        </div>
    `;
    
    const userInfo = authSection.querySelector('#userInfo');
    userInfo.insertAdjacentHTML('afterend', notificationHTML);
    
    // Charger les notifications pour l'utilisateur connecté
    if (currentUser) {
        loadNotifications();
        
        // Écouter les nouvelles notifications en temps réel
        listenToNotifications();
    }
}

async function loadNotifications() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .where('read', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        updateNotificationDisplay();
        
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
    }
}

function listenToNotifications() {
    if (!currentUser) return;
    
    db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .where('read', '==', false)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const notification = { id: change.doc.id, ...change.doc.data() };
                    notifications.unshift(notification);
                    
                    // Afficher une notification toast
                    showNotificationToast(notification);
                }
            });
            
            updateNotificationDisplay();
        });
}

function updateNotificationDisplay() {
    const countElement = document.getElementById('notificationCount');
    const listElement = document.getElementById('notificationList');
    
    if (countElement) {
        countElement.textContent = notifications.length;
        countElement.style.display = notifications.length > 0 ? 'block' : 'none';
    }
    
    if (listElement) {
        if (notifications.length === 0) {
            listElement.innerHTML = '<p class="no-notifications">Aucune notification</p>';
        } else {
            listElement.innerHTML = notifications.map(notif => `
                <div class="notification-item" onclick="handleNotificationClick('${notif.id}')">
                    <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
                    <div class="notification-content">
                        <p class="notification-title">${notif.title}</p>
                        <p class="notification-message">${notif.message}</p>
                        <small class="notification-date">
                            ${notif.createdAt ? notif.createdAt.toDate().toLocaleString('fr-FR') : 'Date inconnue'}
                        </small>
                    </div>
                </div>
            `).join('');
        }
    }
}

function getNotificationIcon(type) {
    const icons = {
        'comment': '💬',
        'like': '👍',
        'new_article': '📝',
        'mention': '@',
        'system': '🔧'
    };
    return icons[type] || '🔔';
}

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
}

function showNotificationToast(notification) {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="toast-icon">${getNotificationIcon(notification.type)}</div>
        <div class="toast-content">
            <strong>${notification.title}</strong>
            <p>${notification.message}</p>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animation d'entrée
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-suppression
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 5000);
    
    // Suppression au clic
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    });
}

async function handleNotificationClick(notificationId) {
    try {
        // Marquer comme lue
        await db.collection('notifications').doc(notificationId).update({
            read: true
        });
        
        // Retirer de la liste locale
        notifications = notifications.filter(n => n.id !== notificationId);
        updateNotificationDisplay();
        
        // Fermer le panel
        document.getElementById('notificationPanel').style.display = 'none';
        
    } catch (error) {
        console.error('Erreur lors de la gestion de la notification:', error);
    }
}

async function clearAllNotifications() {
    if (!confirm('Supprimer toutes les notifications ?')) return;
    
    try {
        const batch = db.batch();
        
        notifications.forEach(notif => {
            const notifRef = db.collection('notifications').doc(notif.id);
            batch.update(notifRef, { read: true });
        });
        
        await batch.commit();
        
        notifications = [];
        updateNotificationDisplay();
        
        showMessage('Toutes les notifications ont été supprimées', 'success');
        
    } catch (error) {
        console.error('Erreur lors de la suppression des notifications:', error);
        showMessage('Erreur lors de la suppression', 'error');
    }
}

// ========================================
// 4. FONCTIONS D'AFFICHAGE FILTRÉES
// ========================================

function displayFilteredArticles() {
    const container = document.getElementById('articlesContainer');
    if (!container) return;
    
    let filteredArticles = [...allArticles];
    
    // Filtrage par recherche
    if (searchTerm) {
        filteredArticles = filteredArticles.filter(article => {
            const searchableText = `${article.data.title} ${article.data.content} ${article.data.tags || ''}`.toLowerCase();
            return searchableText.includes(searchTerm);
        });
    }
    
    // Filtrage par catégorie
    if (currentCategory && currentCategory !== 'all') {
        filteredArticles = filteredArticles.filter(article => 
            article.data.categoryId === currentCategory
        );
    }
    
    // Tri
    const sortFilter = document.getElementById('sortFilter');
    const sortValue = sortFilter ? sortFilter.value : 'date-desc';
    filteredArticles = sortArticlesList(filteredArticles, sortValue);
    
    if (filteredArticles.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>😔 Aucun résultat trouvé</h3>
                <p>Essayez de modifier vos critères de recherche</p>
                <button onclick="clearSearch()" class="btn-primary">Réinitialiser la recherche</button>
            </div>
        `;
        return;
    }
    
    // Afficher les articles filtrés
    displayArticlesList(filteredArticles);
}

function sortArticlesList(articles, sortBy) {
    switch (sortBy) {
        case 'date-asc':
            return articles.sort((a, b) => 
                (a.data.createdAt?.toDate() || new Date(0)) - (b.data.createdAt?.toDate() || new Date(0))
            );
        case 'date-desc':
        default:
            return articles.sort((a, b) => 
                (b.data.createdAt?.toDate() || new Date(0)) - (a.data.createdAt?.toDate() || new Date(0))
            );
        case 'likes-desc':
            return articles.sort((a, b) => (b.data.likesCount || 0) - (a.data.likesCount || 0));
        case 'comments-desc':
            return articles.sort((a, b) => (b.data.commentsCount || 0) - (a.data.commentsCount || 0));
    }
}

async function displayArticlesList(articles) {
    const container = document.getElementById('articlesContainer');
    const articlePromises = articles.map(article => 
        buildArticleHTML(article.id, article.data)
    );
    
    const articleHTMLs = await Promise.all(articlePromises);
    container.innerHTML = articleHTMLs.join('');
}

// ========================================
// 5. FONCTIONS DE CRÉATION DE NOTIFICATIONS
// ========================================

async function createNotification(userId, type, title, message, articleId = null) {
    try {
        await db.collection('notifications').add({
            userId: userId,
            type: type,
            title: title,
            message: message,
            articleId: articleId,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Erreur lors de la création de notification:', error);
    }
}

// Modifier la fonction addComment pour créer des notifications
async function addCommentWithNotification(event, articleId) {
    // ... code existant de addComment ...
    
    // Après l'ajout du commentaire, créer une notification pour l'auteur
    try {
        const articleDoc = await db.collection('articles').doc(articleId).get();
        if (articleDoc.exists) {
            const article = articleDoc.data();
            if (article.authorId !== currentUser.uid) {
                await createNotification(
                    article.authorId,
                    'comment',
                    'Nouveau commentaire',
                    `${currentUser.displayName || currentUser.email} a commenté votre article "${article.title}"`,
                    articleId
                );
            }
        }
    } catch (error) {
        console.error('Erreur lors de la création de notification:', error);
    }
}

// ========================================
// 6. INITIALISATION
// ========================================

// Modifier l'initialisation existante
document.addEventListener('DOMContentLoaded', () => {
    // ... code existant ...
    
    // Initialiser les nouvelles fonctionnalités
    initializeSearch();
    initializeCategories();
    
    // Améliorer le formulaire d'article si admin
    if (isAdmin) {
        enhanceArticleForm();
    }
});

// Modifier l'observer d'authentification
auth.onAuthStateChanged(async (user) => {
    // ... code existant ...
    
    if (user) {
        // Initialiser les notifications
        setTimeout(initializeNotifications, 1000);
    }
});

// Modifier la fonction loadArticles pour utiliser le cache
async function loadArticlesWithCache() {
    console.log('📰 Chargement des articles...');
    
    if (isLoadingArticles) return;
    isLoadingArticles = true;
    
    try {
        const snapshot = await db.collection('articles')
            .where('published', '==', true)
            .orderBy('createdAt', 'desc')
            .get();
        
        allArticles = [];
        snapshot.forEach(doc => {
            allArticles.push({ id: doc.id, data: doc.data() });
        });
        
        displayFilteredArticles();
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement:', error);
    } finally {
        isLoadingArticles = false;
    }
}

// ========================================
// FONCTIONS JAVASCRIPT COMPLÉMENTAIRES
// ========================================

// Gestion des catégories
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners pour le formulaire de catégorie
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
    }
    
    // Event listeners pour les sélecteurs emoji et couleur
    setupCategorySelectors();
    
    // Initialiser la barre de progression de lecture
    setupReadingProgress();
    
    // Initialiser les statistiques en temps réel
    setupLiveStats();
    
    // Détecter le code Konami pour les easter eggs
    setupKonamiCode();
});

function setupCategorySelectors() {
    // Sélecteur d'emoji
    const emojiOptions = document.querySelectorAll('.emoji-option');
    emojiOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Retirer la sélection précédente
            document.querySelector('.emoji-option.selected')?.classList.remove('selected');
            
            // Ajouter la sélection
            this.classList.add('selected');
            document.getElementById('selectedEmoji').value = this.dataset.emoji;
            
            // Mettre à jour l'aperçu
            updateCategoryPreview();
        });
    });
    
    // Sélecteur de couleur
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Retirer la sélection précédente
            document.querySelector('.color-option.selected')?.classList.remove('selected');
            
            // Ajouter la sélection
            this.classList.add('selected');
            document.getElementById('selectedColor').value = this.dataset.color;
            
            // Mettre à jour l'aperçu
            updateCategoryPreview();
        });
    });
    
    // Mettre à jour l'aperçu quand le nom change
    const nameInput = document.getElementById('categoryName');
    if (nameInput) {
        nameInput.addEventListener('input', updateCategoryPreview);
    }
}

function updateCategoryPreview() {
    const name = document.getElementById('categoryName')?.value || 'Nouvelle catégorie';
    const emoji = document.getElementById('selectedEmoji')?.value || '📁';
    const color = document.getElementById('selectedColor')?.value || '#667eea';
    
    const preview = document.getElementById('categoryPreview');
    if (preview) {
        preview.textContent = `${emoji} ${name}`;
        preview.style.background = color;
    }
}

function handleCategorySubmit(e) {
    e.preventDefault();
    
    if (!currentUser || !isAdmin) {
        showMessage('❌ Accès refusé', 'error');
        return;
    }
    
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    const emoji = document.getElementById('selectedEmoji').value;
    const color = document.getElementById('selectedColor').value;
    
    if (!name) {
        showMessage('❌ Le nom est requis', 'error');
        return;
    }
    
    // Créer la catégorie dans Firestore
    db.collection('categories').add({
        name: name,
        description: description,
        emoji: emoji,
        color: color,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.uid
    })
    .then(() => {
        showMessage('✅ Catégorie créée avec succès', 'success');
        closeModal('categoryModal');
        document.getElementById('categoryForm').reset();
        
        // Recharger les catégories
        loadCategories();
        loadCategoriesInForm();
        
        // Tracking Analytics
        if (typeof trackCategoryCreation === 'function') {
            trackCategoryCreation(name, emoji);
        }
    })
    .catch(error => {
        console.error('❌ Erreur lors de la création:', error);
        showMessage('❌ Erreur lors de la création de la catégorie', 'error');
    });
}

function openCategoryModal() {
    // Reset form
    document.getElementById('categoryForm').reset();
    document.getElementById('selectedEmoji').value = '📁';
    document.getElementById('selectedColor').value = '#667eea';
    
    // Reset selections
    document.querySelector('.emoji-option.selected')?.classList.remove('selected');
    document.querySelector('.color-option.selected')?.classList.remove('selected');
    
    // Select defaults
    document.querySelector('.emoji-option[data-emoji="📁"]')?.classList.add('selected');
    document.querySelector('.color-option[data-color="#667eea"]')?.classList.add('selected');
    
    updateCategoryPreview();
    openModal('categoryModal');
}

// Barre de progression de lecture
function setupReadingProgress() {
    const progressBar = document.getElementById('readingProgress');
    if (!progressBar) return;
    
    window.addEventListener('scroll', updateReadingProgress);
}

function updateReadingProgress() {
    const progressBar = document.getElementById('readingProgress');
    if (!progressBar) return;
    
    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    progressBar.style.width = Math.min(scrollPercent, 100) + '%';
}

// Fonctions utilitaires
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function focusSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

function toggleDevMode() {
    document.body.classList.toggle('dev-mode');
    const liveStats = document.getElementById('liveStats');
    const isDevMode = document.body.classList.contains('dev-mode');
    
    liveStats.style.display = isDevMode ? 'block' : 'none';
    
    if (isDevMode) {
        updateLiveStats();
        showMessage('🔧 Mode développeur activé', 'success');
    } else {
        showMessage('🔧 Mode développeur désactivé', 'success');
    }
}

function setupLiveStats() {
    // Mettre à jour les statistiques toutes les 5 secondes en mode dev
    setInterval(() => {
        if (document.body.classList.contains('dev-mode')) {
            updateLiveStats();
        }
    }, 5000);
}

async function updateLiveStats() {
    try {
        // Compter les articles
        const articlesSnapshot = await db.collection('articles').get();
        document.getElementById('totalArticles').textContent = articlesSnapshot.size;
        
        // Compter les commentaires
        const commentsSnapshot = await db.collection('comments').get();
        document.getElementById('totalComments').textContent = commentsSnapshot.size;
        
        // Compter les likes
        const likesSnapshot = await db.collection('reactions').where('type', '==', 'like').get();
        document.getElementById('totalLikes').textContent = likesSnapshot.size;
        
        // Temps de chargement
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
            const loadTime = Math.round(perfData.loadEventEnd - perfData.loadEventStart);
            document.getElementById('pageLoadTime').textContent = loadTime + 'ms';
        }
        
        // Simuler les utilisateurs actifs (à remplacer par une vraie métrique)
        document.getElementById('activeUsers').textContent = Math.floor(Math.random() * 10) + 1;
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des stats:', error);
    }
}

// Konami Code Easter Egg
function setupKonamiCode() {
    const konamiCode = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'KeyB', 'KeyA'
    ];
    let konamiIndex = 0;
    
    document.addEventListener('keydown', function(e) {
        if (e.code === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                activateKonamiMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

function activateKonamiMode() {
    document.body.classList.add('konami-mode');
    showMessage('🎉 Konami Code activé ! Mode festif ON', 'success');
    
    // Créer des confettis
    for (let i = 0; i < 50; i++) {
        createConfetti();
    }
    
    // Désactiver après 5 secondes
    setTimeout(() => {
        document.body.classList.remove('konami-mode');
    }, 5000);
}

function createConfetti() {
    const confetti = document.createElement('div');
    confetti.innerHTML = ['🎉', '🎊', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)];
    confetti.className = 'snowflake';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
    confetti.style.opacity = Math.random();
    confetti.style.fontSize = (Math.random() * 10 + 10) + 'px';
    
    document.body.appendChild(confetti);
    
    setTimeout(() => {
        confetti.remove();
    }, 5000);
}

// Fonctions d'information
function showAnalyticsInfo() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>📊 Statistiques du site</h2>
            <div id="analyticsData">
                <p>Chargement des statistiques...</p>
            </div>
            <button onclick="this.closest('.modal').remove()" class="btn-primary">Fermer</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Charger les vraies statistiques
    loadAnalyticsData();
}

async function loadAnalyticsData() {
    try {
        const articlesSnapshot = await db.collection('articles').get();
        const commentsSnapshot = await db.collection('comments').get();
        const reactionsSnapshot = await db.collection('reactions').get();
        const usersSnapshot = await db.collection('users').get();
        
        const analyticsData = document.getElementById('analyticsData');
        if (analyticsData) {
            analyticsData.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
                    <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="color: #667eea; font-size: 2em; margin: 0;">${articlesSnapshot.size}</h3>
                        <p style="margin: 5px 0 0 0; color: #666;">📰 Articles publiés</p>
                    </div>
                    <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="color: #28a745; font-size: 2em; margin: 0;">${commentsSnapshot.size}</h3>
                        <p style="margin: 5px 0 0 0; color: #666;">💬 Commentaires</p>
                    </div>
                    <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="color: #ffc107; font-size: 2em; margin: 0;">${reactionsSnapshot.size}</h3>
                        <p style="margin: 5px 0 0 0; color: #666;">👍 Réactions</p>
                    </div>
                    <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="color: #17a2b8; font-size: 2em; margin: 0;">${usersSnapshot.size}</h3>
                        <p style="margin: 5px 0 0 0; color: #666;">👥 Utilisateurs</p>
                    </div>
                </div>
                <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
                    Données mises à jour en temps réel depuis Firebase
                </p>
            `;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        const analyticsData = document.getElementById('analyticsData');
        if (analyticsData) {
            analyticsData.innerHTML = '<p style="color: #dc3545;">❌ Erreur lors du chargement des statistiques</p>';
        }
    }
}

function exportData() {
    if (!currentUser) {
        showMessage('❌ Connectez-vous pour exporter vos données', 'error');
        return;
    }
    
    showMessage('📁 Export des données en cours...', 'success');
    
    // Simuler l'export (à remplacer par une vraie implémentation)
    setTimeout(() => {
        showMessage('✅ Export terminé ! Vérifiez vos téléchargements', 'success');
    }, 2000);
}