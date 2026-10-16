#ifndef SMARTENV_CONFIG_H
#define SMARTENV_CONFIG_H

// =====================================================
// Smart Environment Monitor - Konfigurasi ILMS
// =====================================================
// Salin file ini menjadi config.h, lalu isi nilai sebenarnya.
// JANGAN commit config.h (berisi password WiFi).

// WiFi (2.4 GHz)
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// Backend ILMS. Gunakan IP LAN komputer/hosting, BUKAN localhost.
// Contoh: "http://192.168.1.10:5000/api" atau "https://ilms.saiasyap.my.id/api"
#define API_BASE_URL    "http://192.168.1.10:5000/api"

// Identitas device (ESP32_ID harus unik untuk tiap board)
#define ESP32_ID        "ESP32-SMARTENV-01"
#define DEVICE_NAME     "Smart Environment Monitor"
#define DEVICE_TYPE     "ESP32-EnvMonitor"

// Interval pengiriman (milliseconds)
#define HEARTBEAT_INTERVAL_MS   60000UL   // heartbeat tiap 60 detik
#define SENSOR_INTERVAL_MS      30000UL   // kirim data sensor tiap 30 detik

#endif // SMARTENV_CONFIG_H
