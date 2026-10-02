import { PrismaClient, ComponentCondition, ComponentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial ILMS data...');

  // 1. Roles
  // Admin : akses penuh
  // Dosen : Admin tanpa Manajemen Pengguna dan Log Audit
  // Mahasiswa: peminjam komponen
  // User : alias umum, setara Mahasiswa, dipakai akun lama
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Pengelola laboratorium / kepala laboratorium'
    }
  });

  const dosenRole = await prisma.role.upsert({
    where: { name: 'Dosen' },
    update: {},
    create: {
      name: 'Dosen',
      description: 'Dosen pengampu: mengelola operasional lab tanpa hak akses pengguna dan log audit'
    }
  });

  await prisma.role.upsert({
    where: { name: 'Mahasiswa' },
    update: {},
    create: {
      name: 'Mahasiswa',
      description: 'Mahasiswa / peminjam komponen laboratorium'
    }
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: {
      name: 'User',
      description: 'Role umum, setara hak akses Mahasiswa'
    }
  });

  console.log('Roles created:', adminRole.name, dosenRole.name, 'Mahasiswa', userRole.name);

  // 2. Default Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const userPasswordHash = await bcrypt.hash('user123', salt);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      roleId: adminRole.id,
      fullName: 'Kepala Laboratorium IoT',
      email: 'admin@ilms.lab',
      username: 'admin',
      passwordHash: adminPasswordHash,
      phone: '081234567890',
      isActive: true
    }
  });

  const studentUser = await prisma.user.upsert({
    where: { username: 'mahasiswa1' },
    update: { nim: '2022101', phone: '081298765432' },
    create: {
      roleId: userRole.id,
      fullName: 'Ahmad Fauzi (Mahasiswa)',
      email: 'mahasiswa1@ilms.lab',
      username: 'mahasiswa1',
      nim: '2022101',
      passwordHash: userPasswordHash,
      phone: '081298765432',
      isActive: true
    }
  });

  console.log('Users created:', adminUser.username, studentUser.username);

  const demoUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      roleId: userRole.id,
      fullName: 'Pengguna Lab (Demo)',
      email: 'user@ilms.lab',
      username: 'user',
      passwordHash: userPasswordHash,
      isActive: true
    }
  });

  console.log('Demo user created:', demoUser.username);

  // 3. Categories
  const categoryNames = [
    'Microcontroller',
    'Sensor',
    'Actuator',
    'Motor',
    'Display',
    'Communication Module',
    'Power',
    'Passive Component',
    'Other'
  ];

  const categories: Record<string, string> = {};
  for (const catName of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: {
        name: catName,
        description: `Kategori komponen ${catName}`
      }
    });
    categories[catName] = cat.id;
  }
  console.log('Categories created:', Object.keys(categories).length);

  // 4. Initial Components
  const sampleComponents = [
    {
      categoryId: categories['Microcontroller'],
      name: 'ESP32 DevKit V1',
      inventoryCode: 'MCU-ESP32-001',
      description: 'NodeMCU ESP32 30-pin WiFi + Bluetooth dual-core microcontroller board',
      stockTotal: 10,
      stockAvailable: 10,
      condition: ComponentCondition.Good,
      location: 'Rak A1 - Box 01',
      status: ComponentStatus.Active,
      estimatedPrice: 75000
    },
    {
      categoryId: categories['Sensor'],
      name: 'HC-SR04 Ultrasonic Sensor',
      inventoryCode: 'SNS-HCSR04-001',
      description: 'Ultrasonic distance measuring sensor 2cm - 400cm',
      stockTotal: 15,
      stockAvailable: 15,
      condition: ComponentCondition.Good,
      location: 'Rak B2 - Box 03',
      status: ComponentStatus.Active,
      estimatedPrice: 18000
    },
    {
      categoryId: categories['Sensor'],
      name: 'DHT22 Temperature & Humidity Sensor',
      inventoryCode: 'SNS-DHT22-001',
      description: 'High precision digital temperature and humidity sensor AM2302',
      stockTotal: 12,
      stockAvailable: 12,
      condition: ComponentCondition.Good,
      location: 'Rak B2 - Box 04',
      status: ComponentStatus.Active,
      estimatedPrice: 45000
    },
    {
      categoryId: categories['Actuator'],
      name: 'TowerPro SG90 Micro Servo',
      inventoryCode: 'ACT-SG90-001',
      description: '9g micro servo motor 180 degree rotation',
      stockTotal: 8,
      stockAvailable: 8,
      condition: ComponentCondition.Good,
      location: 'Rak C1 - Box 02',
      status: ComponentStatus.Active,
      estimatedPrice: 22000
    },
    {
      categoryId: categories['Display'],
      name: 'OLED 0.96 inch I2C Display',
      inventoryCode: 'DSP-OLED-001',
      description: '128x64 SSD1306 I2C OLED display module blue',
      stockTotal: 6,
      stockAvailable: 6,
      condition: ComponentCondition.Good,
      location: 'Rak C2 - Box 01',
      status: ComponentStatus.Active,
      estimatedPrice: 35000
    }
  ];

  // Helper untuk komponen lab standar (stok awal 10)
  const mk = (
    categoryName: string,
    name: string,
    inventoryCode: string,
    description?: string,
    stock = 10
  ) => ({
    categoryId: categories[categoryName],
    name,
    inventoryCode,
    description,
    stockTotal: stock,
    stockAvailable: stock,
    condition: ComponentCondition.Good,
    location: null,
    status: ComponentStatus.Active,
    estimatedPrice: null
  });

  // Komponen tambahan daftar inventaris lab (ESPs/IR/dll tidak menambah duplikat
  // karena ESP32 DevKit V1, HC-SR04, DHT22/AM2302, dan SG90 sudah ada di seed awal)
  const extraComponents = [
    mk('Sensor', 'IR Sensor', 'SNS-IR-001', 'Sensor inframerah'),
    mk('Sensor', 'TCRT5000', 'SNS-TCRT5000-001', 'Sensor reflektif'),
    mk('Sensor', 'Capacitive Soil Moisture Sensor V1.2', 'SNS-SOIL-001', 'Sensor kelembapan tanah kapasitif'),
    mk('Sensor', 'Water Level Sensor', 'SNS-WATERLVL-001', 'Sensor level air'),
    mk('Sensor', 'Dual Axis Joystick Module', 'SNS-JOYSTICK-001', 'Joystick dual-axis'),
    mk('Sensor', '4-Pin Tactile Push Button', 'SNS-TACTBTN-001', 'Push button 4 kaki'),
    mk('Actuator', 'MG996R High Torque Servo', 'ACT-MG996R-001', 'Servo torsi tinggi'),
    mk('Actuator', '1-Channel Relay Module', 'ACT-RELAY1CH-001', 'Modul relay 1 channel'),
    mk('Actuator', 'Active Buzzer', 'ACT-BUZZER-ACT-001', 'Buzzer aktif'),
    mk('Actuator', 'Passive Buzzer', 'ACT-BUZZER-PAS-001', 'Buzzer pasif'),
    mk('Motor', 'DC Gearbox 1:48 Dual Shaft', 'MTR-GEARBOX48-001', 'Motor DC gearbox dual shaft'),
    mk('Motor', 'L298N', 'MTR-L298N-001', 'Driver motor dual H-bridge'),
    mk('Motor', 'Brushless Fan 3010 5V', 'MTR-FAN3010-001', 'Cooling fan'),
    mk('Display', 'LED Matrix Module', 'DSP-LEDMATRIX-001', 'LED Matrix'),
    mk('Display', 'LCD I2C 16x2 + Backpack', 'DSP-LCD16X2-001', 'LCD 16x2'),
    mk('Display', 'LCD I2C 20x4 + Backpack', 'DSP-LCD20X4-001', 'LCD 20x4'),
    mk('Display', 'Traffic Light Module', 'DSP-TRAFFIC-001', 'Modul lampu lalu lintas'),
    mk('Display', 'LED Red', 'DSP-LED-RED-001', 'LED merah'),
    mk('Display', 'LED Green', 'DSP-LED-GREEN-001', 'LED hijau'),
    mk('Display', 'LED Blue', 'DSP-LED-BLUE-001', 'LED biru'),
    mk('Display', 'UV LED', 'DSP-LED-UV-001', 'LED UV'),
    mk('Communication Module', 'RF Wireless 433/315 MHz', 'COM-RF433-001', 'RF transmitter/receiver'),
    mk('Power', '5V/3.3V Breadboard Power Supply', 'PWR-BREADPSU-001', 'Breadboard power supply'),
    mk('Power', '18650 Li-ion 3.7V', 'PWR-18650-001', 'Baterai Li-ion 18650'),
    mk('Power', '3S 18650 Battery Holder 11.1V', 'PWR-HOLDER3S-001', 'Holder baterai 3S'),
    mk('Other', 'PCF8574', 'OTH-PCF8574-001', 'IO expander I2C'),
    mk('Other', 'ESP32 I/O Expansion Board', 'OTH-EXPIO-001', 'IO expansion board ESP32'),
    mk('Other', 'Dupont F-F 10 cm', 'OTH-DUPONTFF-001', 'Kabel jumper Female-to-Female'),
    mk('Other', 'AWG24 / 0.5 mm merah / meter', 'OTH-AWG24-001', 'Kabel tunggal'),
    mk('Passive Component', '10K Potentiometer', 'POT-10K-001', 'Potensiometer')
  ];

  // Resistor (Passive Component)
  const resistorValues: [string, string][] = [
    ['10R', '10Ω'], ['22R', '22Ω'], ['47R', '47Ω'], ['100R', '100Ω'],
    ['150R', '150Ω'], ['200R', '200Ω'], ['220R', '220Ω'], ['270R', '270Ω'],
    ['330R', '330Ω'], ['470R', '470Ω'], ['510R', '510Ω'], ['680R', '680Ω'],
    ['1K', '1KΩ'], ['2K', '2KΩ'], ['2K2', '2.2KΩ'], ['3K3', '3.3KΩ'],
    ['4K7', '4.7KΩ'], ['5K1', '5.1KΩ'], ['6K8', '6.8KΩ'], ['10K', '10KΩ'],
    ['20K', '20KΩ'], ['47K', '47KΩ'], ['51K', '51KΩ'], ['68K', '68KΩ'],
    ['100K', '100KΩ'], ['220K', '220KΩ'], ['300K', '300KΩ'], ['470K', '470KΩ'],
    ['680K', '680KΩ'], ['1M', '1MΩ']
  ];
  const resistors = resistorValues.map(([v, ohm]) =>
    mk('Passive Component', `Resistor ${v}`, `RST-${v}-001`, `Resistor ${ohm}`)
  );

  // Kapasitor elektrolit (Passive Component)
  const capacitorValues: [string, string][] = [
    ['10µF', '10µF 25V'], ['47µF', '47µF 25V'], ['100µF', '100µF 25V'],
    ['220µF', '220µF 25V'], ['330µF', '330µF 25V'], ['1000µF', '1000µF 25V'],
    ['2200µF', '2200µF 25V']
  ];
  const capacitors = capacitorValues.map(([v, label]) =>
    mk('Passive Component', `Kapasitor Elektrolit ${label}`, `CAP-${v.replace('µF', 'UF')}-001`, label)
  );

  const allComponents = [...sampleComponents, ...extraComponents, ...resistors, ...capacitors];

  for (const comp of allComponents) {
    await prisma.component.upsert({
      where: { inventoryCode: comp.inventoryCode },
      update: {},
      create: comp
    });
  }
  console.log(`Components created/kept: ${allComponents.length} items (${resistors.length} resistor, ${capacitors.length} kapasitor).`);

  // 5. IoT Demo Device
  const apiKeyRaw = 'ilms_esp32_dev_secret_key_123';
  const apiKeyHash = await bcrypt.hash(apiKeyRaw, salt);

  const device = await prisma.device.upsert({
    where: { esp32Id: 'ESP32-LAB-NODE-01' },
    update: {},
    create: {
      deviceName: 'ESP32 Room Environmental Node',
      deviceType: 'ESP32-SensorNode',
      esp32Id: 'ESP32-LAB-NODE-01',
      apiKeyHash: apiKeyHash,
      ipAddress: '192.168.1.150',
      firmwareVersion: '1.0.0',
      location: 'Lab IoT Meja 1',
      status: 'Online',
      lastSeen: new Date()
    }
  });

  console.log('Sample device created:', device.deviceName, `(API Key for testing: ${apiKeyRaw})`);

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
