// ========================================
// MODULE PRINCIPAL DE L'APPLICATION
// ========================================

class BlogApp {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initialisation de l\'application...');
            
            // Vérifier que Firebase est chargé
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase n\'est pas chargé');
            }

            // Vérifier que la config Firebase est disponible
            if (typeof firebaseConfig === 'undefined') {
                throw new Error('Configuration Firebase manquante');
            }

            // Initialiser Firebase
            window.firebaseService.init(firebaseConfig);
            
            // Initialiser les services
            window.authService.init(window.firebaseService);
            window.articleService.init(window.firebaseService);
            
            // Configurer les event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Application initialisée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            NotificationService.error('Erreur lors de l\'initialisation de l\'application');
        }
    }

    setupEventListeners() {
        // Event listeners pour l'authentification
        this.setupAuthListeners();
        
        // Event listeners pour les articles
        this.setupArticleListeners();
        
        // Event listeners pour les modales
        this.setupModalListeners();
    }

    setupAuthListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => ModalService.open('loginModal'));
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => ModalService.open('registerModal'));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
                    window.authService.logout();
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e);
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(e);
            });
        }
    }

    setupArticleListeners() {
        const newArticleBtn = document.getElementById('newArticleBtn');
        const articleForm = document.getElementById('articleForm');

        if (newArticleBtn) {
            newArticleBtn.addEventListener('click', () => {
                window.articleService.resetForm();
                ModalService.open('articleModal');
            });
        }

        if (articleForm) {
            articleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleArticleSubmit(e);
            });
        }
    }

    setupModalListeners() {
        // Ajouter des listeners pour fermer les modales
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-close-modal]')) {
                const modalId = e.target.getAttribute('data-close-modal');
                ModalService.close(modalId);
            }
        });
    }

    async handleLogin(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email') || document.getElementById('loginEmail').value;
        const password = formData.get('password') || document.getElementById('loginPassword').value;

        const success = await window.authService.login(email, password);
        if (success) {
            ModalService.close('loginModal');
            e.target.reset();
        }
    }

    async handleRegister(e) {
        const formData = new FormData(e.target);
        const name = formData.get('name') || document.getElementById('registerName').value;
        const email = formData.get('email') || document.getElementById('registerEmail').value;
        const password = formData.get('password') || document.getElementById('registerPassword').value;

        const success = await window.authService.register(name, email, password);
        if (success) {
            ModalService.close('registerModal');
            e.target.reset();
        }
    }

    async handleArticleSubmit(e) {
        const formData = {
            title: document.getElementById('articleTitle').value,
            content: document.getElementById('articleContent').value,
            published: document.getElementById('articlePublished').checked
        };

        const success = await window.articleService.submitArticle(formData);
        if (success) {
            ModalService.close('articleModal');
            e.target.reset();
        }
    }
}

// Initialisation de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new BlogApp();
    app.init();
});

// Export pour usage global
window.BlogApp = BlogApp;