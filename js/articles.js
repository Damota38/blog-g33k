// ========================================
// MODULE DE GESTION DES ARTICLES
// ========================================

class ArticleService {
    constructor() {
        this.db = null;
        this.isLoading = false;
        this.currentEditingArticle = null;
        this.lastVisible = null;
        this.articlesPerPage = 10;
    }

    init(firebaseService) {
        this.db = firebaseService.getFirestore();
        
        // Initialiser les services de réaction et commentaires
        if (window.reactionService) {
            window.reactionService.init(firebaseService);
        }
        if (window.commentService) {
            window.commentService.init(firebaseService);
        }
    }

    async loadArticles() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            const container = document.getElementById('articlesContainer');
            
            if (!container) return;
            
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement des articles...</div>';
            
            const snapshot = await this.db.collection('articles')
                .where('published', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(this.articlesPerPage)
                .get();
            
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = '<div class="no-articles">Aucun article pour le moment.</div>';
                return;
            }
            
            // Créer les articles avec leurs données de réaction
            const articlesPromises = [];
            snapshot.forEach(doc => {
                const article = doc.data();
                articlesPromises.push(this.createArticleElementWithReactions(doc.id, article));
            });

            const articleElements = await Promise.all(articlesPromises);
            articleElements.forEach(element => {
                container.appendChild(element);
            });
            
            this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
            
        } catch (error) {
            console.error('Erreur lors du chargement des articles:', error);
            console.error('Détails de l\'erreur:', {
                code: error.code,
                message: error.message,
                details: error
            });
            
            const container = document.getElementById('articlesContainer');
            if (container) {
                let errorMessage = 'Erreur lors du chargement des articles';
                
                // Messages d'erreur spécifiques selon le code d'erreur
                if (error.code === 'permission-denied') {
                    errorMessage = '🔒 Accès refusé. Vérifiez vos règles Firestore ou connectez-vous.';
                } else if (error.code === 'unavailable') {
                    errorMessage = '🌐 Service temporairement indisponible. Réessayez dans quelques instants.';
                }
                
                container.innerHTML = `<div class="error">${errorMessage}<br><small>Code d'erreur: ${error.code || 'inconnu'}</small></div>`;
            }
        } finally {
            this.isLoading = false;
        }
    }

    async createArticleElementWithReactions(id, article) {
        let reactionData = { 
            likesCount: 0, 
            dislikesCount: 0, 
            userLiked: false, 
            userDisliked: false 
        };
        let commentsCount = 0;

        // Charger les données de réactions et commentaires si les services sont disponibles
        if (window.reactionService) {
            try {
                reactionData = await window.reactionService.getArticleReactionData(id);
            } catch (error) {
                console.error('Erreur lors du chargement des réactions:', error);
            }
        }

        if (window.commentService) {
            try {
                commentsCount = await window.commentService.getCommentsCount(id);
            } catch (error) {
                console.error('Erreur lors du chargement du nombre de commentaires:', error);
            }
        }

        return this.createArticleElement(id, article, reactionData, commentsCount);
    }

    createArticleElement(id, article, reactionData = {}, commentsCount = 0) {
        const { 
            likesCount = 0, 
            dislikesCount = 0, 
            userLiked = false, 
            userDisliked = false 
        } = reactionData;
        
        const articleDiv = document.createElement('div');
        articleDiv.className = 'article-card';
        articleDiv.innerHTML = `
            <div class="article-header">
                <h3>${this.escapeHtml(article.title)}</h3>
                <div class="article-meta">
                    <span>Par ${this.escapeHtml(article.author)}</span>
                    <span>${this.formatDate(article.createdAt)}</span>
                </div>
            </div>
            <div class="article-content">
                <p>${this.escapeHtml(article.content).substring(0, 200)}${article.content.length > 200 ? '...' : ''}</p>
            </div>
            
            <!-- Section interactions -->
            <div class="article-interactions">
                <div class="interactions-bar">
                    <button onclick="articleService.toggleLike('${id}')" 
                            class="like-button ${userLiked ? 'liked' : ''}" 
                            data-article-id="${id}"
                            data-reaction-type="like">
                        <span class="like-icon">${userLiked ? '❤️' : '🤍'}</span>
                        <span class="like-count">${likesCount}</span>
                    </button>
                    
                    <button onclick="articleService.toggleDislike('${id}')" 
                            class="dislike-button ${userDisliked ? 'disliked' : ''}" 
                            data-article-id="${id}"
                            data-reaction-type="dislike">
                        <span class="dislike-icon">${userDisliked ? '👎' : '👎🏻'}</span>
                        <span class="dislike-count">${dislikesCount}</span>
                    </button>
                    
                    <button onclick="articleService.toggleComments('${id}')" class="comment-button">
                        <span class="comment-icon">💬</span>
                        <span class="comment-count">${commentsCount}</span>
                    </button>
                    
                    <div class="reactions-info">
                        <button onclick="articleService.showReactionsList('${id}', 'like')" class="likes-list-button" title="Voir qui a aimé">
                            👥 Likes
                        </button>
                        <button onclick="articleService.showReactionsList('${id}', 'dislike')" class="dislikes-list-button" title="Voir qui n'a pas aimé">
                            👥 Dislikes
                        </button>
                    </div>
                </div>
                
                <!-- Zone des commentaires (cachée par défaut) -->
                <div id="comments-section-${id}" class="comments-section" style="display: none;">
                    ${window.authService && window.authService.getCurrentUser() ? `
                        <div class="add-comment">
                            <form onsubmit="articleService.submitComment(event, '${id}')">
                                <textarea placeholder="Ajouter un commentaire..." 
                                         maxlength="500" 
                                         required
                                         id="comment-input-${id}"></textarea>
                                <div class="comment-form-actions">
                                    <small class="char-count" id="char-count-${id}">0/500</small>
                                    <button type="submit" class="btn btn-primary btn-sm">Publier</button>
                                </div>
                            </form>
                        </div>
                    ` : '<p class="login-to-comment">Connectez-vous pour commenter</p>'}
                    
                    <div class="comments-list" id="comments-${id}">
                        <!-- Les commentaires seront chargés ici -->
                    </div>
                </div>
            </div>
            
            ${window.authService && window.authService.isUserAdmin() ? `
                <div class="article-actions admin-actions">
                    <button onclick="articleService.editArticle('${id}')" class="btn-edit">✏️ Modifier</button>
                    <button onclick="articleService.deleteArticle('${id}')" class="btn-delete">🗑️ Supprimer</button>
                </div>
            ` : ''}
        `;

        // Ajouter les event listeners pour le compteur de caractères
        const textarea = articleDiv.querySelector(`#comment-input-${id}`);
        const charCount = articleDiv.querySelector(`#char-count-${id}`);
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                const count = textarea.value.length;
                charCount.textContent = `${count}/500`;
                charCount.style.color = count > 500 ? 'var(--danger-color)' : 'var(--text-muted)';
            });
        }

        return articleDiv;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(timestamp) {
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

    async submitArticle(formData) {
        const { title, content, published } = formData;

        if (!title || !content) {
            NotificationService.show("⚠️ Veuillez remplir tous les champs !", "error");
            return false;
        }

        try {
            const article = {
                author: window.authService.getCurrentUser() ? window.authService.getCurrentUser().email : "anonyme",
                title: title.trim(),
                content: content.trim(),
                published: published,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.currentEditingArticle) {
                const updateData = { ...article };
                delete updateData.createdAt;
                await this.db.collection("articles").doc(this.currentEditingArticle).update(updateData);
                NotificationService.show("✅ Article mis à jour avec succès", "success");
                this.currentEditingArticle = null;
            } else {
                await this.db.collection("articles").add(article);
                NotificationService.show("✅ Nouvel article ajouté", "success");
            }

            this.loadArticles();
            return true;
        } catch (error) {
            console.error("❌ Erreur lors de la soumission de l'article :", error);
            NotificationService.show("Erreur lors de l'enregistrement de l'article", "error");
            return false;
        }
    }

    async editArticle(articleId) {
        try {
            const doc = await this.db.collection('articles').doc(articleId).get();
            if (doc.exists) {
                const article = doc.data();
                
                document.getElementById('articleTitle').value = article.title;
                document.getElementById('articleContent').value = article.content;
                document.getElementById('articlePublished').checked = article.published;
                
                this.currentEditingArticle = articleId;
                
                document.getElementById('articleModalTitle').textContent = 'Modifier l\'article';
                ModalService.open('articleModal');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'article:', error);
            NotificationService.show('Erreur lors de la récupération de l\'article', 'error');
        }
    }

    async deleteArticle(articleId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
            try {
                await this.db.collection('articles').doc(articleId).delete();
                NotificationService.show('✅ Article supprimé avec succès', 'success');
                this.loadArticles();
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                NotificationService.show('Erreur lors de la suppression de l\'article', 'error');
            }
        }
    }

    async searchArticles(searchTerm) {
        try {
            const snapshot = await this.db.collection('articles')
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
            
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            NotificationService.show('Erreur lors de la recherche', 'error');
        }
    }

    displaySearchResults(results) {
        const container = document.getElementById('articlesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = '<div class="no-articles">Aucun résultat trouvé.</div>';
            return;
        }
        
        results.forEach(result => {
            const articleElement = this.createArticleElement(result.id, result.data);
            container.appendChild(articleElement);
        });
    }

    resetForm() {
        this.currentEditingArticle = null;
        const form = document.getElementById('articleForm');
        if (form) {
            form.reset();
        }
        document.getElementById('articleModalTitle').textContent = 'Nouvel Article';
    }

    // Nouvelles méthodes pour les likes et commentaires
    async toggleLike(articleId) {
        if (!window.reactionService) return;

        const result = await window.reactionService.toggleLike(articleId);
        if (result) {
            // Mettre à jour l'interface
            this.updateReactionButton(articleId, 'like', result.liked, result.action === 'added' ? 1 : -1);
            
            // Si une réaction opposée a été supprimée
            if (result.oppositeRemoved) {
                this.updateReactionButton(articleId, 'dislike', false, -1);
            }
        }
    }

    async toggleDislike(articleId) {
        if (!window.reactionService) return;

        const result = await window.reactionService.toggleDislike(articleId);
        if (result) {
            // Mettre à jour l'interface
            this.updateReactionButton(articleId, 'dislike', result.disliked, result.action === 'added' ? 1 : -1);
            
            // Si une réaction opposée a été supprimée
            if (result.oppositeRemoved) {
                this.updateReactionButton(articleId, 'like', false, -1);
            }
        }
    }

    updateReactionButton(articleId, reactionType, isActive, increment) {
        const button = document.querySelector(`[data-article-id="${articleId}"][data-reaction-type="${reactionType}"]`);
        if (button) {
            const icon = button.querySelector(`.${reactionType}-icon`);
            const count = button.querySelector(`.${reactionType}-count`);
            
            if (icon) {
                if (reactionType === 'like') {
                    icon.textContent = isActive ? '❤️' : '🤍';
                } else if (reactionType === 'dislike') {
                    icon.textContent = isActive ? '👎' : '👎🏻';
                }
            }
            
            if (count) {
                const currentCount = parseInt(count.textContent) || 0;
                count.textContent = Math.max(0, currentCount + increment);
            }
            
            button.classList.toggle(reactionType === 'like' ? 'liked' : 'disliked', isActive);
        }
    }

    // Wrapper pour compatibilité
    updateLikeButton(articleId, liked, increment) {
        this.updateReactionButton(articleId, 'like', liked, increment);
    }

    async toggleComments(articleId) {
        const section = document.getElementById(`comments-section-${articleId}`);
        if (!section) return;

        if (section.style.display === 'none') {
            section.style.display = 'block';
            // Charger les commentaires si pas encore fait
            const commentsList = document.getElementById(`comments-${articleId}`);
            if (commentsList && window.commentService) {
                await window.commentService.loadCommentsInContainer(articleId, commentsList);
            }
        } else {
            section.style.display = 'none';
        }
    }

    async submitComment(event, articleId) {
        event.preventDefault();
        
        if (!window.commentService) return;

        const textarea = document.getElementById(`comment-input-${articleId}`);
        const content = textarea.value.trim();
        
        if (!content) return;

        const success = await window.commentService.addComment(articleId, content);
        if (success) {
            textarea.value = '';
            // Mettre à jour le compteur de caractères
            const charCount = document.getElementById(`char-count-${articleId}`);
            if (charCount) {
                charCount.textContent = '0/500';
                charCount.style.color = 'var(--text-muted)';
            }
            
            // Rafraîchir les commentaires
            const commentsList = document.getElementById(`comments-${articleId}`);
            if (commentsList) {
                await window.commentService.loadCommentsInContainer(articleId, commentsList);
                
                // Mettre à jour le compteur de commentaires
                this.updateCommentsCount(articleId, 1);
            }
        }
    }

    updateCommentsCount(articleId, increment) {
        const button = document.querySelector(`[onclick="articleService.toggleComments('${articleId}')"] .comment-count`);
        if (button) {
            const currentCount = parseInt(button.textContent) || 0;
            button.textContent = Math.max(0, currentCount + increment);
        }
    }

    async showReactionsList(articleId, reactionType = 'like') {
        if (!window.reactionService) return;

        try {
            const reactions = reactionType === 'like' 
                ? await window.reactionService.getLikesList(articleId)
                : await window.reactionService.getDislikesList(articleId);
            
            this.displayReactionsModal(articleId, reactions, reactionType);
        } catch (error) {
            console.error(`Erreur lors de la récupération de la liste des ${reactionType}s:`, error);
            NotificationService.error(`Erreur lors de la récupération de la liste des ${reactionType}s`);
        }
    }

    // Wrapper pour compatibilité
    async showLikesList(articleId) {
        return await this.showReactionsList(articleId, 'like');
    }

    displayReactionsModal(articleId, reactions, reactionType) {
        const modalId = `${reactionType}sModal`;
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const title = reactionType === 'like' ? 'Personnes qui ont aimé cet article' : 'Personnes qui n\'ont pas aimé cet article';
        const emptyMessage = reactionType === 'like' ? 'Aucun like pour le moment' : 'Aucun dislike pour le moment';
        const icon = reactionType === 'like' ? '❤️' : '👎';

        modal.innerHTML = `
            <div class="modal-content">
                <h2>${icon} ${title}</h2>
                <div class="reactions-list">
                    ${reactions.length === 0 ? 
                        `<p class="no-reactions">${emptyMessage}</p>` : 
                        reactions.map(reaction => `
                            <div class="reaction-item">
                                <span class="reaction-user">${this.escapeHtml(reaction.userEmail)}</span>
                                <span class="reaction-date">${this.formatDate(reaction.createdAt)}</span>
                            </div>
                        `).join('')
                    }
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary" data-close-modal="${modalId}">Fermer</button>
                </div>
            </div>
        `;

        ModalService.open(modalId);
    }

    // Wrapper pour compatibilité
    displayLikesModal(articleId, likes) {
        this.displayReactionsModal(articleId, likes, 'like');
    }
}

// Instance singleton
const articleService = new ArticleService();
window.articleService = articleService;