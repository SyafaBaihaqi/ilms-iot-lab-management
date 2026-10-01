#ifndef ILMS_CONFIG_H
#define ILMS_CONFIG_H

// =====================================================
// ILMS IoT Lab Management System - ESP32 Configuration
// =====================================================
// PERHATIAN: Jangan commit file config.h dengan password
// asli ke repository. Salin dari config.example.h.

// WiFi credentials
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// Backend API endpoint (harus HTTPS untuk production)
#define API_BASE_URL    "http://192.168.1.10:5000/api"  // contoh: "https://ilms.example.com/api"

// Device identity
#define DEVICE_NAME     "ESP32 Room Environmental Node"
#define DEVICE_TYPE     "ESP32-SensorNode"
#define ESP32_ID        "ESP32-LAB-NODE-01"             // chip ID unik / MAC based

// API key diperoleh saat registrasi pertama kali (POST /api/devices/register)
// Simpan nilai ini di memori/NVS setelah registrasi sukses.
#define API_KEY         "ILMS_DEV_API_KEY_HERE"

// Sensor pins
#define PIN_DHT         4       // DHT22 data pin
#define PIN_ULTRASONIC_TRIG 12  // HC-SR04 trig
#define PIN_ULTRASONIC_ECHO 14  // HC-SR04 echo

// Timing (milliseconds)
#define HEARTBEAT_INTERVAL_MS    60000UL   // heartbeat tiap 60 detik
#define SENSOR_INTERVAL_MS       30000UL   // kirim data sensor tiap 30 detik

#endif // ILMS_CONFIG_H