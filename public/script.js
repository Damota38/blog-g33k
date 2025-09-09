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
let allArticles = [];            // Cache de tous les articles
let filteredArticles = [];      // Articles filtrés
let searchTerm = '';             // Terme de recherche actuel
let currentSort = 'newest';      // Tri actuel
let currentAuthor = 'all';       // Filtre auteur actuel
let articleMediaFiles = [];      // Fichiers médias pour l'article en cours
let cloudinaryWidget = null;     // Widget Cloudinary
let commentMediaFiles = {};      // Fichiers médias par commentaire (par articleId)
let currentCommentArticleId = null; // ID de l'article pour le commentaire en cours
let audioRecorderStates = {};    // États des enregistreurs audio
let mediaRecorder = null;        // MediaRecorder global
let audioChunks = [];           // Chunks audio en cours d'enregistrement
let recordingInterval = null;   // Interval pour le timer
let currentRecordingId = null;  // ID de l'enregistrement en cours

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
            resetArticleMedia();
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
    
    // Event listeners pour la recherche et filtres
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const sortFilter = document.getElementById('sortFilter');
    const authorFilter = document.getElementById('authorFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', handleSortChange);
    }
    
    if (authorFilter) {
        authorFilter.addEventListener('change', handleAuthorFilterChange);
    }
    
    // Event listener pour l'upload de médias dans les articles
    const addMediaBtn = document.getElementById('addMediaBtn');
    if (addMediaBtn) {
        addMediaBtn.addEventListener('click', openMediaUploadWidget);
    }
    
    // Event listener pour l'enregistrement audio dans les articles
    const addAudioBtn = document.getElementById('addAudioBtn');
    if (addAudioBtn) {
        addAudioBtn.addEventListener('click', () => toggleAudioRecorder('article'));
    }
    
    const articleRecordBtn = document.getElementById('article-record-btn');
    if (articleRecordBtn) {
        articleRecordBtn.addEventListener('click', () => toggleRecording('article'));
    }
    
    // Initialiser le widget Cloudinary
    initializeCloudinaryWidget();
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
                    allArticles = [];
                    filteredArticles = [];
                    updateAuthorFilter();
                    return;
                }
                
                // Charger les réactions de l'utilisateur si connecté
                if (currentUser) {
                    await loadUserReactions();
                }
                
                // Mettre à jour le cache des articles
                allArticles = [];
                snapshot.forEach(doc => {
                    allArticles.push({
                        id: doc.id,
                        data: doc.data()
                    });
                });
                
                // Mettre à jour le filtre des auteurs
                updateAuthorFilter();
                
                // Appliquer les filtres et afficher
                await filterAndDisplayArticles();
                
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
    console.log('🏗️ Construction HTML article:', articleId, 'avec YouTube URL:', article.youtubeUrl);
    
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
            ${buildYouTubeHTML(article.youtubeUrl)}
            ${buildMediaHTML(article.mediaFiles, 'article')}
            
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
                        <div class="comment-media-section">
                            <div class="media-buttons">
                                <button type="button" onclick="openCommentMediaWidget('${articleId}')" class="btn-secondary btn-small">📎 Ajouter média</button>
                                <button type="button" onclick="toggleAudioRecorder('${articleId}')" class="btn-secondary btn-small">🎤 Enregistrer audio</button>
                            </div>
                            <div id="comment-media-preview-${articleId}" class="comment-media-preview"></div>
                            <div id="audio-recorder-${articleId}" class="audio-recorder" style="display: none;">
                                <button type="button" id="record-btn-${articleId}" class="record-btn" onclick="toggleRecording('${articleId}')">🎤</button>
                                <span id="recording-time-${articleId}" class="recording-time">00:00</span>
                                <span id="recording-status-${articleId}" class="recording-status">Appuyez pour enregistrer</span>
                                <audio id="audio-preview-${articleId}" style="display: none;" controls></audio>
                            </div>
                        </div>
                        <div class="comment-form-actions">
                            <button type="submit" class="btn-primary btn-small">Commenter</button>
                        </div>
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
            mediaFiles: commentMediaFiles[articleId] && commentMediaFiles[articleId].length > 0 
                ? commentMediaFiles[articleId] : null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('comments').add(commentData);
        
        // Vider le champ de saisie et réinitialiser les médias
        commentInput.value = '';
        resetCommentMedia(articleId);
        
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
                ${buildMediaHTML(comment.mediaFiles, 'comment')}
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
    const youtubeUrl = document.getElementById('articleYoutubeUrl').value.trim();
    const published = document.getElementById('articlePublished').checked;
    
    if (!title || !content) {
        showMessage('❌ Titre et contenu requis', 'error');
        return;
    }
    
    // Valider l'URL YouTube si fournie
    if (youtubeUrl && !isValidYouTubeUrl(youtubeUrl)) {
        showMessage('❌ URL YouTube invalide. Utilisez un lien YouTube valide.', 'error');
        return;
    }
    
    const articleData = {
        title: title,
        content: content,
        youtubeUrl: youtubeUrl || null,
        published: published,
        author: currentUser.displayName || currentUser.email,
        authorId: currentUser.uid,
        mediaFiles: articleMediaFiles.length > 0 ? articleMediaFiles : null,
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
                resetArticleMedia();
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
                resetArticleMedia();
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
                document.getElementById('articleYoutubeUrl').value = article.youtubeUrl || '';
                document.getElementById('articlePublished').checked = article.published;
                document.getElementById('articleModalTitle').textContent = 'Modifier l\'article';
                
                // Charger les médias existants
                articleMediaFiles = article.mediaFiles || [];
                updateMediaPreview();
                
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
// FONCTIONS DE RECHERCHE ET FILTRES
// =====================================

// Fonction debounce pour limiter les appels de recherche
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Gestionnaire de recherche
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
        
        filterAndDisplayArticles();
    }
}

// Effacer la recherche
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        clearBtn.style.display = 'none';
        filterAndDisplayArticles();
    }
}

// Gestionnaire de changement de tri
function handleSortChange() {
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        currentSort = sortFilter.value;
        filterAndDisplayArticles();
    }
}

// Gestionnaire de filtre par auteur
function handleAuthorFilterChange() {
    const authorFilter = document.getElementById('authorFilter');
    if (authorFilter) {
        currentAuthor = authorFilter.value;
        filterAndDisplayArticles();
    }
}

// Filtrer et afficher les articles selon les critères
async function filterAndDisplayArticles() {
    console.log('🔍 Filtrage des articles...', { searchTerm, currentSort, currentAuthor });
    
    let filtered = [...allArticles];
    
    // Filtrage par terme de recherche
    if (searchTerm) {
        filtered = filtered.filter(article => 
            article.data.title.toLowerCase().includes(searchTerm) ||
            article.data.content.toLowerCase().includes(searchTerm) ||
            (article.data.author && article.data.author.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filtrage par auteur
    if (currentAuthor !== 'all') {
        filtered = filtered.filter(article => article.data.author === currentAuthor);
    }
    
    // Tri des articles
    filtered = await sortArticles(filtered, currentSort);
    
    filteredArticles = filtered;
    displayArticles(filteredArticles);
}

// Fonction de tri des articles
async function sortArticles(articles, sortType) {
    const articlesWithStats = await Promise.all(
        articles.map(async (article) => {
            const stats = await getArticleStats(article.id);
            const comments = await getArticleComments(article.id);
            return {
                ...article,
                stats: stats,
                commentsCount: comments.length
            };
        })
    );
    
    switch (sortType) {
        case 'newest':
            return articlesWithStats.sort((a, b) => {
                const dateA = a.data.createdAt ? a.data.createdAt.toDate() : new Date(0);
                const dateB = b.data.createdAt ? b.data.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });
        case 'oldest':
            return articlesWithStats.sort((a, b) => {
                const dateA = a.data.createdAt ? a.data.createdAt.toDate() : new Date(0);
                const dateB = b.data.createdAt ? b.data.createdAt.toDate() : new Date(0);
                return dateA - dateB;
            });
        case 'most-liked':
            return articlesWithStats.sort((a, b) => b.stats.likes - a.stats.likes);
        case 'most-commented':
            return articlesWithStats.sort((a, b) => b.commentsCount - a.commentsCount);
        default:
            return articlesWithStats;
    }
}

// Afficher les articles filtrés
async function displayArticles(articles) {
    const container = document.getElementById('articlesContainer');
    if (!container) return;
    
    if (articles.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <p>Aucun article ne correspond à votre recherche.</p>
                ${searchTerm ? '<button onclick="clearSearch()" class="btn-primary">Effacer la recherche</button>' : ''}
            </div>
        `;
        return;
    }
    
    try {
        const articlePromises = articles.map(article => 
            buildArticleHTML(article.id, article.data)
        );
        const articleHTMLs = await Promise.all(articlePromises);
        container.innerHTML = articleHTMLs.join('');
        
        console.log(`✅ ${articles.length} articles affichés`);
    } catch (error) {
        console.error('❌ Erreur lors de l\'affichage:', error);
        container.innerHTML = '<div class="loading">❌ Erreur lors de l\'affichage des articles</div>';
    }
}

// Mettre à jour la liste des auteurs dans le filtre
function updateAuthorFilter() {
    const authorFilter = document.getElementById('authorFilter');
    if (!authorFilter) return;
    
    // Obtenir la liste unique des auteurs
    const authors = [...new Set(allArticles.map(article => article.data.author).filter(Boolean))];
    
    // Garder l'option "Tous les auteurs" et ajouter les auteurs
    const currentValue = authorFilter.value;
    authorFilter.innerHTML = '<option value="all">Tous les auteurs</option>';
    
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorFilter.appendChild(option);
    });
    
    // Restaurer la sélection
    authorFilter.value = currentValue;
}

// =====================================
// GESTION DES MÉDIAS - CLOUDINARY
// =====================================

// Initialiser le widget Cloudinary
function initializeCloudinaryWidget() {
    try {
        if (typeof cloudinary === 'undefined') {
            console.error('Cloudinary SDK non chargé');
            showMessage('SDK Cloudinary non disponible', 'error');
            return;
        }
        
        cloudinaryWidget = cloudinary.createUploadWidget({
            cloudName: cloudinaryConfig.cloudName,
            uploadPreset: cloudinaryConfig.uploadPreset,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            maxFiles: 1,
            maxFileSize: 10000000,
            resourceType: 'auto',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi'],
            maxVideoFileSize: 50000000,
            cropping: true,
            croppingAspectRatio: null,
            showSkipCropButton: true,
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#90A0B3",
                    tabIcon: "#a100b6",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#a100b6",
                    action: "#a100b6",
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44336",
                    inProgress: "#0078FF",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1"
                }
            }
        }, (error, result) => {
            if (error) {
                console.error('❌ Erreur Cloudinary:', error);
                showMessage('Erreur lors de l\'upload du média: ' + error.message, 'error');
                return;
            }
            
            if (result && result.event === 'success') {
                console.log('✅ Upload réussi:', result.info);
                handleMediaUploadSuccess(result.info);
            }
            
            if (result && result.event === 'close') {
                console.log('🔒 Widget fermé');
                currentCommentArticleId = null;
            }
        });
        
        console.log('✅ Widget Cloudinary créé:', cloudinaryWidget ? 'OK' : 'FAILED');
    } catch (error) {
        console.error('Erreur initialisation Cloudinary:', error);
    }
}

// Ouvrir le widget d'upload
function openMediaUploadWidget() {
    console.log('🎯 Tentative d\'ouverture du widget Cloudinary...');
    
    if (typeof cloudinary === 'undefined') {
        console.error('❌ SDK Cloudinary non chargé');
        showMessage('SDK Cloudinary non disponible. Vérifiez votre connexion internet.', 'error');
        return;
    }
    
    if (!cloudinaryWidget) {
        console.log('⚠️ Widget non initialisé, tentative de création...');
        initializeCloudinaryWidget();
        if (!cloudinaryWidget) {
            showMessage('Impossible d\'initialiser le widget d\'upload', 'error');
            return;
        }
    }
    
    try {
        console.log('✅ Ouverture du widget...');
        cloudinaryWidget.open();
    } catch (error) {
        console.error('❌ Erreur ouverture widget:', error);
        showMessage('Erreur lors de l\'ouverture du widget: ' + error.message, 'error');
    }
}

// Gérer le succès de l'upload
function handleMediaUploadSuccess(result) {
    const mediaData = {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        width: result.width || null,
        height: result.height || null,
        duration: result.duration || null
    };
    
    if (currentCommentArticleId) {
        // Upload pour un commentaire
        if (!commentMediaFiles[currentCommentArticleId]) {
            commentMediaFiles[currentCommentArticleId] = [];
        }
        commentMediaFiles[currentCommentArticleId].push(mediaData);
        updateCommentMediaPreview(currentCommentArticleId);
    } else {
        // Upload pour un article
        articleMediaFiles.push(mediaData);
        updateMediaPreview();
    }
    
    showMessage('Média ajouté avec succès !', 'success');
}

// Mettre à jour la prévisualisation des médias
function updateMediaPreview() {
    const preview = document.getElementById('articleMediaPreview');
    if (!preview) return;
    
    preview.innerHTML = articleMediaFiles.map((media, index) => {
        const isVideo = media.resourceType === 'video';
        const optimizedUrl = getOptimizedUrl(media.publicId, media.resourceType, 'thumbnail');
        
        return `
            <div class="media-item" data-index="${index}">
                ${media.isAudio ? 
                    `<div class="audio-player">
                        <audio controls>
                            <source src="${media.secureUrl}" type="audio/webm">
                            <source src="${media.secureUrl}" type="audio/ogg">
                            Votre navigateur ne supporte pas l'audio.
                        </audio>
                    </div>` :
                    (isVideo ? 
                        `<video src="${optimizedUrl}" muted preload="metadata"></video>` :
                        `<img src="${optimizedUrl}" alt="Média ${index + 1}">`
                    )
                }
                <button class="remove-media" onclick="removeMedia(${index})" title="Supprimer">×</button>
                <div class="media-info">
                    ${media.isAudio ? '🎵' : (isVideo ? '🎥' : '🖼️')} ${formatFileSize(media.bytes)}
                    ${media.duration ? ` • ${Math.round(media.duration)}s` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Supprimer un média
function removeMedia(index) {
    if (confirm('Supprimer ce média ?')) {
        articleMediaFiles.splice(index, 1);
        updateMediaPreview();
        showMessage('Média supprimé', 'success');
    }
}

// Formater la taille du fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Réinitialiser les médias de l'article
function resetArticleMedia() {
    articleMediaFiles = [];
    updateMediaPreview();
}

// Construire HTML pour afficher les médias d'un article
function buildMediaHTML(mediaList, type = 'article') {
    if (!mediaList || mediaList.length === 0) return '';
    
    const containerClass = type === 'article' ? 'article-media' : 'comment-media';
    
    return `
        <div class="${containerClass}">
            ${mediaList.map(media => {
                const isVideo = media.resourceType === 'video';
                const optimizedUrl = getOptimizedUrl(media.publicId, media.resourceType, type);
                
                if (media.isAudio) {
                    return `
                        <div class="audio-player">
                            <audio controls>
                                <source src="${media.secureUrl}" type="audio/webm">
                                <source src="${media.secureUrl}" type="audio/ogg">
                                Votre navigateur ne supporte pas l'audio.
                            </audio>
                        </div>
                    `;
                } else if (isVideo) {
                    return `
                        <div class="media-item">
                            <video controls preload="metadata" src="${optimizedUrl}">
                                Votre navigateur ne supporte pas la lecture de vidéos.
                            </video>
                        </div>
                    `;
                } else {
                    return `
                        <div class="media-item">
                            <img src="${optimizedUrl}" alt="Image" onclick="openMediaModal('${media.secureUrl}', 'image')" style="cursor: zoom-in;">
                        </div>
                    `;
                }
            }).join('')}
        </div>
    `;
}

// Ouvrir un modal pour afficher les médias en grand
function openMediaModal(mediaUrl, mediaType) {
    console.log('🔍 Ouverture modal média:', mediaType, mediaUrl);
    
    // Créer le modal s'il n'existe pas
    let modal = document.getElementById('mediaModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mediaModal';
        modal.className = 'modal media-modal';
        document.body.appendChild(modal);
    }
    
    // Contenu du modal selon le type
    let modalContent = '';
    if (mediaType === 'image') {
        modalContent = `
            <div class="modal-content media-modal-content">
                <span class="close-modal" onclick="closeMediaModal()">&times;</span>
                <img src="${mediaUrl}" alt="Image en grand" onload="adjustModalImageSize(this)">
            </div>
        `;
    } else if (mediaType === 'video') {
        modalContent = `
            <div class="modal-content media-modal-content">
                <span class="close-modal" onclick="closeMediaModal()">&times;</span>
                <video controls onloadedmetadata="adjustModalVideoSize(this)">
                    <source src="${mediaUrl}">
                    Votre navigateur ne supporte pas la lecture vidéo.
                </video>
            </div>
        `;
    }
    
    modal.innerHTML = modalContent;
    modal.style.display = 'flex';
    
    // Fermer en cliquant à côté
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeMediaModal();
        }
    };
    
    // Fermer avec Échap
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMediaModal();
        }
    });
}

// Ajuster la taille de l'image dans le modal
function adjustModalImageSize(img) {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    
    // Calculer les dimensions optimales
    let targetWidth = Math.min(img.naturalWidth, maxWidth);
    let targetHeight = Math.min(img.naturalHeight, maxHeight);
    
    // Maintenir les proportions
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    
    if (targetWidth / targetHeight > aspectRatio) {
        targetWidth = targetHeight * aspectRatio;
    } else {
        targetHeight = targetWidth / aspectRatio;
    }
    
    // Tailles minimum pour une bonne visibilité
    const minWidth = Math.min(400, maxWidth * 0.6);
    const minHeight = Math.min(300, maxHeight * 0.6);
    
    targetWidth = Math.max(targetWidth, minWidth);
    targetHeight = Math.max(targetHeight, minHeight);
    
    console.log(`📐 Image ajustée: ${targetWidth}x${targetHeight} (originale: ${img.naturalWidth}x${img.naturalHeight})`);
    
    img.style.width = targetWidth + 'px';
    img.style.height = targetHeight + 'px';
}

// Ajuster la taille de la vidéo dans le modal
function adjustModalVideoSize(video) {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    
    // Taille par défaut pour les vidéos
    let targetWidth = Math.min(800, maxWidth);
    let targetHeight = Math.min(600, maxHeight);
    
    // Si on peut obtenir les dimensions réelles
    if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        
        if (targetWidth / targetHeight > aspectRatio) {
            targetWidth = targetHeight * aspectRatio;
        } else {
            targetHeight = targetWidth / aspectRatio;
        }
    }
    
    console.log(`🎬 Vidéo ajustée: ${targetWidth}x${targetHeight}`);
    
    video.style.width = targetWidth + 'px';
    video.style.height = targetHeight + 'px';
}

// Fermer le modal média
function closeMediaModal() {
    const modal = document.getElementById('mediaModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('🔒 Modal média fermé');
    }
    
    // Nettoyer les event listeners
    document.removeEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMediaModal();
        }
    });
}

// =====================================
// GESTION DES MÉDIAS POUR COMMENTAIRES
// =====================================

// Ouvrir le widget pour les médias de commentaire
function openCommentMediaWidget(articleId) {
    if (!cloudinaryWidget) {
        showMessage('Widget d\'upload non disponible', 'error');
        return;
    }
    
    currentCommentArticleId = articleId;
    cloudinaryWidget.open();
}

// Mettre à jour la prévisualisation des médias du commentaire
function updateCommentMediaPreview(articleId) {
    const preview = document.getElementById(`comment-media-preview-${articleId}`);
    if (!preview || !commentMediaFiles[articleId]) return;
    
    const mediaFiles = commentMediaFiles[articleId];
    
    preview.innerHTML = mediaFiles.map((media, index) => {
        const isVideo = media.resourceType === 'video';
        const optimizedUrl = getOptimizedUrl(media.publicId, media.resourceType, 'thumbnail');
        
        return `
            <div class="media-item" data-index="${index}">
                ${media.isAudio ? 
                    `<div class="audio-player">
                        <audio controls>
                            <source src="${media.secureUrl}" type="audio/webm">
                            <source src="${media.secureUrl}" type="audio/ogg">
                            Votre navigateur ne supporte pas l'audio.
                        </audio>
                    </div>` :
                    (isVideo ? 
                        `<video src="${optimizedUrl}" muted preload="metadata"></video>` :
                        `<img src="${optimizedUrl}" alt="Média ${index + 1}">`
                    )
                }
                <button class="remove-media" onclick="removeCommentMedia('${articleId}', ${index})" title="Supprimer">×</button>
            </div>
        `;
    }).join('');
}

// Supprimer un média d'un commentaire
function removeCommentMedia(articleId, index) {
    if (confirm('Supprimer ce média ?')) {
        if (commentMediaFiles[articleId]) {
            commentMediaFiles[articleId].splice(index, 1);
            updateCommentMediaPreview(articleId);
            showMessage('Média supprimé', 'success');
        }
    }
}

// Réinitialiser les médias d'un commentaire
function resetCommentMedia(articleId) {
    commentMediaFiles[articleId] = [];
    updateCommentMediaPreview(articleId);
}

// =====================================
// GESTION DES VIDÉOS YOUTUBE
// =====================================

// Extraire l'ID YouTube depuis une URL
function extractYouTubeId(url) {
    if (!url) return null;
    
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Construire HTML pour embed YouTube
function buildYouTubeHTML(youtubeUrl) {
    console.log('🎬 buildYouTubeHTML appelé avec:', youtubeUrl);
    
    if (!youtubeUrl) {
        console.log('❌ Pas d\'URL YouTube fournie');
        return '';
    }
    
    const videoId = extractYouTubeId(youtubeUrl);
    console.log('🎯 Video ID extrait:', videoId);
    
    if (!videoId) {
        console.log('❌ Impossible d\'extraire l\'ID de la vidéo');
        return '';
    }
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    console.log('✅ URL embed générée:', embedUrl);
    
    return `
        <div class="youtube-container">
            <iframe 
                src="${embedUrl}" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>
    `;
}

// Valider une URL YouTube
function isValidYouTubeUrl(url) {
    if (!url) return false;
    return extractYouTubeId(url) !== null;
}

// =====================================
// GESTION DE L'ENREGISTREMENT AUDIO
// =====================================

// Afficher/masquer l'enregistreur audio
function toggleAudioRecorder(context) {
    console.log('🎤 Toggle audio recorder pour:', context);
    
    const recorderId = context === 'article' ? 'article-audio-recorder' : `audio-recorder-${context}`;
    const recorder = document.getElementById(recorderId);
    
    if (!recorder) {
        console.error('❌ Élément enregistreur non trouvé:', recorderId);
        showMessage('Interface d\'enregistrement non disponible', 'error');
        return;
    }
    
    const isVisible = recorder.style.display !== 'none';
    recorder.style.display = isVisible ? 'none' : 'block';
    
    console.log('👁️ Visibilité enregistreur:', isVisible ? 'masqué' : 'affiché');
    
    if (!isVisible) {
        initializeAudioRecorder(context);
    }
}

// Initialiser l'enregistreur audio
async function initializeAudioRecorder(context) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showMessage('Enregistrement audio non supporté par votre navigateur', 'error');
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialiser l'état pour ce contexte
        audioRecorderStates[context] = {
            stream: stream,
            isRecording: false,
            startTime: null,
            audioBlob: null
        };
        
        updateRecordingStatus(context, 'Prêt à enregistrer');
        
    } catch (error) {
        console.error('Erreur accès microphone:', error);
        showMessage('Impossible d\'accéder au microphone', 'error');
    }
}

// Démarrer/arrêter l'enregistrement
async function toggleRecording(context) {
    const state = audioRecorderStates[context];
    
    if (!state || !state.stream) {
        await initializeAudioRecorder(context);
        return;
    }
    
    if (state.isRecording) {
        stopRecording(context);
    } else {
        startRecording(context);
    }
}

// Démarrer l'enregistrement
function startRecording(context) {
    const state = audioRecorderStates[context];
    if (!state || !state.stream) return;
    
    try {
        mediaRecorder = new MediaRecorder(state.stream);
        audioChunks = [];
        currentRecordingId = context;
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            state.audioBlob = audioBlob;
            displayAudioPreview(context, audioBlob);
        };
        
        mediaRecorder.start();
        state.isRecording = true;
        state.startTime = Date.now();
        
        // Démarrer le timer
        startRecordingTimer(context);
        
        // Mettre à jour l'interface
        const recordBtn = document.getElementById(
            context === 'article' ? 'article-record-btn' : `record-btn-${context}`
        );
        if (recordBtn) {
            recordBtn.classList.add('recording');
            recordBtn.textContent = '⏹️';
        }
        
        updateRecordingStatus(context, 'Enregistrement en cours...');
        
    } catch (error) {
        console.error('Erreur démarrage enregistrement:', error);
        showMessage('Erreur lors du démarrage de l\'enregistrement', 'error');
    }
}

// Arrêter l'enregistrement
function stopRecording(context) {
    const state = audioRecorderStates[context];
    if (!state || !mediaRecorder) return;
    
    try {
        mediaRecorder.stop();
        state.isRecording = false;
        currentRecordingId = null;
        
        // Arrêter le timer
        stopRecordingTimer();
        
        // Mettre à jour l'interface
        const recordBtn = document.getElementById(
            context === 'article' ? 'article-record-btn' : `record-btn-${context}`
        );
        if (recordBtn) {
            recordBtn.classList.remove('recording');
            recordBtn.textContent = '🎤';
        }
        
        updateRecordingStatus(context, 'Enregistrement terminé');
        
    } catch (error) {
        console.error('Erreur arrêt enregistrement:', error);
        showMessage('Erreur lors de l\'arrêt de l\'enregistrement', 'error');
    }
}

// Timer d'enregistrement
function startRecordingTimer(context) {
    const state = audioRecorderStates[context];
    
    recordingInterval = setInterval(() => {
        if (state && state.isRecording && state.startTime) {
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const timeElement = document.getElementById(
                context === 'article' ? 'article-recording-time' : `recording-time-${context}`
            );
            if (timeElement) {
                timeElement.textContent = timeString;
            }
        }
    }, 1000);
}

// Arrêter le timer
function stopRecordingTimer() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
}

// Mettre à jour le statut d'enregistrement
function updateRecordingStatus(context, status) {
    const statusElement = document.getElementById(
        context === 'article' ? 'article-recording-status' : `recording-status-${context}`
    );
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// Afficher la prévisualisation audio
function displayAudioPreview(context, audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audioElement = document.getElementById(
        context === 'article' ? 'article-audio-preview' : `audio-preview-${context}`
    );
    
    if (audioElement) {
        audioElement.src = audioUrl;
        audioElement.style.display = 'block';
        audioElement.load();
    }
    
    // Uploader automatiquement l'audio
    uploadAudioToCloudinary(audioBlob, context);
}

// Upload audio vers Cloudinary
async function uploadAudioToCloudinary(audioBlob, context) {
    try {
        updateRecordingStatus(context, 'Upload en cours...');
        
        // Convertir le blob en fichier
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
            type: 'audio/webm'
        });
        
        const result = await uploadToCloudinary(audioFile, 'blog-audio');
        
        if (result.success) {
            const audioData = {
                publicId: result.publicId,
                secureUrl: result.secureUrl,
                resourceType: 'video', // Cloudinary traite l'audio comme vidéo
                format: result.format,
                bytes: result.bytes,
                duration: result.duration || null,
                isAudio: true
            };
            
            // Ajouter à la liste appropriée
            if (context === 'article') {
                articleMediaFiles.push(audioData);
                updateMediaPreview();
            } else {
                if (!commentMediaFiles[context]) {
                    commentMediaFiles[context] = [];
                }
                commentMediaFiles[context].push(audioData);
                updateCommentMediaPreview(context);
            }
            
            updateRecordingStatus(context, 'Audio ajouté avec succès !');
            showMessage('Enregistrement audio ajouté !', 'success');
            
            // Masquer l'enregistreur après quelques secondes
            setTimeout(() => {
                const recorderId = context === 'article' ? 'article-audio-recorder' : `audio-recorder-${context}`;
                const recorder = document.getElementById(recorderId);
                if (recorder) {
                    recorder.style.display = 'none';
                }
            }, 2000);
            
        } else {
            updateRecordingStatus(context, 'Erreur upload');
            showMessage('Erreur lors de l\'upload audio: ' + result.error, 'error');
        }
        
    } catch (error) {
        console.error('Erreur upload audio:', error);
        updateRecordingStatus(context, 'Erreur upload');
        showMessage('Erreur lors de l\'upload audio', 'error');
    }
}

// Nettoyer les ressources audio
function cleanupAudioResources(context) {
    const state = audioRecorderStates[context];
    if (state && state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        delete audioRecorderStates[context];
    }
    
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
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

/* =====================
   PROGRESS BAR POUR LECTURE
   ===================== */
   setTimeout(() => {
        setupReadingProgress();
   })

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