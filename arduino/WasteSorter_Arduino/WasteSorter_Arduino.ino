/*
  WasteSorter Arduino (MG995 x2) - listens over Serial for:
    'O' -> Organic bin servo
    'I' -> Inorganic bin servo
    'E' -> Empty (do nothing / close both)

  Wiring (MG995):
    - Red  -> External 5V (capable current, 2A+ recommended for 2 servos)
    - Brown/Black -> GND (IMPORTANT: share ground with Arduino GND)
    - Orange -> Signal pin

  Default pins:
    SERVO_ORGANIC   -> D9
    SERVO_INORGANIC -> D10
*/

#include <Servo.h>

static const int SERVO_ORGANIC_PIN = 9;
static const int SERVO_INORGANIC_PIN = 10;

// angles (adjust for your mechanism)
static const int CLOSED_ANGLE = 0;
static const int OPEN_ANGLE   = 90;

// how long to keep bin open (ms)
static const unsigned long OPEN_MS = 1400;

Servo servoO;
Servo servoI;

void closeBoth() {
  servoO.write(CLOSED_ANGLE);
  servoI.write(CLOSED_ANGLE);
}

void openOrganic() {
  servoO.write(OPEN_ANGLE);
  delay(OPEN_MS);
  servoO.write(CLOSED_ANGLE);
}

void openInorganic() {
  servoI.write(OPEN_ANGLE);
  delay(OPEN_MS);
  servoI.write(CLOSED_ANGLE);
}

void setup() {
  Serial.begin(115200);

  servoO.attach(SERVO_ORGANIC_PIN);
  servoI.attach(SERVO_INORGANIC_PIN);

  closeBoth();
  Serial.println("Arduino WasteSorter Ready. Waiting for O/I/E...");
}

void loop() {
  if (!Serial.available()) return;

  char c = (char)Serial.read();

  // ignore newlines
  if (c == '\n' || c == '\r') return;

  if (c == 'E') {
    closeBoth();
    Serial.println("E -> close");
  } else if (c == 'O') {
    Serial.println("O -> open organic");
    openOrganic();
  } else if (c == 'I') {
    Serial.println("I -> open inorganic");
    openInorganic();
  } else {
    // ignore
  }
}
