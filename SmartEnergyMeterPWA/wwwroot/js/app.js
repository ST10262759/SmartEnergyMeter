

class EnergyMeterApp {
    constructor() {
        // Configuration
        this.config = {
            apiUrl: localStorage.getItem('apiUrl') || 'https://smartenergymeterapi20251028114041-b0cthrd5cdh2egh3.southafricanorth-01.azurewebsites.net/api/EnergyMeter',
            deviceId: localStorage.getItem('deviceId') || 'ESP8266_01',
            refreshInterval: parseInt(localStorage.getItem('refreshInterval')) || 1, // 1 second for near real-time
            darkMode: localStorage.getItem('darkMode') === 'true'
        };

        // State
        this.isOnline = navigator.onLine;
        this.lastUpdate = null;
        this.pollingTimer = null;
        this.chart = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.totalEnergy = 0; // track cumulative energy in kWh

        // Initialize
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Smart Energy Meter PWA');

            // Setup event listeners
            this.setupEventListeners();

            // Apply saved settings
            this.applySettings();

            // Initialize chart
            this.initializeChart();

            // Initial data load
            await this.loadInitialData();

            // Start continuous polling
            this.startPolling();

            // Hide loading screen
            this.hideLoadingScreen();

            console.log('✅ PWA initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing PWA:', error);
            this.showError('Failed to initialize application');
        }
    }

    setupEventListeners() {
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadLatestReading());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());
        document.querySelector('.close-modal').addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('download-csv').addEventListener('click', () => this.downloadCSV());
        document.getElementById('view-history').addEventListener('click', () => this.showHistoryView());
        document.getElementById('share-data').addEventListener('click', () => this.shareData());
        document.getElementById('export-report').addEventListener('click', () => this.exportReport());
        document.getElementById('chart-period').addEventListener('change', (e) => this.updateChart(e.target.value));

        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });

        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') this.hideSettingsModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.loadLatestReading();
            }
        });
    }

    applySettings() {
        if (this.config.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('dark-mode').checked = true;
        }

        document.getElementById('api-url').value = this.config.apiUrl;
        document.getElementById('device-id').value = this.config.deviceId;
        document.getElementById('refresh-interval').value = this.config.refreshInterval;
    }

    async loadInitialData() {
        console.log('📊 Loading initial data...');
        await this.loadLatestReading();
        await this.loadHistoricalData();
      
    }

    async loadLatestReading() {
        try {
            const url = `${this.config.apiUrl}/readings/latest?deviceId=${this.config.deviceId}`;
            const data = await this.apiCall(url);

            // Handle single object response
            if (data && typeof data === 'object') {
                this.updateReadingsDisplay(data);
                this.lastUpdate = new Date();
                this.updateLastUpdateTime();
                this.retryCount = 0;
            } else {
                throw new Error('No data received');
            }
        } catch (error) {
            console.error('❌ Error loading latest reading:', error);
            this.handleAPIError(error);
        }
    }


    async apiCall(url, options = {}) {
        if (!this.isOnline) throw new Error('No internet connection');

        const defaultOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        };
        const finalOptions = { ...defaultOptions, ...options };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);

            const response = await fetch(url, { ...finalOptions, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('Request timeout');
            throw error;
        }
    }

    updateReadingsDisplay(data) {
        // Voltage, Current, Power, Frequency, PF
        this.updateReadingValue('voltage-value', data.voltage, 2, 'V');
        this.updateReadingValue('current-value', data.current, 3, 'A');
        this.updateReadingValue('power-value', data.power, 2, 'W');
        this.updateReadingValue('frequency-value', data.frequency, 1, 'Hz');
        this.updateReadingValue('pf-value', data.powerFactor, 2, '');

        // Energy in kWh (incremental based on interval)
        const deltaEnergy = data.power * this.config.refreshInterval / 3600 / 1000; // W * s / 3600 / 1000 = kWh
        this.totalEnergy += deltaEnergy;
        this.updateReadingValue('energy-value', this.totalEnergy, 3, 'kWh');

        // Chart update (append latest reading)
        this.appendChartData(data);

        // Animate reading cards
        document.querySelectorAll('.reading-card').forEach(card => {
            card.classList.remove('fade-in');
            void card.offsetWidth;
            card.classList.add('fade-in');
        });
    }

    updateReadingValue(elementId, value, decimals, unit) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentValue = parseFloat(element.textContent) || 0;
        const newValue = parseFloat(value) || 0;

        this.animateValue(element, currentValue, newValue, decimals);
        this.updateReadingColor(element, elementId, newValue);
    }

    animateValue(element, start, end, decimals) {
        const duration = 400; // fast animation
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentValue = start + (end - start) * this.easeOutQuart(progress);
            element.textContent = currentValue.toFixed(decimals);
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    easeOutQuart(t) { return 1 - (--t) * t * t * t; }

    updateReadingColor(element, elementId, value) {
        const card = element.closest('.reading-card');
        if (!card) return;
        card.classList.remove('status-normal', 'status-warning', 'status-critical');

        switch (elementId) {
            case 'voltage-value':
                if (value < 200 || value > 250) card.classList.add('status-critical');
                else if (value < 210 || value > 240) card.classList.add('status-warning');
                else card.classList.add('status-normal');
                break;
            case 'frequency-value':
                if (value < 49 || value > 51) card.classList.add('status-critical');
                else if (value < 49.5 || value > 50.5) card.classList.add('status-warning');
                else card.classList.add('status-normal');
                break;
        }
    }

    initializeChart() {
        const ctx = document.getElementById('energy-chart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Power (W)', data: [], borderColor: '#2196F3', backgroundColor: 'rgba(33,150,243,0.1)', fill: true, tension: 0.4 },
                    { label: 'Voltage (V)', data: [], borderColor: '#F44336', backgroundColor: 'rgba(244,67,54,0.1)', fill: false, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: '#2196F3', borderWidth: 1 }
                },
                scales: {
                    x: { display: true, title: { display: true, text: 'Time' } },
                    y: { display: true, title: { display: true, text: 'Power (W)' }, position: 'left' },
                    y1: { display: true, title: { display: true, text: 'Voltage (V)' }, position: 'right', grid: { drawOnChartArea: false } }
                },
                animation: { duration: 400, easing: 'easeOutQuart' }
            }
        });
    }

    appendChartData(data) {
        if (!this.chart) return;

        const timeLabel = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.chart.data.labels.push(timeLabel);
        this.chart.data.datasets[0].data.push(data.power);
        this.chart.data.datasets[1].data.push(data.voltage);

        // Keep last 30 points for performance
        if (this.chart.data.labels.length > 30) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }

        this.chart.update('active');
    }

    // --- Continuous polling for near real-time ---
    startPolling() {
        const poll = async () => {
            if (this.isOnline) await this.loadLatestReading();
            setTimeout(poll, this.config.refreshInterval * 1000);
        };
        poll();
    }

    updateConnectionStatus() {
        const connectionStatus = document.getElementById('connection-status');
        const connectionText = document.getElementById('connection-text');

        if (this.isOnline) {
            connectionStatus.className = 'fas fa-wifi text-success';
            connectionText.textContent = 'Connected';
        } else {
            connectionStatus.className = 'fas fa-wifi text-danger';
            connectionText.textContent = 'Offline';
        }
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('last-update');
        lastUpdateElement.textContent = this.lastUpdate ? this.lastUpdate.toLocaleTimeString() : 'Never';
    }

    handleAPIError(error) {
        console.error('API Error:', error);
        this.retryCount++;
        if (this.retryCount < this.maxRetries) {
            console.log(`🔄 Retrying in 2 seconds... (${this.retryCount}/${this.maxRetries})`);
            setTimeout(() => this.loadLatestReading(), 2000);
        } else {
            this.showError(`Failed to load data: ${error.message}`);
            this.retryCount = 0;
        }
    }

    showError(message) {
        console.error('❌', message);
        const connectionText = document.getElementById('connection-text');
        connectionText.textContent = 'Error';
        connectionText.className = 'text-danger';
    }

    // --- Settings Modal ---
    showSettingsModal() { document.getElementById('settings-modal').classList.add('show'); }
    hideSettingsModal() { document.getElementById('settings-modal').classList.remove('show'); }
    saveSettings() {
        const apiUrl = document.getElementById('api-url').value.trim();
        const deviceId = document.getElementById('device-id').value.trim();
        const refreshInterval = parseInt(document.getElementById('refresh-interval').value);
        const darkMode = document.getElementById('dark-mode').checked;

        if (apiUrl && deviceId && refreshInterval > 0) {
            this.config.apiUrl = apiUrl;
            this.config.deviceId = deviceId;
            this.config.refreshInterval = refreshInterval;
            this.config.darkMode = darkMode;

            localStorage.setItem('apiUrl', apiUrl);
            localStorage.setItem('deviceId', deviceId);
            localStorage.setItem('refreshInterval', refreshInterval);
            localStorage.setItem('darkMode', darkMode);

            document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');

            this.hideSettingsModal();
        }
    }

    resetSettings() {
        localStorage.removeItem('apiUrl');
        localStorage.removeItem('deviceId');
        localStorage.removeItem('refreshInterval');
        localStorage.removeItem('darkMode');
        window.location.reload();
    }

    hideLoadingScreen() { document.getElementById('loading-screen').style.display = 'none'; }

    // --- Quick Actions ---
    shareData() {
        // Prepare data to share
        const data = {
            time: new Date().toLocaleString(),
            voltage: document.getElementById('voltage-value').textContent,
            current: document.getElementById('current-value').textContent,
            power: document.getElementById('power-value').textContent,
            frequency: document.getElementById('frequency-value').textContent,
            pf: document.getElementById('pf-value').textContent,
            energy: document.getElementById('energy-value').textContent
        };
        const shareText = `Smart Energy Meter Reading:\nTime: ${data.time}\nVoltage: ${data.voltage} V\nCurrent: ${data.current} A\nPower: ${data.power} W\nFrequency: ${data.frequency} Hz\nPF: ${data.pf}\nEnergy: ${data.energy} kWh`;

        if (navigator.share) {
            navigator.share({
                title: 'Smart Energy Meter Reading',
                text: shareText
            })
                .then(() => console.log('Data shared successfully'))
                .catch((error) => console.error('Error sharing data:', error));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText)
                .then(() => alert('Reading copied to clipboard for sharing!'))
                .catch(() => alert('Unable to share or copy data.'));
        }
    }

    exportReport() {
        // Generate CSV report for last 30 chart points
        if (!this.chart) return alert('No chart data to export!');

        const rows = [['Time', ...this.chart.data.datasets.map(ds => ds.label)]];
        this.chart.data.labels.forEach((label, i) => {
            const row = [label];
            this.chart.data.datasets.forEach(ds => row.push(ds.data[i]));
            rows.push(row);
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `energy_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('📝 Report exported successfully!');
    }


// Unregister old service workers to clear cached PWA versions
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
        .then(registrations => {
            registrations.forEach(reg => {
                console.log('Unregistering service worker:', reg);
                reg.unregister();
            });
        })
        .catch(err => console.error('Error unregistering service workers:', err));
}



// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.energyMeterApp = new EnergyMeterApp();
});
