
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "config.h"

// ================= PIN =================
#define DHT_PIN       4
#define DHT_TYPE      DHT22

#define LED_GREEN     25
#define LED_YELLOW    26
#define LED_RED       27

#define BUZZER_PIN    18

#define BTN_NEXT      19
#define BTN_SELECT    23

// ============== KONFIGURASI =============
#define LCD_ADDRESS   0x27
#define LCD_COLUMNS   20
#define LCD_ROWS      4

const float WARNING_TEMP = 30.0;
float alarmLimit = 35.0;

// ================ OBJEK =================
DHT dht(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLUMNS, LCD_ROWS);
Preferences preferences;

// ================ DATA ==================
float temperature = NAN;
float humidity = NAN;

bool sensorOK = false;
bool alarmActive = false;

byte currentPage = 0;
// 0 = Monitoring
// 1 = Status perangkat
// 2 = Pengaturan alarm
// 3 = Koneksi ILMS

unsigned long lastSensorRead = 0;
unsigned long lastLcdUpdate = 0;
unsigned long lastBuzzerToggle = 0;

bool buzzerState = false;

// ============ STATUS KONEKSI ILMS ===========
String savedApiKey = "";
bool wifiConnected = false;
bool deviceRegistered = false;
bool lastSendOk = false;

unsigned long lastWiFiAttempt = 0;
unsigned long lastRegisterAttempt = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastSensorSend = 0;

// Debounce tombol
const unsigned long DEBOUNCE_MS = 40;

struct Button {
  byte pin;
  bool lastReading;
  bool state;
  unsigned long lastChange;
};

Button nextButton = {BTN_NEXT, HIGH, HIGH, 0};
Button selectButton = {BTN_SELECT, HIGH, HIGH, 0};

// ============== TOMBOL ===================
bool pressed(Button &b) {
  bool reading = digitalRead(b.pin);

  if (reading != b.lastReading) {
    b.lastReading = reading;
    b.lastChange = millis();
  }

  if ((millis() - b.lastChange) > DEBOUNCE_MS) {
    if (reading != b.state) {
      b.state = reading;
      if (b.state == LOW) {
        return true;
      }
    }
  }

  return false;
}

// ============== TAMPILAN LCD =============
void printLine(byte row, String text) {
  lcd.setCursor(0, row);

  // Batasi agar tidak melebihi 20 karakter
  if (text.length() > LCD_COLUMNS) {
    text = text.substring(0, LCD_COLUMNS);
  }

  lcd.print(text);

  // Hapus sisa teks dari tampilan sebelumnya
  for (int i = text.length(); i < LCD_COLUMNS; i++) {
    lcd.print(' ');
  }
}

// ============== KONEKSI ILMS ==============
void startWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWiFiAttempt = millis();
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }

  wifiConnected = false;
  unsigned long now = millis();

  // Coba sambung ulang tiap 10 detik tanpa memblokir tampilan LCD
  if (now - lastWiFiAttempt >= 10000) {
    lastWiFiAttempt = now;
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

int postToApi(const char *path, const String &payload, bool withApiKey) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  HTTPClient http;
  http.begin(String(API_BASE_URL) + path);
  http.addHeader("Content-Type", "application/json");
  if (withApiKey && savedApiKey.length() > 0) {
    http.addHeader("X-API-Key", savedApiKey);
  }

  int httpCode = http.POST(payload);
  String response = http.getString();
  Serial.printf("[HTTP] %s %d -> %s\n", path, httpCode, response.c_str());
  http.end();
  return httpCode;
}

void loadApiKey() {
  preferences.begin("ilms", true);
  savedApiKey = preferences.getString("apiKey", "");
  preferences.end();

  if (savedApiKey.length() > 0) {
    Serial.println("API key dimuat dari NVS.");
    deviceRegistered = true;
  }
}

// Registrasi device sekali; API key disimpan di NVS
void registerDevice() {
  if (savedApiKey.length() > 0) {
    deviceRegistered = true;
    return;
  }

  unsigned long now = millis();
  if (now - lastRegisterAttempt < 30000) return;
  lastRegisterAttempt = now;

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

  Serial.printf("[HTTP] /devices/register %d -> %s\n", code, body.c_str());

  if (code == 200 || code == 201) {
    JsonDocument resp;
    deserializeJson(resp, body);
    const char *apiKey = resp["data"]["apiKey"];
    if (apiKey != nullptr && strlen(apiKey) > 0) {
      preferences.begin("ilms", false);
      preferences.putString("apiKey", apiKey);
      preferences.end();
      savedApiKey = String(apiKey);
      deviceRegistered = true;
      Serial.println("Registrasi sukses. API key tersimpan di NVS.");
    } else {
      Serial.println("Device sudah terdaftar di server, tetapi API key tidak ada.");
      Serial.println("Hapus device lama di menu Perangkat IoT lalu reset board.");
    }
  } else {
    Serial.printf("Registrasi gagal: %d\n", code);
  }
}

void sendHeartbeat() {
  JsonDocument doc;
  doc["timestamp"] = millis();
  String payload;
  serializeJson(doc, payload);
  int code = postToApi("/devices/heartbeat", payload, true);
  if (code == 200) {
    lastSendOk = true;
  }
}

void sendSensorData() {
  if (!sensorOK) return;

  JsonDocument doc;
  JsonArray readings = doc["readings"].to<JsonArray>();

  JsonObject t = readings.add<JsonObject>();
  t["sensorType"] = "temperature";
  t["value"] = temperature;
  t["unit"] = "C";

  JsonObject h = readings.add<JsonObject>();
  h["sensorType"] = "humidity";
  h["value"] = humidity;
  h["unit"] = "%";

  String payload;
  serializeJson(doc, payload);

  int code = postToApi("/sensors/readings/batch", payload, true);
  lastSendOk = (code == 200 || code == 201);
  if (!lastSendOk) {
    Serial.printf("Kirim data sensor gagal: %d\n", code);
  }
}

// ============== SENSOR ==================
void readSensor() {
  unsigned long now = millis();

  if (now - lastSensorRead < 2000) {
    return;
  }

  lastSensorRead = now;

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    sensorOK = false;
    return;
  }

  temperature = t;
  humidity = h;
  sensorOK = true;
}

// ============== INDIKATOR ===============
void updateIndicators() {
  if (!sensorOK) {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, LOW);

    alarmActive = false;
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
    return;
  }

  alarmActive = (temperature >= alarmLimit);

  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);

  if (alarmActive) {
    digitalWrite(LED_RED, HIGH);
  } else if (temperature >= WARNING_TEMP) {
    digitalWrite(LED_YELLOW, HIGH);
  } else {
    digitalWrite(LED_GREEN, HIGH);
  }

  // Buzzer berbunyi putus-putus ketika suhu panas
  unsigned long now = millis();

  if (alarmActive) {
    if (now - lastBuzzerToggle >= 400) {
      lastBuzzerToggle = now;
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
    }
  } else {
    buzzerState = false;
    digitalWrite(BUZZER_PIN, LOW);
  }
}

// ============== TAMPILAN (PAGE) =========
void showMonitoring() {
  printLine(0, "SMART ENV MONITOR");

  if (!sensorOK) {
    printLine(1, "Temp : --.- C");
    printLine(2, "Humid: --.- %");
    printLine(3, "Sensor error!");
    return;
  }

  printLine(1, "Temp : " +
            String(temperature, 1) + " C");

  printLine(2, "Humid: " +
            String(humidity, 1) + " %");

  if (alarmActive) {
    printLine(3, "Status: PANAS!");
  } else if (temperature >= WARNING_TEMP) {
    printLine(3, "Status: WASPADA");
  } else {
    printLine(3, "Status: NORMAL");
  }
}

void showDeviceStatus() {
  printLine(0, "DEVICE STATUS");

  printLine(1, String("Sensor: ") +
            (sensorOK ? "ACTIVE" : "ERROR"));

  if (!sensorOK) {
    printLine(2, "LED   : OFF");
    printLine(3, "BUZZER: OFF");
    return;
  }

  if (alarmActive) {
    printLine(2, "LED   : RED");
  } else if (temperature >= WARNING_TEMP) {
    printLine(2, "LED   : YELLOW");
  } else {
    printLine(2, "LED   : GREEN");
  }

  printLine(3, String("BUZZER: ") +
            (alarmActive ? "ALARM" : "OFF"));
}

void showAlarmConfig() {
  printLine(0, "ALARM CONFIG");

  printLine(1, "Warning: 30 C");

  printLine(2, "Limit: " +
            String(alarmLimit, 0) + " C");

  printLine(3, "NEXT:+1 SELECT:Save");
}

void showConnection() {
  printLine(0, "KONEKSI ILMS");

  printLine(1, String("WiFi  : ") +
            (wifiConnected ? "CONNECTED" : "OFFLINE"));

  printLine(2, String("Device: ") +
            (deviceRegistered ? "REGISTERED" : "PENDING"));

  if (!wifiConnected) {
    printLine(3, "Server: -");
  } else {
    printLine(3, String("Server: ") +
              (lastSendOk ? "OK" : "WAIT"));
  }
}

void updateLCD() {
  unsigned long now = millis();

  // Kurangi penulisan LCD agar tidak berkedip
  if (now - lastLcdUpdate < 250) {
    return;
  }

  lastLcdUpdate = now;

  switch (currentPage) {
    case 0:
      showMonitoring();
      break;

    case 1:
      showDeviceStatus();
      break;

    case 2:
      showAlarmConfig();
      break;

    case 3:
      showConnection();
      break;
  }
}

// ============== TOMBOL (AKSI) ===========
void handleButtons() {
  if (pressed(nextButton)) {
    if (currentPage == 2) {
      // Ubah batas alarm 32 sampai 50 C
      alarmLimit += 1.0;

      if (alarmLimit > 50.0) {
        alarmLimit = 32.0;
      }
    } else {
      currentPage = (currentPage + 1) % 4;
    }
  }

  if (pressed(selectButton)) {
    if (currentPage == 2) {
      // Simpan nilai selama perangkat menyala
      currentPage = 0;
    } else {
      // Kembali ke halaman utama
      currentPage = 0;
    }
  }
}

// ============== SETUP ===================
void setup() {
  Serial.begin(115200);

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  pinMode(BTN_NEXT, INPUT_PULLUP);
  pinMode(BTN_SELECT, INPUT_PULLUP);

  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);

  lcd.init();
  lcd.backlight();

  printLine(0, "SMART ENV MONITOR");
  printLine(1, "Connecting WiFi");
  printLine(2, "ESP32 + DHT22");
  printLine(3, "Please wait");

  dht.begin();

  loadApiKey();
  startWiFi();

  delay(1500);
  lastSensorRead = millis() - 2000;
}

// ============== LOOP ====================
void loop() {
  readSensor();
  updateIndicators();
  handleButtons();
  updateLCD();

  // Koneksi ILMS: WiFi, registrasi, heartbeat, kirim data
  maintainWiFi();

  if (wifiConnected) {
    if (!deviceRegistered) {
      registerDevice();
    }

    unsigned long now = millis();

    if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeat = now;
      sendHeartbeat();
    }

    if (now - lastSensorSend >= SENSOR_INTERVAL_MS) {
      lastSensorSend = now;
      sendSensorData();
    }
  }

  if (sensorOK) {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print(" C | Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }
}
