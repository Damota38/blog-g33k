// ========================================
// SERVICE DE GESTION DES COMMENTAIRES
// ========================================

class CommentService {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.commentsCache = new Map();
    }

    init(firebaseService) {
        this.db = firebaseService.getFirestore();
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    // Ajouter un commentaire
    async addComment(articleId, content) {
        if (!this.currentUser) {
            NotificationService.warning('Vous devez être connecté pour commenter');
            return false;
        }

        if (!content || content.trim().length === 0) {
            NotificationService.warning('Le commentaire ne peut pas être vide');
            return false;
        }

        if (content.trim().length > 500) {
            NotificationService.warning('Le commentaire ne peut pas dépasser 500 caractères');
            return false;
        }

        try {
            const commentData = {
                articleId: articleId,
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                content: content.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('comments').add(commentData);
            
            // Invalider le cache pour cet article
            this.commentsCache.delete(articleId);
            
            NotificationService.success('Commentaire ajouté avec succès');
            return docRef.id;
        } catch (error) {
            console.error('Erreur lors de l\'ajout du commentaire:', error);
            NotificationService.error('Erreur lors de l\'ajout du commentaire');
            return false;
        }
    }

    // Récupérer les commentaires d'un article
    async getComments(articleId, limit = 10) {
        // Vérifier le cache
        const cacheKey = `${articleId}_${limit}`;
        if (this.commentsCache.has(cacheKey)) {
            return this.commentsCache.get(cacheKey);
        }

        try {
            const snapshot = await this.db.collection('comments')
                .where('articleId', '==', articleId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const comments = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                comments.push({
                    id: doc.id,
                    ...data,
                    canEdit: this.currentUser && (
                        data.userId === this.currentUser.uid || 
                        window.authService?.isUserAdmin()
                    )
                });
            });

            // Mettre en cache
            this.commentsCache.set(cacheKey, comments);
            return comments;
        } catch (error) {
            console.error('Erreur lors de la récupération des commentaires:', error);
            return [];
        }
    }

    // Compter les commentaires d'un article
    async getCommentsCount(articleId) {
        try {
            const snapshot = await this.db.collection('comments')
                .where('articleId', '==', articleId)
                .get();
            
            return snapshot.size;
        } catch (error) {
            console.error('Erreur lors du comptage des commentaires:', error);
            return 0;
        }
    }

    // Modifier un commentaire
    async editComment(commentId, newContent) {
        if (!this.currentUser) {
            NotificationService.warning('Vous devez être connecté pour modifier un commentaire');
            return false;
        }

        if (!newContent || newContent.trim().length === 0) {
            NotificationService.warning('Le commentaire ne peut pas être vide');
            return false;
        }

        if (newContent.trim().length > 500) {
            NotificationService.warning('Le commentaire ne peut pas dépasser 500 caractères');
            return false;
        }

        try {
            await this.db.collection('comments').doc(commentId).update({
                content: newContent.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Nettoyer le cache
            this.commentsCache.clear();
            
            NotificationService.success('Commentaire modifié avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de la modification du commentaire:', error);
            NotificationService.error('Erreur lors de la modification du commentaire');
            return false;
        }
    }

    // Supprimer un commentaire
    async deleteComment(commentId, articleId) {
        if (!this.currentUser) {
            NotificationService.warning('Vous devez être connecté pour supprimer un commentaire');
            return false;
        }

        if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
            return false;
        }

        try {
            await this.db.collection('comments').doc(commentId).delete();
            
            // Nettoyer le cache
            this.commentsCache.clear();
            
            NotificationService.success('Commentaire supprimé avec succès');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du commentaire:', error);
            NotificationService.error('Erreur lors de la suppression du commentaire');
            return false;
        }
    }

    // Créer l'élément HTML d'un commentaire
    createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.dataset.commentId = comment.id;

        const formatDate = (timestamp) => {
            if (!timestamp) return 'Date inconnue';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const isEdited = comment.updatedAt && comment.createdAt && 
            comment.updatedAt.toMillis() !== comment.createdAt.toMillis();

        commentDiv.innerHTML = `
            <div class="comment-header">
                <div class="comment-author">
                    <strong>${this.escapeHtml(comment.userEmail)}</strong>
                    <span class="comment-date">
                        ${formatDate(comment.createdAt)}
                        ${isEdited ? '<span class="edited-label">(modifié)</span>' : ''}
                    </span>
                </div>
                ${comment.canEdit ? `
                    <div class="comment-actions">
                        <button onclick="commentService.openEditModal('${comment.id}', '${comment.articleId}', \`${this.escapeHtml(comment.content)}\`)" 
                                class="btn-edit-comment" title="Modifier">✏️</button>
                        <button onclick="commentService.deleteCommentAndRefresh('${comment.id}', '${comment.articleId}')" 
                                class="btn-delete-comment" title="Supprimer">🗑️</button>
                    </div>
                ` : ''}
            </div>
            <div class="comment-content">
                <p>${this.escapeHtml(comment.content)}</p>
            </div>
        `;

        return commentDiv;
    }

    // Ouvrir la modal d'édition de commentaire
    openEditModal(commentId, articleId, currentContent) {
        const modal = document.getElementById('editCommentModal');
        if (!modal) {
            this.createEditCommentModal();
        }

        document.getElementById('editCommentId').value = commentId;
        document.getElementById('editCommentArticleId').value = articleId;
        document.getElementById('editCommentContent').value = currentContent;
        
        ModalService.open('editCommentModal');
    }

    // Supprimer et rafraîchir
    async deleteCommentAndRefresh(commentId, articleId) {
        const success = await this.deleteComment(commentId, articleId);
        if (success) {
            // Rafraîchir les commentaires
            this.refreshCommentsDisplay(articleId);
        }
    }

    // Rafraîchir l'affichage des commentaires
    async refreshCommentsDisplay(articleId) {
        const commentsContainer = document.getElementById(`comments-${articleId}`);
        if (commentsContainer) {
            await this.loadCommentsInContainer(articleId, commentsContainer);
        }
    }

    // Charger les commentaires dans un container
    async loadCommentsInContainer(articleId, container) {
        try {
            container.innerHTML = '<div class="loading-comments">Chargement des commentaires...</div>';
            
            const comments = await this.getComments(articleId);
            container.innerHTML = '';

            if (comments.length === 0) {
                container.innerHTML = '<div class="no-comments">Aucun commentaire pour le moment.</div>';
                return;
            }

            comments.forEach(comment => {
                const commentElement = this.createCommentElement(comment);
                container.appendChild(commentElement);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des commentaires:', error);
            container.innerHTML = '<div class="error-comments">Erreur lors du chargement des commentaires</div>';
        }
    }

    // Échapper le HTML pour la sécurité
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Nettoyer le cache
    clearCache() {
        this.commentsCache.clear();
    }

    // Créer la modal d'édition de commentaire
    createEditCommentModal() {
        const modal = document.createElement('div');
        modal.id = 'editCommentModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Modifier le commentaire</h2>
                <form id="editCommentForm">
                    <input type="hidden" id="editCommentId">
                    <input type="hidden" id="editCommentArticleId">
                    <div class="form-group">
                        <label>Commentaire</label>
                        <textarea id="editCommentContent" required maxlength="500" placeholder="Votre commentaire..."></textarea>
                        <small class="char-count">0/500 caractères</small>
                    </div>
                    <div class="form-group flex gap-md">
                        <button type="submit" class="btn btn-primary">Modifier</button>
                        <button type="button" class="btn btn-secondary" data-close-modal="editCommentModal">Annuler</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Gestion du compteur de caractères
        const textarea = modal.querySelector('#editCommentContent');
        const charCount = modal.querySelector('.char-count');
        textarea.addEventListener('input', () => {
            const count = textarea.value.length;
            charCount.textContent = `${count}/500 caractères`;
            charCount.style.color = count > 500 ? 'var(--danger-color)' : 'var(--text-muted)';
        });

        // Gestion du formulaire d'édition
        modal.querySelector('#editCommentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const commentId = document.getElementById('editCommentId').value;
            const articleId = document.getElementById('editCommentArticleId').value;
            const content = document.getElementById('editCommentContent').value;
            
            const success = await this.editComment(commentId, content);
            if (success) {
                ModalService.close('editCommentModal');
                this.refreshCommentsDisplay(articleId);
            }
        });
    }
}

// Instance singleton
const commentService = new CommentService();
window.commentService = commentService;