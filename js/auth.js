// ========================================
// MODULE D'AUTHENTIFICATION
// ========================================

class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.auth = null;
        this.db = null;
    }

    init(firebaseService) {
        this.auth = firebaseService.getAuth();
        this.db = firebaseService.getFirestore();
        
        // Observer d'authentification
        this.auth.onAuthStateChanged(async (user) => {
            await this.handleAuthStateChange(user);
        });
    }

    async handleAuthStateChange(user) {
        this.currentUser = user;
        
        if (user) {
            console.log('✅ Utilisateur connecté:', user.email);
            await this.loadUserProfile(user);
            this.updateUIForLoggedInUser();
            
            // Mettre à jour les services de réaction et commentaires
            if (window.reactionService) {
                window.reactionService.setCurrentUser(user);
            }
            if (window.commentService) {
                window.commentService.setCurrentUser(user);
            }
        } else {
            console.log('👤 Utilisateur déconnecté');
            this.resetUserState();
            this.updateUIForLoggedOutUser();
            
            // Nettoyer les services
            if (window.reactionService) {
                window.reactionService.setCurrentUser(null);
                window.reactionService.clearCache();
            }
            if (window.commentService) {
                window.commentService.setCurrentUser(null);
                window.commentService.clearCache();
            }
        }
        
        // Déclencher le rechargement des articles
        if (window.articleService) {
            window.articleService.loadArticles();
        }
    }

    async loadUserProfile(user) {
        try {
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.isAdmin = userData.role === 'admin';
                this.updateUserInfo(userData.displayName || user.email);
            } else {
                // Créer le profil si inexistant
                await this.createUserProfile(user);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error);
            NotificationService.show('Erreur lors du chargement du profil', 'error');
        }
    }

    async createUserProfile(user) {
        const userData = {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('users').doc(user.uid).set(userData);
        this.updateUserInfo(userData.displayName);
    }

    updateUserInfo(displayName) {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.textContent = `Bonjour, ${displayName}`;
        }
    }

    updateUIForLoggedInUser() {
        const elements = {
            loginBtn: document.getElementById('loginBtn'),
            registerBtn: document.getElementById('registerBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            adminPanel: document.getElementById('adminPanel')
        };

        if (elements.loginBtn) elements.loginBtn.style.display = 'none';
        if (elements.registerBtn) elements.registerBtn.style.display = 'none';
        if (elements.logoutBtn) elements.logoutBtn.style.display = 'block';
        
        if (this.isAdmin && elements.adminPanel) {
            elements.adminPanel.style.display = 'block';
        }
    }

    updateUIForLoggedOutUser() {
        const elements = {
            userInfo: document.getElementById('userInfo'),
            loginBtn: document.getElementById('loginBtn'),
            registerBtn: document.getElementById('registerBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            adminPanel: document.getElementById('adminPanel')
        };

        if (elements.userInfo) elements.userInfo.textContent = '';
        if (elements.loginBtn) elements.loginBtn.style.display = 'block';
        if (elements.registerBtn) elements.registerBtn.style.display = 'block';
        if (elements.logoutBtn) elements.logoutBtn.style.display = 'none';
        if (elements.adminPanel) elements.adminPanel.style.display = 'none';
    }

    resetUserState() {
        this.currentUser = null;
        this.isAdmin = false;
    }

    async login(email, password) {
        try {
            console.log('🔐 Tentative de connexion...');
            await this.auth.signInWithEmailAndPassword(email, password);
            NotificationService.show('✅ Connexion réussie !', 'success');
            return true;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            const message = this.getErrorMessage(error.code);
            NotificationService.show(message, 'error');
            return false;
        }
    }

    async register(name, email, password) {
        try {
            console.log('📝 Création du compte...');
            
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await user.updateProfile({ displayName: name });
            
            await this.db.collection('users').doc(user.uid).set({
                email: email,
                displayName: name,
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            NotificationService.show('✅ Inscription réussie ! Bienvenue ' + name, 'success');
            return true;
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            const message = this.getErrorMessage(error.code);
            NotificationService.show(message, 'error');
            return false;
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            NotificationService.show('👋 Déconnexion réussie', 'success');
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
            NotificationService.show('Erreur lors de la déconnexion', 'error');
        }
    }

    getErrorMessage(errorCode) {
        const messages = {
            'auth/user-not-found': 'Aucun compte trouvé avec cet email',
            'auth/wrong-password': 'Mot de passe incorrect',
            'auth/invalid-email': 'Email invalide',
            'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
            'auth/email-already-in-use': 'Cet email est déjà utilisé',
            'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères'
        };
        
        return messages[errorCode] || 'Une erreur est survenue';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAdmin() {
        return this.isAdmin;
    }
}

// Instance singleton
const authService = new AuthService();
window.authService = authService;