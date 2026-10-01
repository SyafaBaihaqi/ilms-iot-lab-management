// ======================================================
// ILMS IoT Lab Management System - ESP32 Sensor Node
// Firmware: registrasi, heartbeat, kirim data sensor
// Libraries: WiFi.h, HTTPClient.h, ArduinoJson.h, DHT.h
// ======================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "config.h"

// DHT (temperature & humidity)
#include <DHT.h>
DHT dht(PIN_DHT, DHT22);

// Preferences (NVS) untuk menyimpan API key
Preferences preferences;

const char *savedApiKey = nullptr;

// ------------------------------------------------------
// HTTP helper: kirim request ke backend
// ------------------------------------------------------
int postToApi(const char *path, const char *payload, bool withApiKey) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  HTTPClient http;
  http.begin(String(API_BASE_URL) + path);
  http.addHeader("Content-Type", "application/json");
  if (withApiKey && savedApiKey != nullptr && savedApiKey[0] != '\0') {
    http.addHeader("X-API-Key", savedApiKey);
  }

  int httpCode = http.POST(payload);
  String response = http.getString();
  Serial.printf("[HTTP] %s %d -> %s\n", path, httpCode, response.c_str());
  http.end();
  return httpCode;
}

// ------------------------------------------------------
// Registrasi device jika belum punya API key
// ------------------------------------------------------
void registerDevice() {
  if (savedApiKey != nullptr && savedApiKey[0] != '\0') {
    Serial.println("API key sudah ada. Lewati registrasi.");
    return;
  }

  String chipId = String((uint32_t)(ESP.getEfuseMac() >> 32), HEX) +
                  String((uint32_t)ESP.getEfuseMac(), HEX);
  chipId.toUpperCase();

  JsonDocument doc;
  doc["esp32Id"] = ESP32_ID;
  doc["deviceName"] = DEVICE_NAME;
  doc["deviceType"] = DEVICE_TYPE;
  doc["firmwareVersion"] = "1.0.0";

  String payload;
  serializeJson(doc, payload);

  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(String(API_BASE_URL) + "/devices/register");
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(payload);
  String body = http.getString();
  http.end();

  if (code == 200 || code == 201) {
    DynamicJsonDocument resp(1024);
    deserializeJson(resp, body);
    const char *apiKey = resp["data"]["apiKey"];
    if (apiKey != nullptr && strlen(apiKey) > 0) {
      preferences.begin("ilms", false);
      preferences.putString("apiKey", apiKey);
      preferences.end();
      Serial.println("API key baru tersimpan.");
    } else {
      Serial.println("Device sudah terdaftar, tanpa apiKey baru.");
    }
    savedApiKey = preferences.getString("apiKey", "").c_str();
  } else {
    Serial.printf("Registrasi gagal: %d\n", code);
  }
}

// ------------------------------------------------------
// Heartbeat: update status online di server
// ------------------------------------------------------
void sendHeartbeat() {
  JsonDocument doc;
  doc["timestamp"] = millis();
  String payload;
  serializeJson(doc, payload);
  postToApi("/devices/heartbeat", payload.c_str(), true);
}

// ------------------------------------------------------
// Baca sensor & kirim batch readings
// ------------------------------------------------------
void sendSensorData() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // Jarak HC-SR04
  float duration, distanceCm = -1;
  digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
  duration = pulseIn(PIN_ULTRASONIC_ECHO, HIGH);
  if (duration > 0) {
    distanceCm = duration * 0.034 / 2;
  }

  JsonDocument doc;
  JsonArray readings = doc["readings"].to<JsonArray>();

  if (!isnan(temp)) {
    JsonObject r = readings.add<JsonObject>();
    r["sensorType"] = "temperature";
    r["value"] = temp;
    r["unit"] = "C";
  }
  if (!isnan(hum)) {
    JsonObject r = readings.add<JsonObject>();
    r["sensorType"] = "humidity";
    r["value"] = hum;
    r["unit"] = "%";
  }
  if (distanceCm >= 0) {
    JsonObject r = readings.add<JsonObject>();
    r["sensorType"] = "distance";
    r["value"] = distanceCm;
    r["unit"] = "cm";
  }

  if (readings.size() > 0) {
    String payload;
    serializeJson(doc, payload);
    Serial.println("Payload sensor: " + payload);
    postToApi("/sensors/readings/batch", payload.c_str(), true);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
  pinMode(PIN_ULTRASONIC_ECHO, INPUT);
  dht.begin();

  preferences.begin("ilms", false);
  savedApiKey = preferences.getString("apiKey", "").c_str();
  preferences.end();
  if (savedApiKey[0] != '\0') {
    Serial.println("API key dimuat dari NVS.");
  }

  // Koneksi WiFi dengan retry
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan ke WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi terhubung. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Gagal terhubung ke WiFi. Akan mencoba lagi nanti.");
  }

  registerDevice();

  sendHeartbeat();
  sendSensorData();
}

unsigned long lastHeartbeat = 0;
unsigned long lastSensor = 0;

void loop() {
  unsigned long now = millis();

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    if (WiFi.status() == WL_CONNECTED) {
      sendHeartbeat();
    } else {
      Serial.println("WiFi terputus. Mencoba reconnect...");
      WiFi.reconnect();
    }
  }

  if (now - lastSensor >= SENSOR_INTERVAL_MS) {
    lastSensor = now;
    if (WiFi.status() == WL_CONNECTED) {
      sendSensorData();
    }
  }

  delay(200);
}