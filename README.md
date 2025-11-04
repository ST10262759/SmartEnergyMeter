<img width="803" height="447" alt="image" src="https://github.com/user-attachments/assets/2ba3f354-549c-4d6c-9c03-245306d46997" />

# ⚡ Smart Energy Meter PWA (IoT + Cloud)

A real-time smart energy monitoring system built using **ESP32 IoT hardware**, **ASP.NET Web API**, and a **Progressive Web App (PWA)** dashboard.  
The system captures voltage, current, power, and energy usage and streams data to the cloud for live visualization and reporting.

---

## 🚀 Features

✅ Real-time energy data (voltage, current, power, frequency)  
✅ Live charts & historical tracking  
✅ Cloud API communication (REST + JSON)  
✅ Device configurable (API URL, Device ID, refresh rate)  
✅ PWA installation (works like a mobile app)  
✅ Offline awareness (online/offline detection)  
✅ CSV export & report sharing  
✅ Dark mode support  
✅ Service worker caching & update handling  

---

## 🧠 Architecture

ESP32 + Energy Sensor → ASP.NET Web API (Azure) → SQL Database
↓
PWA UI

---

## 📡 Data Flow

1. ESP32 reads power sensor values  
2. Sends data to API using HTTP POST (JSON)  
3. API stores readings in Azure SQL  
4. PWA polls API for latest reading every second  
5. Dashboard updates in real time  

---

## 🛠️ Tech Stack

| Layer | Technology |
|------|------------|
Device | ESP32, C++ (Arduino) |
Backend API | ASP.NET Core Web API |
Database | Azure SQL |
Frontend | HTML, CSS, JavaScript |
UI Libraries | Chart.js, Font Awesome |
Auth | JWT Authentication |
Hosting | Azure App Service |
PWA | Service Worker + Manifest |


---

## ⚙️ PWA Setup

### Install as App
- Browser prompts "Add to Home Screen"
- Can run offline in "App mode"
- Full-screen UI, no browser tab UI

---

## 🔧 Configuration (Local Storage)

| Setting | Description |
|--------|-------------|
apiUrl | API endpoint for fetching readings |
deviceId | ESP32 device identifier |
refreshInterval | Polling interval (seconds) |
darkMode | Enable/disable dark theme |

---

## 📦 Installation

### Clone the repository
```bash
git clone https://github.com/your-username/smart-energy-meter-pwa.git
cd smart-energy-meter-pwa
```

---
🔒 Security

API secured with JWT tokens

HTTPS requests enforced

LocalStorage only stores non-sensitive config


