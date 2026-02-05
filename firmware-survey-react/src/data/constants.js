export const SKILL_LEVELS = ['none', 'learning', 'basic', 'proficient', 'expert'];

export const SKILL_VALUES = {
  none: 0,
  learning: 1,
  basic: 2,
  proficient: 3,
  expert: 4,
};

export const DEPARTMENTS = ['DLMS', 'PREPAID', 'FLOW', 'COMMUNICATION', 'TOOLING'];

export const TITLES = [
  { value: 'Junior', label: 'Junior Engineer' },
  { value: 'Senior', label: 'Senior Engineer' },
  { value: 'TeamLead', label: 'Team Lead' },
  { value: 'Manager', label: 'Manager' },
];

export const CURRENT_MODULES = [
  { value: 'Metering', label: 'Metering' },
  { value: 'DLMS', label: 'DLMS' },
  { value: 'RF_APP', label: 'RF APP' },
  { value: 'RF_Drv', label: 'RF Driver' },
  { value: 'RFID_APP', label: 'RFID APP' },
  { value: 'RFID_Drv', label: 'RFID Driver' },
  { value: 'PLC', label: 'PLC' },
  { value: 'GPRS_APP', label: 'GPRS APP' },
  { value: 'GPRS_Drv', label: 'GPRS Driver' },
  { value: 'Tariff', label: 'Tariff' },
  { value: 'Security', label: 'Security' },
  { value: 'Bootloader', label: 'Bootloader' },
  { value: 'LowPowerMode', label: 'Low Power Mode' },
  { value: 'Display_APP', label: 'Display APP' },
  { value: 'Display_Drv', label: 'Display Driver' },
  { value: 'EEPROM', label: 'EEPROM' },
  { value: 'FLASH', label: 'FLASH' },
  { value: 'IEC62056-21', label: 'IEC62056-21' },
  { value: 'Other', label: 'Other (specify below)' },
];

export const SKILL_CATEGORIES = [
  {
    title: 'Core Metering & Protocols',
    skills: [
      { key: 'Metering', label: 'Metering' },
      { key: 'DLMS', label: 'DLMS' },
      { key: 'ANSI', label: 'ANSI' },
      { key: 'IEC62056-21', label: 'IEC62056-21' },
      { key: 'Tariff', label: 'Tariff' },
      { key: 'Calendar', label: 'Calendar' },
      { key: 'LoadProfile', label: 'Load Profile (Multi-channel)' },
      { key: 'Predictor', label: 'Predictor' },
      { key: 'Limiter', label: 'Limiter' },
      { key: 'Disconnector', label: 'Disconnector' },
    ],
  },
  {
    title: 'Communication Modules',
    skills: [
      { key: 'RF_APP', label: 'RF APP' },
      { key: 'RF_Drv', label: 'RF Driver' },
      { key: 'RFID_APP', label: 'RFID APP' },
      { key: 'RFID_Drv', label: 'RFID Driver' },
      { key: 'PLC', label: 'PLC' },
      { key: 'GPRS_APP', label: 'GPRS APP' },
      { key: 'GPRS_Drv', label: 'GPRS Driver' },
      { key: 'IR', label: 'IR' },
      { key: 'WiFi', label: 'WiFi' },
      { key: 'Bluetooth', label: 'Bluetooth' },
      { key: 'NB_IoT', label: 'NB-IoT' },
      { key: 'Console', label: 'Console / UART' },
    ],
  },
  {
    title: 'Security & Cryptography',
    skills: [
      { key: 'Security', label: 'Security (General)' },
      { key: 'AES', label: 'AES' },
      { key: 'SHA', label: 'SHA (SHA-1/SHA-256)' },
      { key: 'MD5', label: 'MD5' },
      { key: 'RSA', label: 'RSA' },
      { key: 'ECC', label: 'ECC (Elliptic Curve)' },
      { key: 'HMAC', label: 'HMAC' },
      { key: 'ECDSA', label: 'ECDSA' },
      { key: 'TLS_SSL', label: 'TLS/SSL' },
      { key: 'KeyManagement', label: 'Key Management' },
      { key: 'SecureBoot', label: 'Secure Boot' },
    ],
  },
  {
    title: 'System & Memory Management',
    skills: [
      { key: 'Bootloader', label: 'Bootloader' },
      { key: 'RTOS', label: 'RTOS' },
      { key: 'LowPowerMode', label: 'Low Power Mode' },
      { key: 'PowerManagement', label: 'Power Management' },
      { key: 'EEPROM', label: 'EEPROM' },
      { key: 'FLASH', label: 'FLASH' },
      { key: 'BinaryDelta', label: 'Binary Delta Algorithm' },
      { key: 'Compression', label: 'Compression Algorithm' },
    ],
  },
  {
    title: 'HMI & Peripherals',
    skills: [
      { key: 'Display_APP', label: 'Display APP' },
      { key: 'Display_Drv', label: 'Display Driver' },
      { key: 'Keypad', label: 'Keypad' },
      { key: 'TouchKeypad', label: 'Touch Keypad' },
      { key: 'Tampers', label: 'Tampers' },
    ],
  },
  {
    title: 'MCU Drivers & Peripherals',
    skills: [
      { key: 'GPIO', label: 'GPIO' },
      { key: 'UART', label: 'UART' },
      { key: 'SPI', label: 'SPI' },
      { key: 'I2C', label: 'I2C' },
      { key: 'ADC', label: 'ADC' },
      { key: 'Timer', label: 'Timer' },
      { key: 'DMA', label: 'DMA' },
      { key: 'Interrupt', label: 'Interrupt Handling' },
      { key: 'RTC', label: 'RTC' },
      { key: 'Watchdog', label: 'Watchdog' },
      { key: 'CRC', label: 'CRC' },
    ],
  },
];

export const ALL_SKILL_MODULES = SKILL_CATEGORIES.flatMap((cat) =>
  cat.skills.map((s) => s.key)
);
