// ========================================
// SERVICE DE GESTION DES LIKES ET RÉACTIONS
// ========================================

class ReactionService {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.likesCache = new Map(); // Cache pour optimiser les performances
        this.dislikesCache = new Map(); // Cache pour les dislikes
    }

    init(firebaseService) {
        this.db = firebaseService.getFirestore();
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    // Générer un ID unique pour la réaction
    generateReactionId(articleId, userId, type = 'like') {
        return `${articleId}_${userId}_${type}`;
    }

    // Ajouter ou retirer une réaction (like/dislike)
    async toggleReaction(articleId, reactionType = 'like') {
        if (!this.currentUser) {
            NotificationService.warning(`Vous devez être connecté pour ${reactionType === 'like' ? 'aimer' : 'ne pas aimer'} un article`);
            return false;
        }

        try {
            const reactionId = this.generateReactionId(articleId, this.currentUser.uid, reactionType);
            const reactionRef = this.db.collection('reactions').doc(reactionId);
            const reactionDoc = await reactionRef.get();

            // Vérifier s'il y a une réaction opposée à supprimer
            const oppositeType = reactionType === 'like' ? 'dislike' : 'like';
            const oppositeReactionId = this.generateReactionId(articleId, this.currentUser.uid, oppositeType);
            const oppositeReactionRef = this.db.collection('reactions').doc(oppositeReactionId);
            const oppositeReactionDoc = await oppositeReactionRef.get();

            if (reactionDoc.exists) {
                // Retirer la réaction actuelle
                await reactionRef.delete();
                this.updateReactionCache(articleId, reactionType, -1);
                return { 
                    action: 'removed', 
                    type: reactionType,
                    [reactionType === 'like' ? 'liked' : 'disliked']: false 
                };
            } else {
                // Supprimer la réaction opposée si elle existe
                if (oppositeReactionDoc.exists) {
                    await oppositeReactionRef.delete();
                    this.updateReactionCache(articleId, oppositeType, -1);
                }

                // Ajouter la nouvelle réaction
                await reactionRef.set({
                    articleId: articleId,
                    userId: this.currentUser.uid,
                    userEmail: this.currentUser.email,
                    type: reactionType,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                this.updateReactionCache(articleId, reactionType, 1);
                return { 
                    action: 'added', 
                    type: reactionType,
                    [reactionType === 'like' ? 'liked' : 'disliked']: true,
                    oppositeRemoved: oppositeReactionDoc.exists
                };
            }
        } catch (error) {
            console.error(`Erreur lors du toggle ${reactionType}:`, error);
            NotificationService.error(`Erreur lors de la gestion du ${reactionType}`);
            return false;
        }
    }

    // Wrapper pour les likes (compatibilité)
    async toggleLike(articleId) {
        return await this.toggleReaction(articleId, 'like');
    }

    // Nouvelle fonction pour les dislikes
    async toggleDislike(articleId) {
        return await this.toggleReaction(articleId, 'dislike');
    }

    // Compter les réactions d'un article (générique)
    async getReactionsCount(articleId, type = 'like') {
        const cache = type === 'like' ? this.likesCache : this.dislikesCache;
        
        // Vérifier le cache d'abord
        if (cache.has(articleId)) {
            return cache.get(articleId);
        }

        try {
            const snapshot = await this.db.collection('reactions')
                .where('articleId', '==', articleId)
                .where('type', '==', type)
                .get();

            const count = snapshot.size;
            cache.set(articleId, count);
            return count;
        } catch (error) {
            console.error(`Erreur lors du comptage des ${type}s:`, error);
            return 0;
        }
    }

    // Compter les likes d'un article (wrapper pour compatibilité)
    async getLikesCount(articleId) {
        return await this.getReactionsCount(articleId, 'like');
    }

    // Compter les dislikes d'un article
    async getDislikesCount(articleId) {
        return await this.getReactionsCount(articleId, 'dislike');
    }

    // Vérifier si l'utilisateur a une réaction spécifique
    async hasUserReacted(articleId, type = 'like') {
        if (!this.currentUser) return false;

        try {
            const reactionId = this.generateReactionId(articleId, this.currentUser.uid, type);
            const reactionDoc = await this.db.collection('reactions').doc(reactionId).get();
            return reactionDoc.exists;
        } catch (error) {
            console.error(`Erreur lors de la vérification du ${type}:`, error);
            return false;
        }
    }

    // Vérifier si l'utilisateur actuel a liké l'article (wrapper)
    async hasUserLiked(articleId) {
        return await this.hasUserReacted(articleId, 'like');
    }

    // Vérifier si l'utilisateur actuel a disliké l'article
    async hasUserDisliked(articleId) {
        return await this.hasUserReacted(articleId, 'dislike');
    }

    // Obtenir les données complètes de réaction pour un article
    async getArticleReactionData(articleId) {
        try {
            const [likesCount, dislikesCount, userLiked, userDisliked] = await Promise.all([
                this.getLikesCount(articleId),
                this.getDislikesCount(articleId),
                this.hasUserLiked(articleId),
                this.hasUserDisliked(articleId)
            ]);

            return {
                likesCount,
                dislikesCount,
                userLiked,
                userDisliked
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des données de réaction:', error);
            return {
                likesCount: 0,
                dislikesCount: 0,
                userLiked: false,
                userDisliked: false
            };
        }
    }

    // Mettre à jour le cache des réactions (générique)
    updateReactionCache(articleId, type, increment) {
        const cache = type === 'like' ? this.likesCache : this.dislikesCache;
        const currentCount = cache.get(articleId) || 0;
        cache.set(articleId, Math.max(0, currentCount + increment));
    }

    // Mettre à jour le cache des likes (wrapper pour compatibilité)
    updateLikesCache(articleId, increment) {
        this.updateReactionCache(articleId, 'like', increment);
    }

    // Obtenir la liste des utilisateurs qui ont liké un article
    async getLikesList(articleId) {
        try {
            const snapshot = await this.db.collection('reactions')
                .where('articleId', '==', articleId)
                .where('type', '==', 'like')
                .orderBy('createdAt', 'desc')
                .get();

            const likes = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                likes.push({
                    id: doc.id,
                    userEmail: data.userEmail,
                    createdAt: data.createdAt
                });
            });

            return likes;
        } catch (error) {
            console.error('Erreur lors de la récupération de la liste des likes:', error);
            return [];
        }
    }

    // Obtenir la liste des utilisateurs qui ont disliké un article
    async getDislikesList(articleId) {
        try {
            const snapshot = await this.db.collection('reactions')
                .where('articleId', '==', articleId)
                .where('type', '==', 'dislike')
                .orderBy('createdAt', 'desc')
                .get();

            const dislikes = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                dislikes.push({
                    id: doc.id,
                    userEmail: data.userEmail,
                    createdAt: data.createdAt
                });
            });

            return dislikes;
        } catch (error) {
            console.error('Erreur lors de la récupération de la liste des dislikes:', error);
            return [];
        }
    }

    // Nettoyer le cache (utile lors de la déconnexion)
    clearCache() {
        this.likesCache.clear();
        this.dislikesCache.clear();
    }
}

// Instance singleton
const reactionService = new ReactionService();
window.reactionService = reactionService;