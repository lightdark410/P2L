// ----------------------------------
// Configuration Options
// ----------------------------------
//#define ENABLE_STARTUP_DEBUG_SEQUENCES // Enable Debug Lights on Bootup. !!! Attention to high current flow. Depenend on No. of LEDs !!!
//#define ENABLE_OTA_UPDATES // Enable or Disable Over-The-Air-Updates
//#define SHOW_DEBUG_INFO // Enable or Disable Debug Information Printing over the serial port
//#define ENABLE_MDNS // Enable or Disable Multicast DNS Support


#pragma GCC system_header
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wall"
#pragma GCC diagnostic ignored "-Wextra"
#pragma GCC diagnostic ignored "-Wpedantic"


// ----------------------------------
// System Includes
// ----------------------------------
// #include <Arduino.h>
#include <Adafruit_NeoPixel.h> // used for LED control
#include <ESP8266WiFi.h> // used for Wifi connection
#ifdef ENABLE_MDNS
#include <ESP8266mDNS.h> // mDNS for OTA Updates
#endif
#include <PubSubClient.h> // used for MQTT
#ifdef ENABLE_OTA_UPDATES
#include <ArduinoOTA.h> // used for Over-the-Air-Updates
#endif
//#include <string.h>
#include <cstring> //used for {str}ing {tok}en splitting
//#include <vector>
//#include <sstream>
#include <alloca.h>
#include <Ticker.h> // used for time control

#pragma GCC diagnostic pop