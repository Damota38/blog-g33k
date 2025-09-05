// ========================================
// SERVICE DE NOTIFICATIONS
// ========================================

class NotificationService {
    static show(message, type = 'info', duration = 5000) {
        let messageElement = document.getElementById('messageContainer');
        
        if (!messageElement) {
            messageElement = this.createMessageContainer();
        }
        
        messageElement.textContent = message;
        messageElement.className = `message message-${type}`;
        messageElement.style.display = 'block';
        
        // Auto-hide après duration
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }

    static createMessageContainer() {
        const messageElement = document.createElement('div');
        messageElement.id = 'messageContainer';
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(messageElement);
        
        // Animation d'entrée
        setTimeout(() => {
            messageElement.style.transform = 'translateX(0)';
        }, 10);
        
        return messageElement;
    }

    static success(message, duration = 5000) {
        this.show(message, 'success', duration);
    }

    static error(message, duration = 7000) {
        this.show(message, 'error', duration);
    }

    static info(message, duration = 5000) {
        this.show(message, 'info', duration);
    }

    static warning(message, duration = 6000) {
        this.show(message, 'warning', duration);
    }
}

window.NotificationService = NotificationService;