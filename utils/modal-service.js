// ========================================
// SERVICE DE GESTION DES MODALES
// ========================================

class ModalService {
    static open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            
            // Ajouter listener pour fermer avec Escape
            document.addEventListener('keydown', this.handleKeyDown);
            
            // Ajouter listener pour fermer en cliquant à côté
            modal.addEventListener('click', this.handleBackdropClick);
        }
    }

    static close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            // Retirer les listeners
            document.removeEventListener('keydown', this.handleKeyDown);
            modal.removeEventListener('click', this.handleBackdropClick);
        }
    }

    static handleKeyDown(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                ModalService.close(openModal.id);
            }
        }
    }

    static handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            ModalService.close(e.target.id);
        }
    }

    static closeAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                ModalService.close(modal.id);
            }
        });
    }
}

window.ModalService = ModalService;