// wwwroot/js/pwa.js

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.registration = null;

        this.init();
    }

    async init() {
        console.log('🔧 Initializing PWA Manager');

        // Check if app is already installed
        this.checkInstallStatus();

        // Register service worker
        await this.registerServiceWorker();

        // Setup install prompt
        this.setupInstallPrompt();

        // Setup push notifications (if supported)
        this.setupPushNotifications();

        // Handle app shortcuts
        this.handleAppShortcuts();

        console.log('✅ PWA Manager initialized');
    }

    checkInstallStatus() {
        // Check if app is running in standalone mode (installed)
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');

        console.log('📱 App install status:', this.isInstalled ? 'Installed' : 'Not installed');

        if (this.isInstalled) {
            this.hideInstallBanner();
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', this.registration.scope);

                // Listen for updates
                this.registration.addEventListener('updatefound', () => {
                    const newWorker = this.registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New version available
                                this.showUpdateNotification();
                            }
                        }
                    });
                });

            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        } else {
            console.warn('⚠️ Service Workers not supported');
        }
    }

    setupInstallPrompt() {
        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('💾 Install prompt available');

            // Prevent the default mini-infobar
            e.preventDefault();

            // Save the event for later use
            this.deferredPrompt = e;

            // Show custom install banner
            this.showInstallBanner();
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', (e) => {
            console.log('🎉 PWA was installed');
            this.isInstalled = true;
            this.hideInstallBanner();

            // Track installation analytics
            this.trackInstallation();
        });

        // Setup install button click handler
        const installBtn = document.getElementById('install-btn');
        const closeBanner = document.getElementById('close-banner');

        if (installBtn) {
            installBtn.addEventListener('click', () => {
                this.installApp();
            });
        }

        if (closeBanner) {
            closeBanner.addEventListener('click', () => {
                this.hideInstallBanner();
            });
        }
    }

    showInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner && !this.isInstalled) {
            banner.classList.remove('hidden');

            // Auto-hide after 10 seconds if not interacted with
            setTimeout(() => {
                if (!banner.classList.contains('hidden')) {
                    this.hideInstallBanner();
                }
            }, 10000);
        }
    }

    hideInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }

    async installApp() {
        if (!this.deferredPrompt) {
            console.warn('⚠️ Install prompt not available');
            return;
        }

        try {
            // Show the install prompt
            this.deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            const { outcome } = await this.deferredPrompt.userChoice;

            console.log('👤 User install choice:', outcome);

            if (outcome === 'accepted') {
                console.log('✅ User accepted the install prompt');
            } else {
                console.log('❌ User dismissed the install prompt');
            }

            // Clear the deferred prompt
            this.deferredPrompt = null;
            this.hideInstallBanner();

        } catch (error) {
            console.error('❌ Error during app installation:', error);
        }
    }

    showUpdateNotification() {
        // Create update notification
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <i class="fas fa-download"></i>
                <span>New version available!</span>
                <button id="update-btn" class="btn-primary">Update</button>
                <button id="dismiss-update" class="btn-secondary">Later</button>
            </div>
        `;

        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            border: 1px solid var(--primary-color);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            box-shadow: var(--shadow-medium);
            z-index: 1000;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Handle update button click
        document.getElementById('update-btn').addEventListener('click', () => {
            this.applyUpdate();
        });

        // Handle dismiss button click
        document.getElementById('dismiss-update').addEventListener('click', () => {
            document.body.removeChild(notification);
        });

        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 15000);
    }

    async applyUpdate() {
        if (this.registration && this.registration.waiting) {
            // Tell the waiting service worker to skip waiting
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

            // Reload the page to apply the update
            window.location.reload();
        }
    }

    async setupPushNotifications() {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            console.warn('⚠️ Push notifications not supported');
            return;
        }

        // Check current permission status
        let permission = Notification.permission;

        if (permission === 'default') {
            // Could ask for permission here, but better to do it when user requests it
            console.log('📧 Push notifications permission: default (not requested)');
        } else if (permission === 'granted') {
            console.log('✅ Push notifications permission: granted');
            // Could setup push subscription here
        } else {
            console.log('❌ Push notifications permission: denied');
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('⚠️ Notifications not supported');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('📧 Notification permission:', permission);
            return permission === 'granted';
        } catch (error) {
            console.error('❌ Error requesting notification permission:', error);
            return false;
        }
    }

    showLocalNotification(title, options = {}) {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                ...options
            });

            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            return notification;
        } else {
            console.warn('⚠️ Notification permission not granted');
            return null;
        }
    }

    handleAppShortcuts() {
        // Handle app shortcuts (from manifest.json)
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');

        if (action === 'download' && window.energyMeterApp) {
            // Triggered from download shortcut
            setTimeout(() => {
                window.energyMeterApp.downloadCSV();
            }, 1000);
        }
    }

    trackInstallation() {
        // Track PWA installation for analytics
        // You can integrate with Google Analytics, Firebase, etc.
        console.log('📊 Tracking PWA installation');

        // Example: Send to analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install', {
                event_category: 'engagement',
                event_label: 'Smart Energy Meter PWA'
            });
        }
    }

    // Check if device supports PWA features
    checkPWASupport() {
        const features = {
            serviceWorker: 'serviceWorker' in navigator,
            pushNotifications: 'Notification' in window && 'serviceWorker' in navigator,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            webShare: 'share' in navigator,
            installPrompt: true, // Will be set to false if beforeinstallprompt never fires
            persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
            deviceMemory: 'deviceMemory' in navigator,
            networkInformation: 'connection' in navigator
        };

        console.log('🔍 PWA Feature Support:', features);
        return features;
    }

    // Request persistent storage
    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const persistent = await navigator.storage.persist();
                console.log('💾 Persistent storage:', persistent ? 'granted' : 'denied');
                return persistent;
            } catch (error) {
                console.error('❌ Error requesting persistent storage:', error);
                return false;
            }
        }
        return false;
    }

    // Get storage usage information
    async getStorageInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                const used = (estimate.usage / 1024 / 1024).toFixed(2);
                const quota = (estimate.quota / 1024 / 1024).toFixed(2);
                const percentage = ((estimate.usage / estimate.quota) * 100).toFixed(1);

                console.log('💾 Storage Info:');
                console.log(`- Used: ${used} MB`);
                console.log(`- Quota: ${quota} MB`);
                console.log(`- Usage: ${percentage}%`);

                return { used, quota, percentage };
            } catch (error) {
                console.error('❌ Error getting storage info:', error);
                return null;
            }
        }
        return null;
    }

    // Handle network status changes
    setupNetworkMonitoring() {
        if ('connection' in navigator) {
            const connection = navigator.connection;

            const updateNetworkStatus = () => {
                console.log('📶 Network Info:');
                console.log(`- Type: ${connection.effectiveType}`);
                console.log(`- Downlink: ${connection.downlink} Mbps`);
                console.log(`- RTT: ${connection.rtt} ms`);
                console.log(`- Save Data: ${connection.saveData}`);

                // Adjust app behavior based on connection
                if (connection.saveData || connection.effectiveType === 'slow-2g') {
                    // Reduce update frequency for slow connections
                    if (window.energyMeterApp) {
                        console.log('⚡ Reducing update frequency for slow connection');
                        window.energyMeterApp.config.refreshInterval = Math.max(
                            window.energyMeterApp.config.refreshInterval * 2,
                            60
                        );
                        window.energyMeterApp.startAutoRefresh();
                    }
                }
            };

            // Initial check
            updateNetworkStatus();

            // Listen for changes
            connection.addEventListener('change', updateNetworkStatus);
        }
    }

    // Handle background sync (when supported)
    async setupBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('background-sync');
                console.log('🔄 Background sync registered');
            } catch (error) {
                console.error('❌ Error setting up background sync:', error);
            }
        }
    }
}

// Initialize PWA Manager
document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();

    // Setup additional PWA features
    window.pwaManager.setupNetworkMonitoring();
    window.pwaManager.setupBackgroundSync();
    window.pwaManager.requestPersistentStorage();

    // Check PWA support
    window.pwaManager.checkPWASupport();
});

// Handle service worker messages
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
            console.log('🔄 Cache updated');
            if (window.pwaManager) {
                window.pwaManager.showUpdateNotification();
            }
        }
    });
}

// Handle PWA lifecycle events
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.pwaManager) {
        // App became visible, could sync data
        console.log('👁️ App became visible');
    }
});

// Handle app beforeunload (cleanup)
window.addEventListener('beforeunload', () => {
    console.log('👋 App is being unloaded');
    // Cleanup if needed
});

// Export for global access
window.PWAManager = PWAManager;