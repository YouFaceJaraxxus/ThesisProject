#include <Servo.h>
#include <dht11.h>
#include <ArduinoJson.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h> 
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
bool doorOpen = false;
bool bottleOpen = false;
int servoPin = D0;
int stepperPin0 = D1;
int stepperPin1 = D2;
int stepperPin2 = D3;
int stepperPin3 = D4;
int dht11Pin = D5;
int soilMoisturePin = A0;
int _step = 512; 
char _speed = 1; 
dht11 DHT11;
int autoMode = 1;
float temperature = 25.00;
float humidity = 50.00;
float wantedTemperature = 25.00;
float wantedHumidity = 20.00;
float tempDiffTop = 2.00;
float tempDiffBottom = -2.00;
float humDiffTop = 2.00;
float humDiffBottom = -2.00;

char airAction = 0;
char groundAction = 0;

float groundHumidity = 20.00;
float wantedGroundHumidity = 35.00;
int action = 0;
int reccAction = 0;
Servo myservo;

/* Set these to your desired credentials. */
const char *ssid = "your_ssid_here";
const char *password = "your_password_here";
 
//Link to read data from https://jsonplaceholder.typicode.com/comments?postId=7
//Web/Server address to read/write from 
const char *host = "temp-hum-esp8266.herokuapp.com";
const int httpsPort = 443;  //HTTPS= 443 and HTTP = 80
 
//SHA1 finger print of certificate use web browser to view and copy
StaticJsonDocument<1024> doc;
const char fingerprint[] PROGMEM = "30 82 01 0a 02 82 01 01 00 c9 cd d6 b1 f8 39 b6 2e 63 93 47 6f ec 55 e1 55 77 d1 9f 9d c6 99 12 71 61 56 ca 2e 32 37 ce 9e 4c e0 3d f4 0f 45 76 e0 b4 d1 40 e0 b4 cc 1a 0c 3f eb e8 b5 5f b6 56 98 d3 29 8a 29 ae 3e 3b 6e 0f 10 7e 4c ae a4 7d d7 dc 89 35 2d a2 fa 59 49 d3 14 07 b6 19 4a b1 6f 46 1e ec b2 78 e8 ba 66 92 bb 70 f1 ae 6a d4 7e 67 98 30 8c 6c 4f a0 c1 32 b7 5b 33 31 7f 01 51 9a 6c 1f ef fd 48 9d b3 94 2d 29 4e 6d cf d3 a4 0e 65 b9 10 13 38 90 c2 d3 96 3e 3e f6 f3 96 59 50 61 c2 71 f6 ff d5 d6 23 26 9c 54 8a c9 bc a7 d4 c0 21 99 d6 e9 48 19 e3 ce eb eb 5d 87 14 96 05 7d 2d db 08 79 d2 e0 9b 24 4e c4 94 83 b0 2e 27 3e cf c7 8e 80 00 ab 86 27 c0 a8 57 d0 35 18 70 2a d2 78 05 c2 98 7b 8b ab 50 22 00 31 4a c9 e2 5c 7c fd e3 f2 60 66 29 a3 e6 b9 f5 d1 d6 d7 53 6f 13 8e 95 d0 75 81 02 03 01 00 01";
//=======================================================================
//                    Power on setup
//=======================================================================


void setup() {
  Serial.begin(9600);
  WiFi.mode(WIFI_OFF);        //Prevents reconnection issue (taking too long to connect)
  delay(1000);
  WiFi.mode(WIFI_STA);        //Only Station No AP, This line hides the viewing of ESP as wifi hotspot
  
  WiFi.begin(ssid, password);     //Connect to your WiFi router
  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.println("connecting...");
  }
  pinMode(stepperPin0, OUTPUT);
  pinMode(stepperPin1, OUTPUT);
  pinMode(stepperPin2, OUTPUT);
  pinMode(stepperPin3, OUTPUT);
  pinMode(servoPin, OUTPUT);
  myservo.attach(servoPin);  // attaches the servo on GIO2 to the servo object
  openDoor();
  delay(1000);
  closeDoor();
  openBottle();
  closeBottle();
}

void loop() {
  int chk = DHT11.read(dht11Pin);
  humidity = (float)DHT11.humidity;
  temperature = (float)DHT11.temperature;
  groundHumidity = analogRead(soilMoisturePin);
  groundHumidity = map(groundHumidity, 0, 1023, 0, 100);

  int humComp = 0;
  int tempComp = 0;

  if(humidity - wantedHumidity > humDiffTop){
    humComp = 1;
  }
  else if(humidity-wantedHumidity<humDiffBottom){
    humComp = -1;
  }
  else humComp = 0;

  if(temperature - wantedTemperature > tempDiffTop){
    tempComp = 1;
  }
  else if(temperature-wantedTemperature<tempDiffBottom){
    tempComp = -1;
  }
  else tempComp = 0;

  int tempHumComp = humComp+tempComp;


  if(tempHumComp>0){
    airAction=1; //high temp/hum == open door
  }else if (tempHumComp<0){
    airAction = 2; //low temp/hum == close door
  }else{
    airAction = 0; //ok temp/hum == do nothing;
  }

  if(groundHumidity - wantedGroundHumidity > humDiffTop){
    groundAction=1; //high ground hum == close bottle
  }else if (groundHumidity - wantedGroundHumidity < humDiffBottom){
    groundAction = 2; //low ground hum == open bottle
  }else{
    groundAction = 0; //ok ground hum == do nothing;
  }


  if(autoMode==1){
    if(airAction==1&&!doorOpen)openDoor();
    else if(airAction==2&&doorOpen)closeDoor();

    if(groundAction==1&&bottleOpen)closeBottle();
    else if(groundAction==2&&!bottleOpen)openBottle();
  }else{
    int manualAirAction = action/10;
    int manualGroundAction = action%10;

    if(manualAirAction==1&&!doorOpen)openDoor();
    else if(manualAirAction==2&&doorOpen)closeDoor();

    if(manualGroundAction==1&&bottleOpen)closeBottle();
    else if(manualGroundAction==2&&!bottleOpen)openBottle();
  }
   

  reccAction = airAction*10+groundAction;
  /*
   * action list :
   * 0 = ok
   * 1 = ground: too humid, air/temp too high
   * 2 = ground: not humid enough, air/temp too low
  */

  WiFiClientSecure httpsClient;    //Declare object of class WiFiClient
  httpsClient.setInsecure();
 
  httpsClient.setFingerprint(fingerprint);
  httpsClient.setTimeout(15000); // 15 Seconds
  delay(1000);
  
  int r=0; //retry counter
  while((!httpsClient.connect(host, httpsPort)) && (r < 30)){
      delay(100);
      r++;
  }
  if(r==30) {
    Serial.println("Connection failed");
  }
  
  String Link;
  
  //POST Data
  Link = "/send-data";

  String postData = getData();
  String line;
  httpsClient.print(String("POST ") + Link + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" +
               "Content-Type: application/x-www-form-urlencoded"+ "\r\n" +
               "Content-Length: " + postData.length() + "\r\n\r\n" +
               postData + "\r\n" +
               "Connection: close\r\n\r\n");
 
  //Serial.println("READING HTTPSCLIENT LINES");
  while (httpsClient.connected()) {
    String line = httpsClient.readStringUntil('\n');
    //Serial.println(line);
    if (line == "\r") {
      break;
    }
  }
  while(httpsClient.available()){        
    line = httpsClient.readStringUntil('\n');  //Read Line by Line
    if(line.indexOf("wntTmp")>0){
      Serial.println("VALUABLE DATA");
      Serial.println("=================");
      Serial.println(line);
      Serial.println("=================");
      String message = "";
      DeserializationError error  = deserializeJson(doc, line);
      if(error){
        Serial.print(F("network deserializeJson() failed. "));
        Serial.println(error.c_str());
      }else{
        wantedTemperature = doc["wntTmp"];
        wantedHumidity = doc["wntHum"];
        wantedGroundHumidity = doc["wntGHum"];
        autoMode= doc["aut"];
        action = doc["act"];
        doc.clear();
        doc["msg"]="2";
        doc["t"]=wantedTemperature;
        doc["h"]=wantedHumidity;
        doc["gh"]=wantedGroundHumidity;
        doc["aut"]=autoMode;
        doc["act"]=action;
        delay(2000);
        serializeJson(doc, Serial);
      }
    }
  }
}

void closeDoor(){
  for(int num=0;num<=90;num++)
  {
     myservo.write(num);//back to 'num' degrees(0 to 180)
     delay(10);//control servo speed
  }
  doorOpen=false;
  Serial.println("closed door");
}

void openDoor(){
  for(int num=90;num>=0;num--)
  {
     myservo.write(num);//back to 'num' degrees(180 to 0)
     delay(10);//control servo speed 
  }
  doorOpen = true;
  Serial.println("opened door");
}


void openBottle(){
  Step(512);
  bottleOpen=true;
  Serial.println("opened bottle");
}

void closeBottle(){
  Step(-512);
  bottleOpen=false;
  Serial.println("closed bottle");
}

void Step(int _step)//Stepper motor rotation
{
  if(_step>=0){  // Stepper motor forward
    for(int i=0;i<_step;i++){   
      setStep(1, 0, 0, 1);
      delay(_speed); 
      setStep(1, 0, 0, 0);
      delay(_speed);
      setStep(1, 1, 0, 0);
      delay(_speed);
      setStep(0, 1, 0, 0);
      delay(_speed);
      setStep(0, 1, 1, 0);
      delay(_speed);
      setStep(0, 0, 1, 0);
      delay(_speed);
      setStep(0, 0, 1, 1);
      delay(_speed); 
      setStep(0, 0, 0, 1);
      delay(_speed);
    }
  }else{ // Stepper motor backward
     for(int i=_step;i<0;i++){  
      setStep(0, 0, 0, 1);
      delay(_speed);
      setStep(0, 0, 1, 1);
      delay(_speed);
      setStep(0, 0, 1, 0);
      delay(_speed);
      setStep(0, 1, 1, 0);
      delay(_speed);
      setStep(0, 1, 0, 0);
      delay(_speed);
      setStep(1, 1, 0, 0);
      delay(_speed);
      setStep(1, 0, 0, 0);
      delay(_speed);
      setStep(1, 0, 0, 1);
      delay(_speed);
    }
   }
}
void setStep(int a, int b, int c, int d)  
{  
    digitalWrite(stepperPin0, a);     
    digitalWrite(stepperPin1, b);     
    digitalWrite(stepperPin2, c);     
    digitalWrite(stepperPin3, d);     
}

String getData(){
  String output = "tmp=" + String(temperature);
  output+= "&hum=" + String(humidity);
  output+= "&gHum=" + String(groundHumidity);
  output+= "&act=" + String(reccAction);
  //Serial.println("OUTPUT");
  Serial.println(output);
  //Serial.println("=============");
  return output;
}
