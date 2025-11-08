class EnergyMeterApp {
    constructor() {
        // Configuration - Store in memory instead of localStorage
        this.config = {
            apiUrl: 'https://smartenergymeterapi20251028114041-b0cthrd5cdh2egh3.southafricanorth-01.azurewebsites.net/api/EnergyMeter',
            deviceId: 'ESP8266_01',
            refreshInterval: 30, // Default to 30 seconds
            darkMode: false
        };

        // Try to load from localStorage (fallback)
        this.loadConfigFromStorage();

        // State
        this.isOnline = navigator.onLine;
        this.pollingTimer = null;
        this.chart = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.totalEnergy = 0;
        this.lastUpdate = null;
        this.historicalData = []; // Store historical readings

        // Initialize
        this.init();
    }

    loadConfigFromStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                this.config.apiUrl = localStorage.getItem('apiUrl') || this.config.apiUrl;
                this.config.deviceId = localStorage.getItem('deviceId') || this.config.deviceId;
                this.config.refreshInterval = parseInt(localStorage.getItem('refreshInterval')) || this.config.refreshInterval;
                this.config.darkMode = localStorage.getItem('darkMode') === 'true';
            }
        } catch (error) {
            console.warn('localStorage not available, using defaults:', error);
        }
    }

    async init() {
        try {
            console.log('🚀 Initializing Smart Energy Meter PWA');

            // Verify DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.continueInit());
            } else {
                this.continueInit();
            }
        } catch (error) {
            console.error('❌ Error initializing PWA:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async continueInit() {
        try {
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
            console.error('❌ Error in continueInit:', error);
            this.showError('Failed to initialize: ' + error.message);
        }
    }

    setupEventListeners() {
        const addListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`✓ Listener added for ${id}`);
            } else {
                console.warn(`⚠ Element not found: ${id}`);
            }
        };

        addListener('refresh-btn', 'click', () => this.loadLatestReading());
        addListener('settings-btn', 'click', () => this.showSettingsModal());
        addListener('save-settings', 'click', () => this.saveSettings());
        addListener('reset-settings', 'click', () => this.resetSettings());
        addListener('download-csv', 'click', () => this.downloadCSV());
        addListener('view-history', 'click', () => this.showHistoryView());
        addListener('share-data', 'click', () => this.shareData());
        addListener('export-report', 'click', () => this.exportReport());
        addListener('chart-period', 'change', (e) => this.updateChart(e.target.value));

        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideSettingsModal());
        }

        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });

        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'settings-modal') this.hideSettingsModal();
            });
        }

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
            const darkModeCheckbox = document.getElementById('dark-mode');
            if (darkModeCheckbox) darkModeCheckbox.checked = true;
        }

        const apiUrlInput = document.getElementById('api-url');
        const deviceIdInput = document.getElementById('device-id');
        const refreshIntervalInput = document.getElementById('refresh-interval');

        if (apiUrlInput) apiUrlInput.value = this.config.apiUrl;
        if (deviceIdInput) deviceIdInput.value = this.config.deviceId;
        if (refreshIntervalInput) refreshIntervalInput.value = this.config.refreshInterval;
    }

    async loadInitialData() {
        console.log('📊 Loading initial data...');
        await this.loadLatestReading();
    }

    async loadLatestReading() {
        try {
            const url = `${this.config.apiUrl}/readings/latest?deviceId=${this.config.deviceId}`;
            console.log('📡 Fetching from:', url);
            const data = await this.apiCall(url);

            if (data && typeof data === 'object') {
                // Add timestamp if not present
                data.timestamp = data.timestamp || new Date().toISOString();

                // Store in historical data
                this.historicalData.push({
                    ...data,
                    timestamp: data.timestamp
                });

                // Keep only last 100 readings
                if (this.historicalData.length > 100) {
                    this.historicalData.shift();
                }

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

            const response = await fetch(url, {
                method: finalOptions.method,
                headers: finalOptions.headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('Request timeout');
            throw error;
        }
    }

    updateReadingsDisplay(data) {
        this.updateReadingValue('voltage-value', data.voltage, 2, 'V');
        this.updateReadingValue('current-value', data.current, 3, 'A');
        this.updateReadingValue('power-value', data.power, 2, 'W');
        this.updateReadingValue('frequency-value', data.frequency, 1, 'Hz');
        this.updateReadingValue('pf-value', data.powerFactor, 2, '');

        const deltaEnergy = data.power * this.config.refreshInterval / 3600 / 1000;
        this.totalEnergy += deltaEnergy;
        this.updateReadingValue('energy-value', this.totalEnergy, 3, 'kWh');

        this.appendChartData(data);

        document.querySelectorAll('.reading-card').forEach(card => {
            card.classList.remove('fade-in');
            void card.offsetWidth;
            card.classList.add('fade-in');
        });
    }

    updateReadingValue(elementId, value, decimals, unit) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element not found: ${elementId}`);
            return;
        }
        const currentValue = parseFloat(element.textContent) || 0;
        const newValue = parseFloat(value) || 0;
        this.animateValue(element, currentValue, newValue, decimals);
        this.updateReadingColor(element, elementId, newValue);
    }

    animateValue(element, start, end, decimals) {
        const duration = 400;
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
        const canvas = document.getElementById('energy-chart');
        if (!canvas) {
            console.warn('Chart canvas not found');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }

        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Power (W)',
                        data: [],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33,150,243,0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Voltage (V)',
                        data: [],
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244,67,54,0.1)',
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#2196F3',
                        borderWidth: 1
                    }
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
        const timeLabel = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.chart.data.labels.push(timeLabel);
        this.chart.data.datasets[0].data.push(data.power);
        this.chart.data.datasets[1].data.push(data.voltage);

        if (this.chart.data.labels.length > 30) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }
        this.chart.update('active');
    }

    startPolling() {
        const poll = async () => {
            if (this.isOnline) {
                await this.loadLatestReading();
            }
            this.pollingTimer = setTimeout(poll, this.config.refreshInterval * 1000);
        };
        poll();
    }

    updateConnectionStatus() {
        const connectionStatus = document.getElementById('connection-status');
        const connectionText = document.getElementById('connection-text');

        if (!connectionStatus || !connectionText) return;

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
        if (lastUpdateElement) {
            lastUpdateElement.textContent = this.lastUpdate ?
                this.lastUpdate.toLocaleTimeString() : 'Never';
        }
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
        if (connectionText) {
            connectionText.textContent = 'Error';
            connectionText.className = 'text-danger';
        }
        alert(message);
    }

    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            // Your CSS uses :not(.hidden) to show the modal
            modal.classList.remove('hidden');
            console.log('✓ Settings modal opened');
        } else {
            console.error('❌ Settings modal not found');
        }
    }

    hideSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            // Your CSS hides modal when .hidden class is present
            modal.classList.add('hidden');
            console.log('✓ Settings modal closed');
        }
    }

    saveSettings() {
        const apiUrl = document.getElementById('api-url')?.value.trim();
        const deviceId = document.getElementById('device-id')?.value.trim();
        const refreshInterval = parseInt(document.getElementById('refresh-interval')?.value);
        const darkMode = document.getElementById('dark-mode')?.checked;

        if (apiUrl && deviceId && refreshInterval > 0) {
            this.config.apiUrl = apiUrl;
            this.config.deviceId = deviceId;
            this.config.refreshInterval = refreshInterval;
            this.config.darkMode = darkMode;

            // Try to save to localStorage (fallback)
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('apiUrl', apiUrl);
                    localStorage.setItem('deviceId', deviceId);
                    localStorage.setItem('refreshInterval', refreshInterval.toString());
                    localStorage.setItem('darkMode', darkMode.toString());
                }
            } catch (error) {
                console.warn('Could not save to localStorage:', error);
            }

            document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');

            // Restart polling with new settings
            if (this.pollingTimer) {
                clearTimeout(this.pollingTimer);
            }
            this.startPolling();

            this.hideSettingsModal();
            alert('Settings saved successfully!');
        } else {
            alert('Please fill in all required fields');
        }
    }

    resetSettings() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.clear();
            }
        } catch (error) {
            console.warn('Could not clear localStorage:', error);
        }
        window.location.reload();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    downloadCSV() {
        try {
            const rows = [['Timestamp', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Frequency (Hz)', 'Power Factor', 'Energy (kWh)']];

            // Add all historical data
            this.historicalData.forEach(reading => {
                rows.push([
                    new Date(reading.timestamp).toLocaleString(),
                    reading.voltage?.toFixed(2) || 'N/A',
                    reading.current?.toFixed(3) || 'N/A',
                    reading.power?.toFixed(2) || 'N/A',
                    reading.frequency?.toFixed(1) || 'N/A',
                    reading.powerFactor?.toFixed(2) || 'N/A',
                    (reading.power * this.config.refreshInterval / 3600 / 1000).toFixed(3)
                ]);
            });

            const csvContent = "data:text/csv;charset=utf-8," +
                rows.map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `energy_readings_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`✅ Downloaded CSV with ${this.historicalData.length} readings`);
        } catch (error) {
            console.error('Error downloading CSV:', error);
            alert('Failed to download CSV: ' + error.message);
        }
    }

    updateChart(period) {
        console.log('📊 Chart period changed to:', period);
        // Future: Filter historicalData based on period
        alert(`Chart period changed to: ${period}. Full implementation coming soon!`);
    }

    showHistoryView() {
        if (this.historicalData.length === 0) {
            alert('📜 No historical data available yet. Data will be collected as the app runs.');
            return;
        }

        // Create a summary of historical data
        const totalReadings = this.historicalData.length;
        const avgPower = (this.historicalData.reduce((sum, r) => sum + (r.power || 0), 0) / totalReadings).toFixed(2);
        const avgVoltage = (this.historicalData.reduce((sum, r) => sum + (r.voltage || 0), 0) / totalReadings).toFixed(2);
        const maxPower = Math.max(...this.historicalData.map(r => r.power || 0)).toFixed(2);
        const minPower = Math.min(...this.historicalData.map(r => r.power || 0)).toFixed(2);

        const oldestReading = new Date(this.historicalData[0].timestamp).toLocaleString();
        const newestReading = new Date(this.historicalData[totalReadings - 1].timestamp).toLocaleString();

        const message = `📊 HISTORICAL DATA SUMMARY\n\n` +
            `Total Readings: ${totalReadings}\n` +
            `Time Range: ${oldestReading} to ${newestReading}\n\n` +
            `Average Power: ${avgPower} W\n` +
            `Average Voltage: ${avgVoltage} V\n` +
            `Max Power: ${maxPower} W\n` +
            `Min Power: ${minPower} W\n` +
            `Total Energy: ${this.totalEnergy.toFixed(3)} kWh\n\n` +
            `💡 Tip: Use "Download CSV" to export all data for detailed analysis.`;

        alert(message);
    }

    shareData() {
        if (this.historicalData.length === 0) {
            alert('🔗 No data available to share yet.');
            return;
        }

        const latestReading = this.historicalData[this.historicalData.length - 1];
        const shareText = `⚡ Smart Energy Meter Reading\n\n` +
            `🔋 Power: ${latestReading.power?.toFixed(2)} W\n` +
            `⚡ Voltage: ${latestReading.voltage?.toFixed(2)} V\n` +
            `📊 Current: ${latestReading.current?.toFixed(3)} A\n` +
            `🌊 Frequency: ${latestReading.frequency?.toFixed(1)} Hz\n` +
            `📈 Power Factor: ${latestReading.powerFactor?.toFixed(2)}\n` +
            `💡 Total Energy: ${this.totalEnergy.toFixed(3)} kWh\n` +
            `📅 ${new Date(latestReading.timestamp).toLocaleString()}`;

        // Check if Web Share API is available
        if (navigator.share) {
            navigator.share({
                title: 'Smart Energy Meter Reading',
                text: shareText
            }).then(() => {
                console.log('✅ Data shared successfully');
            }).catch((error) => {
                console.log('Share cancelled or failed:', error);
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(text) {
        // Fallback: Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('📋 Data copied to clipboard!\n\nYou can now paste it anywhere.');
            }).catch(() => {
                // If clipboard fails, show the text in an alert
                alert('📊 CURRENT READING:\n\n' + text + '\n\n(Sharing not supported on this device)');
            });
        } else {
            alert('📊 CURRENT READING:\n\n' + text + '\n\n(Sharing not supported on this device)');
        }
    }

    exportReport() {
        if (this.historicalData.length === 0) {
            alert('📝 No data available to export yet. Data will be collected as the app runs.');
            return;
        }

        try {
            // Calculate statistics
            const totalReadings = this.historicalData.length;
            const avgPower = (this.historicalData.reduce((sum, r) => sum + (r.power || 0), 0) / totalReadings).toFixed(2);
            const avgVoltage = (this.historicalData.reduce((sum, r) => sum + (r.voltage || 0), 0) / totalReadings).toFixed(2);
            const avgCurrent = (this.historicalData.reduce((sum, r) => sum + (r.current || 0), 0) / totalReadings).toFixed(3);
            const avgFrequency = (this.historicalData.reduce((sum, r) => sum + (r.frequency || 0), 0) / totalReadings).toFixed(1);
            const avgPF = (this.historicalData.reduce((sum, r) => sum + (r.powerFactor || 0), 0) / totalReadings).toFixed(2);

            const maxPower = Math.max(...this.historicalData.map(r => r.power || 0)).toFixed(2);
            const minPower = Math.min(...this.historicalData.map(r => r.power || 0)).toFixed(2);
            const maxVoltage = Math.max(...this.historicalData.map(r => r.voltage || 0)).toFixed(2);
            const minVoltage = Math.min(...this.historicalData.map(r => r.voltage || 0)).toFixed(2);

            const oldestReading = new Date(this.historicalData[0].timestamp);
            const newestReading = new Date(this.historicalData[totalReadings - 1].timestamp);
            const durationHours = ((newestReading - oldestReading) / (1000 * 60 * 60)).toFixed(2);

            // Estimate cost (assuming R2.50 per kWh - adjust as needed)
            const costPerKWh = 2.50;
            const estimatedCost = (this.totalEnergy * costPerKWh).toFixed(2);

            // Generate HTML report
            const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Energy Meter Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        h1 { margin: 0; font-size: 32px; }
        .subtitle { opacity: 0.9; margin-top: 10px; }
        .section { background: white; padding: 25px; margin-bottom: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-card { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
        .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #667eea; color: white; }
        tr:hover { background: #f5f5f5; }
        .highlight { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Smart Energy Meter Report</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
        <div class="subtitle">Device: ${this.config.deviceId}</div>
    </div>

    <div class="section">
        <h2>Summary Statistics</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Readings</div>
                <div class="stat-value">${totalReadings}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Duration</div>
                <div class="stat-value">${durationHours} hrs</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Energy</div>
                <div class="stat-value">${this.totalEnergy.toFixed(3)} kWh</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Est. Cost</div>
                <div class="stat-value">R ${estimatedCost}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Average Values</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Power</div>
                <div class="stat-value">${avgPower} W</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Voltage</div>
                <div class="stat-value">${avgVoltage} V</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Current</div>
                <div class="stat-value">${avgCurrent} A</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Frequency</div>
                <div class="stat-value">${avgFrequency} Hz</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Power Factor</div>
                <div class="stat-value">${avgPF}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Peak Values</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Maximum</th>
                <th>Minimum</th>
            </tr>
            <tr>
                <td>Power</td>
                <td>${maxPower} W</td>
                <td>${minPower} W</td>
            </tr>
            <tr>
                <td>Voltage</td>
                <td>${maxVoltage} V</td>
                <td>${minVoltage} V</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Monitoring Period</h2>
        <div class="highlight">
            <strong>Start:</strong> ${oldestReading.toLocaleString()}<br>
            <strong>End:</strong> ${newestReading.toLocaleString()}<br>
            <strong>Duration:</strong> ${durationHours} hours
        </div>
    </div>

    <div class="section">
        <h2>Recent Readings (Last 10)</h2>
        <table>
            <tr>
                <th>Time</th>
                <th>Power (W)</th>
                <th>Voltage (V)</th>
                <th>Current (A)</th>
                <th>Frequency (Hz)</th>
                <th>PF</th>
            </tr>
            ${this.historicalData.slice(-10).reverse().map(reading => `
            <tr>
                <td>${new Date(reading.timestamp).toLocaleTimeString()}</td>
                <td>${reading.power?.toFixed(2) || 'N/A'}</td>
                <td>${reading.voltage?.toFixed(2) || 'N/A'}</td>
                <td>${reading.current?.toFixed(3) || 'N/A'}</td>
                <td>${reading.frequency?.toFixed(1) || 'N/A'}</td>
                <td>${reading.powerFactor?.toFixed(2) || 'N/A'}</td>
            </tr>
            `).join('')}
        </table>
    </div>

    <div class="footer">
        <p>Smart Energy Meter PWA | Report generated automatically</p>
        <p>Cost estimate based on R${costPerKWh.toFixed(2)}/kWh</p>
    </div>
</body>
</html>`;

            // Create and download the report
            const blob = new Blob([reportHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `energy_report_${Date.now()}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('✅ Report exported successfully');
            alert('📝 Report exported successfully! Check your downloads folder.');

        } catch (error) {
            console.error('Error exporting report:', error);
            alert('Failed to export report: ' + error.message);
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing app...');
        window.energyMeterApp = new EnergyMeterApp();
    });
} else {
    console.log('DOM already loaded, initializing app...');
    window.energyMeterApp = new EnergyMeterApp();
}