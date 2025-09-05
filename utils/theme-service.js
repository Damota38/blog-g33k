// ========================================
// SERVICE DE GESTION DU THÈME
// ========================================

class ThemeService {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createThemeToggle();
    }

    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    setStoredTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    applyTheme(theme) {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${theme}-mode`);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
    }

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.updateToggleButton();
    }

    createThemeToggle() {
        const existingToggle = document.getElementById('themeToggle');
        if (existingToggle) return;

        const toggle = document.createElement('button');
        toggle.id = 'themeToggle';
        toggle.className = 'theme-toggle';
        toggle.innerHTML = this.getToggleIcon();
        toggle.setAttribute('aria-label', 'Changer le thème');
        toggle.addEventListener('click', () => this.toggle());

        // Ajouter le bouton dans le header
        const authSection = document.querySelector('.auth-section');
        if (authSection) {
            authSection.prepend(toggle);
        }
    }

    updateToggleButton() {
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = this.getToggleIcon();
        }
    }

    getToggleIcon() {
        return this.currentTheme === 'light' ? '🌙' : '☀️';
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    isDarkMode() {
        return this.currentTheme === 'dark';
    }
}

// Initialisation automatique
const themeService = new ThemeService();
window.themeService = themeService;