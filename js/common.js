const DialogManager = {
    prevFocusedElement: null,

    init: function() {
        document.addEventListener('click', (event) => {
            const closeBtn = event.target.closest('[data-dialog-close]');
            if (closeBtn) {
                const dialog = closeBtn.closest('.dialog-overlay');
                this.close(dialog);
            }
            if (event.target.classList.contains('dialog-overlay')) {
                this.close(event.target);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const openedDialog = document.querySelector('.dialog-overlay.open');
                if (openedDialog) {
                    this.close(openedDialog);
                }
            }
        });
    },

    /**
     * @param {HTMLElement} dialog - Dialog element to open
     */
    open: function(dialog) {
        if (!dialog) return;

        this.prevFocusedElement = document.activeElement;

        dialog.classList.add('open');

        setTimeout(() => {
            const title = dialog.querySelector('h2[tabindex="-1"]');
            const focusableElements = this.getFocusableElements(dialog);
            if (title) {
                title.focus();
            }
            else if (focusableElements.length > 0) {
                focusableElements[0].focus();
            } else {
                dialog.setAttribute('tabindex', '-1');
                dialog.focus();
            }
        }, 50);

        dialog.addEventListener('keydown', this.handleTrapFocus);
        dialog.dispatchEvent(new CustomEvent('dialog-opened'));
    },

    /**
     * @param {HTMLElement} dialog - Dialog element to close
     */
    close: function(dialog) {
        if (!dialog) return;

        dialog.classList.remove('open');

        dialog.removeEventListener('keydown', this.handleTrapFocus);
        if (this.prevFocusedElement) {
            this.prevFocusedElement.focus();
            this.prevFocusedElement = null;
        }
        dialog.dispatchEvent(new CustomEvent('dialog-closed'));
    },

    /**
     * @param {HTMLElement} dialog - Dialog element to return internal focusable elements
     */
    getFocusableElements: function(dialog) {
        return dialog.querySelectorAll(
            'button:not([tabindex="-1"]):not([disabled]), ' +
            '[href]:not([tabindex="-1"]), ' +
            'input:not([tabindex="-1"]):not([disabled]), ' +
            'select:not([tabindex="-1"]):not([disabled]), ' +
            'textarea:not([tabindex="-1"]):not([disabled]), ' +
            '[tabindex]:not([tabindex="-1"]):not([disabled])'
        );
    },

    handleTrapFocus: function(event) {
        let key = event.key || (event.keyCode !== undefined ? String.fromCharCode(event.keyCode) : '');
        if (key !== 'Tab') return;

        const dialog = event.currentTarget;
        const focusableElements = DialogManager.getFocusableElements(dialog);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (focusableElements.length === 0) {
            event.preventDefault();
            return;
        }

        if (event.shiftKey) {  // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }
};


const SettingsManager = {
    prevTheme: null,
    systemMediaQueryDark: window.matchMedia('(prefers-color-scheme: dark)'),

    init: function() {
        this.bindEvents();
        this.systemMediaQueryDark.addEventListener('change', () => {
            if (this.getCurrentTheme() === 'auto' && !this.isHighContrast()) {
                this.applyThemeToDOM('auto');
            }
        });
        this.applySavedSettings();
    },

    getCurrentTheme: function() {
        return localStorage.getItem('theme') || 'auto';
    },

    isHighContrast: function() {
        return localStorage.getItem('highContrast') === 'true';
    },

    applySavedSettings: function() {
        if (this.isHighContrast()) {
            this.setHighContrast(true);
        } else {
            this.setTheme(this.getCurrentTheme());
        }
    },

    bindEvents: function() {
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (this.isHighContrast()) {
                    this.setHighContrast(false); 
                    showToast('고대비 모드가 해제되었습니다.', 1500);
                }
                this.setTheme(event.target.value);
            });
        });

        const hcToggle = document.getElementById('high-contrast-toggle');
        if (hcToggle) {
            hcToggle.addEventListener('change', (event) => {
                this.setHighContrast(event.target.checked);
            });
        }
    },

    /**
     * @param {string} theme - Select a theme: 'auto', 'light', or 'dark'
     */
    setTheme: function(theme) {
        localStorage.setItem('theme', theme);
        this.updateThemeUI(theme);
        this.applyThemeToDOM(theme);
    },

    updateThemeUI: function(theme) {
        const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (themeRadio) themeRadio.checked = true;
    },

    applyThemeToDOM: function(theme) {
        if (theme === 'auto') {
            theme = this.systemMediaQueryDark.matches ? 'dark' : 'light';
        }
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    },

    /**
     * @param {boolean} enabled - Whether to enable High Contrast mode
     */
    setHighContrast: function(enabled) {
        const hcToggle = document.getElementById('high-contrast-toggle');

        if (enabled) {
            this.prevTheme = this.getCurrentTheme();

            document.documentElement.setAttribute('data-high-contrast', 'true');
            localStorage.setItem('highContrast', 'true');
            if (hcToggle) hcToggle.checked = true;

            this.updateThemeUI('dark');
            this.applyThemeToDOM('dark');
        } else {
            document.documentElement.removeAttribute('data-high-contrast');
            localStorage.setItem('highContrast', 'false');
            if (hcToggle) hcToggle.checked = false;

            const themeToRestore = this.prevTheme || this.getCurrentTheme();
            this.updateThemeUI(themeToRestore);
            this.applyThemeToDOM(themeToRestore);

            this.prevTheme = null;
        }
    }
};


/**
 * @param {string} message - Message text to display
 * @param {number|null} duration - Duration the message is shown (in milliseconds, default is null)
 */
function showToast(message, duration = null) {
    let toast = document.querySelector('.toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-msg';
        document.body.appendChild(toast);
    }

    if (!message) {
        toast.classList.remove('show');
        return;
    }

    toast.textContent = message;

    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
        toast.hideTimeout = null;
    }

    void toast.offsetWidth;  // Force a reflow by accessing an offset property

    toast.classList.add('show');

    if (duration && duration > 0) {
        toast.hideTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    DialogManager.init();
    SettingsManager.init();

    const settingsBtn = document.getElementById('settings-btn');
    const settingsDialog = document.getElementById('settings-dialog');

    if (settingsBtn && settingsDialog) {
        settingsBtn.addEventListener('click', (event) => {
            event.preventDefault();
            DialogManager.open(settingsDialog);
        });
    }
});