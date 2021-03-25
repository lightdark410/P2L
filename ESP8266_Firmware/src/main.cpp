// ----------------------------------
// System Includes
// ----------------------------------


// ----------------------------------
// Project Includes
// ----------------------------------
#include "main.h"


// ----------------------------------
// Defines
// ----------------------------------
#define LED_PIN D4 // PIN for Data
#define LED_COUNT 49 // Total count of LEDs in a strip

#define BUFFER_SIZE 512
char buffer[BUFFER_SIZE];

#define PAYLOAD_STAT  0
#define PAYLOAD_LEDNO 1


// ----------------------------------
// Global Variables
// ----------------------------------
const char* SSID = "WLAN_IT_MA"; // SSID of Wifi to connect
const char* PASSWORD =  "schnitzelmitpommes"; // Password in clear text!!! TODO
const char* MQTTSERVER = "192.168.138.136"; // IP Address of MQTT Broker
const int MQTTPORT = 1883; // Standart Port for MQTT Server
const char* MQTTCLIENTTOPIC = "esp-0002"; // The Topic where only one Clients will subscribe
const char* MQTTGROUPTOPIC = "esp-all"; // The Topic all Clients will subscribe
const char* MQTTWELCOMETOPIC = "esp-welcome"; // The Topic where the ESP sends a welcome message, when he connects to the broker
const char* CLIENTID = "ESP8266TestClient"; // Unique client ID to connect to MQTT Broker TODO
#ifdef ENABLE_OTA_UPDATES
const char* OTAHOST = "OTA-ESP8266-TestClient-01"; // Over-the-Air hostname TODO
const char* OTAPASSWORD = "OTA-ESPadmin"; // Over-the-Air password
#endif
#ifdef ENABLE_MDNS
const char* MDNSDOMAIN = "ESPTest"; // .local will be automatically added in the library
const int MDNSLEASE = 3600; // DNS Lease Time in seconds. default 3600
#endif
const char* DELIMITER = "~"; // Delimiter used to split strings recieved in MQTT topics
const int MAXNUMOFACTIONS = 10; // How many actions will be contained in a string recieved from the broker. For strip.fill at least 6 is needed
const uint32 ONESECONDTICKER = 1000; // time in milliseconds
uint16 times[LED_COUNT]; // used for storing remaining time of LEDs
uint8 leds[LED_COUNT]; // used for storing the position of LED


// ----------------------------------
// Forward Declarations
// ----------------------------------
void parseMQTTData(char* topic, byte* payload, unsigned int length);
void lightLEDOneByOne(uint32 color, uint8 time);
void tick();
void setupSerial();
void setupLED();
void setupWifi();
void setupMQTT(bool noColor = false);
#ifdef ENABLE_OTA_UPDATES
void setupOTA();
#endif
#ifdef ENABLE_MDNS
void setupMDNS();
#endif
void setupTicker();
void reconnect();

// ----------------------------------
// Initialize Objects
// ----------------------------------
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
Ticker ticker(tick, ONESECONDTICKER); // create a Ticker for measuring time
WiFiClient espClient; // create a Wifi Client
PubSubClient client(espClient); // create a MQTT Client
#ifdef ENABLE_MDNS
MDNSResponder MDNS;
#endif


// ----------------------------------
// Common Colors
// ----------------------------------
uint32_t black = strip.Color(0, 0, 0, 0); 
uint32_t white = strip.Color(255, 255, 255, 0);
uint32_t red = strip.Color(255, 0, 0, 0);
uint32_t yellow = strip.Color(255, 255, 0, 0);
uint32_t blue = strip.Color(0, 0, 255, 0);
uint32_t green = strip.Color(0, 255, 0, 0);


void setup() {
  setupSerial(); // setup serial interface
  setupLED(); // setup LEDs, so they can blink later for debug puroses
  setupWifi(); // setup the Wifi connection. blink debug code white
  setupMQTT(); // setup the MQTT connection. blink debug code yellow
  #ifdef ENABLE_OTA_UPDATES
  setupOTA(); // setup the Over-the-Air connection, for easy updates. blink debug code blue
  #endif
  #ifdef ENABLE_MDNS
  setupMDNS(); // setup Multicast DNS for Over-The-Air Updates
  #endif
  setupTicker(); // setup a Ticker for time measuring
  strip.clear(); // turn off LED strip after initialization
  strip.show();  // push the state of the LED's
}

void loop() {
  ticker.update();
  // Check if Wifi is still connected
  if (WiFi.status() != -1)
  {
     // MQTT process incoming messages and maintain server connection
    if (!client.loop()) {
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[MQTT] Connection Lost!");
      #endif
      setupMQTT(true);
    }

    #ifdef ENABLE_OTA_UPDATES
    ArduinoOTA.handle(); // check for Wifi OTA updates
    #endif

    #ifdef ENABLE_MDNS
    MDNS.update(); // handls any multicast DNS requests
    #endif
  }

  // Try to reconnect if Wifi gets lost
  else
  {
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[Wifi] Connection Lost");
    #endif
    reconnect();
  } 
}

void lightLEDOneByOne(uint32 color, uint8 time=10){
  for(int i=0; i<LED_COUNT; i++) {

    strip.setPixelColor(i, color);
    strip.show();
    delay(time);
  }
}

void tick(){
  //Serial.println("[Ticker] tick");
  for (uint8 i = 0; i < LED_COUNT; i++)
  {
    //Serial.print("[Tick] iteration: ");
    //Serial.println(i);
    if (times[i] > 0)
    {
      //Serial.print("[Tick] > 0 : ");
      //Serial.println(times[i]);
      times[i] = times[i]-1;
      //Serial.print("[Tick] > 0 : ");
      //Serial.println(times[i]);
    }
    else
    {
      // Turns off LEDs
      strip.setPixelColor(leds[i], black);
      strip.show();
    }
  }
}

//MQTT callback
void parseMQTTData(char* topic, byte* payload, unsigned int length) {

  #ifdef SHOW_DEBUG_INFO
  Serial.println(ESP.getFreeHeap(),DEC);
  Serial.print("[MQTT] Payload recieved in: ");
  Serial.println(topic);
  #endif

  char* token[MAXNUMOFACTIONS]; // Char Array for the splitted values

  char* payload_suffixed = (char*) alloca(length + 1); // allocated on stack, must not be freed
  memcpy((void*) payload_suffixed, (const void*) payload, length);
  payload_suffixed[length] = '\0';

  #ifdef SHOW_DEBUG_INFO
  Serial.println((const char*) payload_suffixed);
  #endif
  

  token[0] = std::strtok((char*)payload_suffixed, DELIMITER); // First Index {ActionID} is manullay assigned
  
  for (size_t i = 1; i < MAXNUMOFACTIONS; i++) // all other indicies will be assigned through creating a token with NULL and the Delimiter
  {
    token[i] = std::strtok(NULL, DELIMITER);
    if (token[i] == nullptr) break;
  }

// Debug Print
#ifdef SHOW_DEBUG_INFO
  for (uint8 i = 0; i < MAXNUMOFACTIONS && token[i] != nullptr; i++)
  {
    Serial.print("Index ");
    Serial.print(i);
    Serial.print(" : ");
    Serial.println(token[i]);
  }
#endif

// DATA STRUCTURE
// [Control Byte][From][*Count][R][G][B][Time]

// Payload
// "255 255 255 255 255 uint16"
//  --- --- --- --- ---
//   |   |   |   |   |
// ActionID  |
//    LED-position
//          RGB value
// Delimiter '~'


  switch (atoi((char*)token[0])) // switches the ActionID
  {
  case 0: // Lit a single LED on Index
    {
      strip.setPixelColor(atoi((char*)token[1]), strip.Color(atoi((char*)token[2]), atoi((char*)token[3]), atoi((char*)token[4]), 0)); // [LED No.] [RGBW]
      strip.show();

      uint8 index = atoi((char*)token[1]); // get the LED No.
      times[index] = atoi((char*)token[5]); // save the time at LED index
      leds[index] = index; // save the LED at their index

      break;
    }
  case 1: // Lit a certain COUNT of LEDs from a starting INDEX
    {
      strip.fill(strip.Color(atoi((char*)token[3]), atoi((char*)token[4]), atoi((char*)token[5])), atoi((char*)token[1]), atoi((char*)token[2])); // [RGB] [LED No.] [Count]
      strip.show();

      for (uint8 i = 0; i < atoi((char*)token[2]); i++)
      {
        uint8 index = atoi((char*)token[1]) + i; // get the LED No.
        times[index] = atoi((char*)token[6]); // save the time at LED index
        leds[index] = index; // save the LED at their index
      }
      
      break;
    }

  default:
    break;
  }
}

void setupSerial(){
  Serial.begin(9600); // opens serial port at 9600 baudrate
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[Serial] Connection Established");
  #endif
}

void setupLED(){
  strip.begin();
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[LED] Initialized");
  #endif
  strip.clear(); // Set all LED's to black
  strip.show(); // Push out changes to LED's
  #ifdef ENABLE_STARTUP_DEBUG_SEQUENCES
  lightLEDOneByOne(red);
  #endif
}

void setupWifi(){
  WiFi.begin(SSID, PASSWORD);
  
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[Wifi] Initialized");

  Serial.println("[Wifi] Trying to connect...");
  #endif

  while (WiFi.status() != WL_CONNECTED) // Try to connect to Wifi
  {
    #ifdef SHOW_DEBUG_INFO
    Serial.print("[Wifi] Status: ");
    Serial.println(WiFi.status());
    #endif

    delay(500); // Wait a short amount of time for the connection

    switch (WiFi.status())
    {
     case 0: // Wi-Fi is in process of changing between statuses
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[Wifi] Wi-Fi is in process of changing between statuses");
      #endif
      break;
     case 1: // SSID cannot be reached
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[Wifi] SSID cannot be reached");
      #endif
      break;
     case 4: // Passwort is incorrect
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[Wifi] Passwort is incorrect");
      #endif
      break;
    /*
    // Spams Serial Message while not connected -> TODO
     case 6: // Module is not configured in station mode
      Serial.println("[Wifi] Module is not configured in station mode");
      break;
    */
     default:
      break;
    }
  }
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[Wifi] Connection Established");
  #endif

  #ifdef ENABLE_STARTUP_DEBUG_SEQUENCES 
  lightLEDOneByOne(white);
  #endif
}

void setupMQTT(bool noColor) {
  client.setServer(MQTTSERVER, MQTTPORT);
  client.setCallback(parseMQTTData);
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[MQTT] Initialized");
  #endif

  while (!client.connected())
  {
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[MQTT] Trying to connect...");
    #endif

    if (client.connect(CLIENTID))
    {
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[MQTT] Connection Established");
      #endif
    }
    else
    {
      switch (client.state())
      {
      case -4:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the server didn't respond within the keepalive time");
        #endif
        break;
      case -3:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the network connection was broken");
        #endif
        break;
      case -2:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the network connection failed");
        #endif
        break;
      case -1:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the client is disconnected cleanly");
        #endif
        break;
      case 0:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the client is connected");
        #endif
        break;
      case 1:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the server doesn't support the requested version of MQTT");
        #endif
        break;
      case 2:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the server rejected the client identifier");
        #endif
        break;
      case 3:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the server was unable to accept the connection");
        #endif
        break;
      case 4:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the username/password were rejected");
        #endif
        break;
      case 5:
        #ifdef SHOW_DEBUG_INFO
        Serial.println("[MQTT] the client was not authorized to connect");
        #endif
        break;

      default:
        break;
      }
    } 
  }

  client.subscribe(MQTTCLIENTTOPIC); // subscribe to individual channel
  client.subscribe(MQTTGROUPTOPIC); // subscribe to group channel
  client.publish(MQTTWELCOMETOPIC, "Hello from ESP8266-01"); //write a hello message to the welcome channel // TODO: parameterize CLIENT ID
  
  if (!noColor){
    // only light on initial setup
    #ifdef ENABLE_STARTUP_DEBUG_SEQUENCES
    lightLEDOneByOne(yellow);
    #endif
  }
}

#ifdef ENABLE_OTA_UPDATES
void setupOTA(){
  ArduinoOTA.setHostname(OTAHOST);
  ArduinoOTA.setPassword(OTAPASSWORD);

  ArduinoOTA.onStart([](){
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[OTA] Starting Update");
    #endif
  });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total){
    #ifdef SHOW_DEBUG_INFO
    Serial.printf("[OTA] Progress: %u%%\r\n", (progress / (total / 100)));
    #endif
  });

  ArduinoOTA.onEnd([](){
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[OTA] Update Finished");
    Serial.println("[OTA] Rebooting...");
    #endif
  });

  ArduinoOTA.onError([](ota_error_t error){
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[OTA] Error");
    #endif
    switch (error)
    {
    case OTA_AUTH_ERROR:
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[OTA] Auth Failed");
      #endif
      break;
    case OTA_BEGIN_ERROR:
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[OTA] Begin Failed");
      #endif
      break;
    case OTA_CONNECT_ERROR:
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[OTA] Connect Failed");
      #endif
      break;
    case OTA_RECEIVE_ERROR:
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[OTA] Receive Failed");
      #endif
      break;
    case OTA_END_ERROR:
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[OTA] End Failed");
      #endif
      break;

    default:
      break;
    }

    ESP.restart();
  });

  ArduinoOTA.begin();
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[OTA] Initialized");
  #endif

  #ifdef ENABLE_STARTUP_DEBUG_SEQUENCES
  lightLEDOneByOne(blue);
  #endif
}
#endif

// !!! MDNS seems to be under reconstruction
// A code rewrite is planned
// View here more:
// https://github.com/esp8266/Arduino/issues/7448
// 12.August 2020

// Temporary fix:
// Use OTA-Hostname instead
#ifdef ENABLE_MDNS
void setupMDNS(){ 
  //MDNS.begin(MDNSDOMAIN, MDNSLEASE);
  #ifdef SHOW_DEBUG_INFO
  //Serial.print("[IP] ");
  //Serial.println(WiFi.localIP());
  #endif
  /*
  if (MDNS1.begin("esp")) // max 63 characters // Start Mulitcast DNS
  {
    #ifdef SHOW_DEBUG_INFO
    //Serial.println("[MDNS] Initialized");
    #endif
    //mmdns.addService("http", "tcp", 80); // TODO
    Serial.println("[MDNS] Error setting up MDNS responder");
  }
  else
  {
    //Serial.println("[MDNS] Error setting up MDNS responder");
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[MDNS] Initialized");
    #endif
    //MDNS.setServiceName("esp",);
    MDNS1.addService("esp", "arduino", "tcp", 80); // TODO
  }
  */
}
#endif

void setupTicker(){
  ticker.start();
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[Ticker] Initialized");
  #endif
}

void reconnect(){
  //Reconnect Wifi
  while (WiFi.status() != WL_CONNECTED)
  {
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[Wifi] Trying to reconnect...");
    #endif
    WiFi.reconnect();
  }
  #ifdef SHOW_DEBUG_INFO
  Serial.println("[Wifi] Connection Re-Established");
  #endif

  #ifdef ENABLE_STARTUP_DEBUG_SEQUENCES
  lightLEDOneByOne(white);
  #endif

  //Reconnect MQTT
  while (!client.connected())
  {
    #ifdef SHOW_DEBUG_INFO
    Serial.println("[MQTT] Trying to reconnect...");
    #endif
    if (client.connect(CLIENTID))
    {
      #ifdef SHOW_DEBUG_INFO
      Serial.println("[MQTT] Sucessfully reconnectet");
      #endif

      #ifdef ENABLE_STARTUP_DEBUG_SEQUENCES
      lightLEDOneByOne(yellow);
      #endif
    }
  }
}
