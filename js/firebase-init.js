// ========================================
// INITIALISATION FIREBASE
// ========================================

class FirebaseService {
    constructor() {
        this.auth = null;
        this.db = null;
        this.storage = null;
        this.initialized = false;
    }

    init(config) {
        try {
            firebase.initializeApp(config);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            this.initialized = true;
            console.log('✅ Firebase initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur d\'initialisation Firebase:', error);
            throw error;
        }
    }

    isInitialized() {
        return this.initialized;
    }

    getAuth() {
        return this.auth;
    }

    getFirestore() {
        return this.db;
    }

    getStorage() {
        return this.storage;
    }
}

// Instance singleton
const firebaseService = new FirebaseService();

// Export pour utilisation globale
window.firebaseService = firebaseService;