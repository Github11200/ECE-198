#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DFRobot_BMX160.h>
#include <Wire.h>

#define I2C_SDA 13
#define I2C_SCL 14

// Calibration offsets from the at-rest, flat reading
const float AX_OFF = 0.44, AY_OFF = 1.45, AZ_OFF = 0.85; // Z: 10.66 - 9.81
const float GX_OFF = 0.72, GY_OFF = 0.49, GZ_OFF = 0.45;

Adafruit_SSD1306 display(128, 64, &Wire, -1);
DFRobot_BMX160 bmx160;

void setup() {
  Serial.begin(115200);
  Wire.setPins(I2C_SDA, I2C_SCL);
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C) || !bmx160.begin()) {
    Serial.println("OLED or BMX160 not found - check wiring");
    for (;;)
      ;
  }
  display.setTextColor(SSD1306_WHITE);
}

void loop() {
  sBmx160SensorData_t gyro, accel; // mag is read but not used
  bmx160.getAllData(nullptr, &gyro, &accel);

  float ax = accel.x - AX_OFF, ay = accel.y - AY_OFF, az = accel.z - AZ_OFF;
  float gx = gyro.x - GX_OFF, gy = gyro.y - GY_OFF, gz = gyro.z - GZ_OFF;
  float accMag = sqrtf(ax * ax + ay * ay + az * az);

  // OLED
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("IMU Readings");
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);
  display.setCursor(0, 14);
  display.printf("A:%6.1f%6.1f%6.1f\n", ax, ay, az);
  display.printf("G:%6.1f%6.1f%6.1f\n", gx, gy, gz);
  display.printf("|A|=%.2f m/s2\n", accMag);
  display.print("A=m/s2 G=dps");
  display.display();

  // Serial
  Serial.printf("Accel (m/s2): X=%7.2f  Y=%7.2f  Z=%7.2f  |A|=%.2f\n", ax, ay,
                az, accMag);
  Serial.printf("Gyro  (dps) : X=%7.2f  Y=%7.2f  Z=%7.2f\n\n", gx, gy, gz);

  delay(100);
}
