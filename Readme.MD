# homebridge-tuya (Medion MD 10378 Air Purifier Edition)

This project is cloned from [iRayanKhan/homebridge-tuya](https://github.com/iRayanKhan/homebridge-tuya) and adjusted to make the Medion MD 10378 Air Purifier work reliably with Homebridge and HomeKit.

## Features
- Full support for Medion MD 10378 Air Purifier
- Reliable speed control (HomeKit → Tuya mapping)

## How to Use
1. **Clone this repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure your device in Homebridge config.json:**
   ```json
   {
     "platform": "TuyaLan",
     "devices": [
       {
         "name": "medion",
         "type": "AirPurifier",
         "id": "your_device_id",
         "key": "your_device_key",
         "ip": "your_device_ip",
         "fanSpeedSteps": 3,
         "showAirQuality": true,
         "nameAirQuality": "Living Room Air Quality"
       }
     ]
   }
   ```
4. **Restart Homebridge**

## Device-Specific Adjustments
- Speed control is mapped: HomeKit 0–33 → Tuya "1", 34–66 → "2", 67–100 → "3"
- Air Quality Sensor reports PM2.5 and overall air quality
- Always sets power on when adjusting speed

## Credits
- Original project: [iRayanKhan/homebridge-tuya](https://github.com/iRayanKhan/homebridge-tuya)
- Adjustments for Medion MD 10378 by [your name]

## License
MIT
