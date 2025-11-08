// wwwroot/js/auth.js
// Authentication manager for Smart Energy Meter

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.username = null;
        this.initPromise = this.init();
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // Check authentication status
        this.checkAuth();

        // Only proceed if authenticated
        if (this.isAuthenticated) {
            // Add logout functionality
            this.setupLogout();

            // Monitor session
            this.monitorSession();
        }
    }

    checkAuth() {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        const rememberLogin = localStorage.getItem('rememberLogin');

        // Check if user is authenticated
        if (isLoggedIn === 'true' || rememberLogin === 'true') {
            this.isAuthenticated = true;
            this.username = sessionStorage.getItem('username') ||
                localStorage.getItem('rememberedUsername');

            // Update UI with username if element exists
            setTimeout(() => this.updateUserDisplay(), 100);

            console.log('✅ User authenticated:', this.username);
        } else {
            // Redirect to login page
            console.log('❌ Not authenticated, redirecting to login');
            this.redirectToLogin();
        }
    }

    updateUserDisplay() {
        // Add username to header if not already present
        const header = document.querySelector('.header-content');
        if (header && this.username && !document.getElementById('user-display')) {
            const userDisplay = document.createElement('div');
            userDisplay.id = 'user-display';
            userDisplay.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                margin-left: auto;
                margin-right: 10px;
                color: var(--text-primary);
                font-size: 14px;
            `;
            userDisplay.innerHTML = `
                <i class="fas fa-user-circle" style="font-size: 20px; color: var(--primary-color);"></i>
                <span>${this.username}</span>
                <button id="logout-btn" class="action-btn" style="
                    background: transparent;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-left: 10px;
                    color: var(--text-primary);
                    transition: all 0.2s ease;
                " title="Logout">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            `;

            const headerActions = header.querySelector('.header-actions');
            if (headerActions) {
                header.insertBefore(userDisplay, headerActions);

                // Add logout event listener
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => this.logout());

                    // Add hover effect
                    logoutBtn.addEventListener('mouseenter', function () {
                        this.style.background = 'var(--danger-color)';
                        this.style.color = 'white';
                        this.style.borderColor = 'var(--danger-color)';
                    });
                    logoutBtn.addEventListener('mouseleave', function () {
                        this.style.background = 'transparent';
                        this.style.color = 'var(--text-primary)';
                        this.style.borderColor = 'var(--border-color)';
                    });
                }

                console.log('✅ User display added to header');
            }
        }
    }

    setupLogout() {
        // Listen for logout events
        window.addEventListener('logout', () => {
            this.logout();
        });
    }

    logout() {
        // Clear session
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('loginTime');

        // Optionally clear remember me
        const confirmClearRemember = confirm('Do you want to forget this device and require login next time?');
        if (confirmClearRemember) {
            localStorage.removeItem('rememberLogin');
            localStorage.removeItem('rememberedUsername');
        }

        console.log('👋 User logged out');

        // Redirect to login
        this.redirectToLogin();
    }

    redirectToLogin() {
        // Save current page for redirect after login (optional)
        const currentPage = window.location.pathname;
        if (currentPage !== '/login.html' && currentPage !== '/' && currentPage !== '/index.html') {
            sessionStorage.setItem('redirectAfterLogin', currentPage);
        }

        // Redirect
        window.location.href = '/login.html';
    }

    monitorSession() {
        // Check session every minute
        setInterval(() => {
            const isLoggedIn = sessionStorage.getItem('isLoggedIn');
            const rememberLogin = localStorage.getItem('rememberLogin');

            if (isLoggedIn !== 'true' && rememberLogin !== 'true') {
                console.log('⚠️ Session expired');
                this.redirectToLogin();
            }
        }, 60000); // Check every minute

        // Session timeout after 8 hours of inactivity
        let lastActivity = Date.now();
        const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

        const resetActivity = () => {
            lastActivity = Date.now();
        };

        // Track user activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetActivity, { passive: true });
        });

        // Check for timeout
        setInterval(() => {
            const inactiveTime = Date.now() - lastActivity;
            if (inactiveTime > SESSION_TIMEOUT && !localStorage.getItem('rememberLogin')) {
                alert('Session expired due to inactivity. Please login again.');
                this.logout();
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    // Get current user info
    getUserInfo() {
        return {
            username: this.username,
            isAuthenticated: this.isAuthenticated,
            loginTime: sessionStorage.getItem('loginTime')
        };
    }
}

// Initialize authentication check
try {
    const authManager = new AuthManager();
    window.authManager = authManager;
    console.log('✅ Auth manager initialized');
} catch (error) {
    console.error('❌ Auth manager initialization failed:', error);
    // Don't block other scripts from loading
}