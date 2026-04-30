# homebridge-tuya (Medion MD 10378 Air Purifier Edition)

This project is forked from [iRayanKhan/homebridge-tuya](https://github.com/iRayanKhan/homebridge-tuya) and:

- Adds first-class support for the **Medion MD 10378 Air Purifier** (3-speed, string-encoded Tuya values).
- Fixes long-standing bugs in `AirPurifierAccessory` so other 3/4/5-step purifiers also work cleanly.
- Updates the codebase for **Homebridge v2** / **HAP-NodeJS v1** compatibility.

## Features
- Full support for Medion MD 10378 Air Purifier
- Reliable speed control using the plugin's standard `_rotationStops` mechanism
- Power automatically turns on when changing speed from HomeKit
- Optional PM2.5 / Air Quality sensor
- Works on both Homebridge v1.6+ and v2.0+ (smoke-tested in CI)

## How to Use
1. **Clone this repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Link the plugin into Homebridge** (so your local code is loaded):
   ```bash
   sudo npm link
   ```
4. **Configure your device in Homebridge config.json:**
   ```json
   {
     "platform": "TuyaLan",
     "devices": [
       {
         "name": "Wohnzimmer Luftfilter",
         "type": "AirPurifier",
         "manufacturer": "Medion",
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
   The `"manufacturer": "Medion"` line is what activates the 3-speed string profile.
5. **Restart Homebridge**
   ```bash
   sudo hb-service restart
   ```

## Recommended: run as a Child Bridge (Homebridge v2)

For best stability — especially under Homebridge v2 — run this plugin in a
**Child Bridge**. This isolates the plugin's discovery sockets (UDP 6666/6667)
and prevents a plugin crash from affecting the main Homebridge process.

In the Homebridge UI:

1. Open **Plugins** → click the cog icon on `homebridge-tuya`.
2. Choose **Bridge Settings** and enable **Child Bridge**.
3. Save and restart.

## Homebridge compatibility

| Homebridge | Status |
|------------|--------|
| `^1.6.0`   | ✅ supported |
| `^2.0.0-beta.0` | ✅ supported (smoke-tested) |

Node.js: `^20.18.0` or `^22`.

## Air Purifier — What changed and why

The upstream `AirPurifierAccessory` had three bugs that prevented many devices
(including the Medion MD 10378) from working out of the box. An earlier
"hack" fork worked around them by hardcoding values for Medion — this version
removes the hack and fixes the underlying issues so the same code works for
every supported purifier.

### Bug 1 — Inverted `noRotationSpeed` guard

The constructor previously had:

```js
if (this.device.context.noRotationSpeed) {
    // ... build _rotationStops here ...
}
```

That's backwards: the speed lookup table only got built when the user
*disabled* speed control. For every other device, `_rotationStops` was
`undefined` and the conversion functions returned `undefined`/`0`. The guard
is now removed; `_rotationStops` is always built.

### Bug 2 — Computed property names not used in `setRotationSpeed`

The original payload was:

```js
const newState = {DP_SWITCH: true, DP_FAN_SPEED: ...};
```

That creates literal keys `"DP_SWITCH"` / `"DP_FAN_SPEED"` instead of `"1"` /
`"4"`, so the multi-state write never reached the device. The earlier hack
replaced this with hardcoded `{ '1': true, '4': tuyaSpeed }`. Fixed properly
to use computed property names:

```js
const newState = {
    [DP_SWITCH]: true,
    [DP_FAN_SPEED]: this.convertRotationSpeedFromHomeKitToTuya(value),
};
```

This also keeps the desirable behaviour from the hack: changing the speed in
HomeKit automatically powers the device on.

### Bug 3 — String- vs number-typed Tuya values

Some devices report `"1"` while others report `1`. The reverse lookup
(`Tuya → HomeKit`) now normalises both forms, so percentages stay in sync
regardless of how the device encodes its state.

### Manufacturer profiles

Device-specific behaviour stays in the manufacturer `switch` in the
constructor — the same pattern used for `Breville`, `Proscenic`, `siguro`. A
new `Medion` profile was added:

```js
case 'Medion':
    // Medion devices use string-encoded numeric speed values: "1", "2", "3".
    _fanSpeedLabels = {0: '0', 1: '1', 2: '2', 3: '3'};
    fanSpeedSteps = 3;
    this._rotationSteps = [...Array(4).keys()];
    break;
```

If you have another 3/4/5-step purifier that sends strings instead of
numbers, use the new `"stringSpeedValues": true` config flag (with the
appropriate `fanSpeedSteps`) instead of adding a new manufacturer.

### Speed mapping (Medion, `fanSpeedSteps: 3`)

| HomeKit slider | Tuya DP `4` |
|----------------|-------------|
| 1 → 33 %       | `"1"`        |
| 34 → 66 %      | `"2"`        |
| 67 → 100 %     | `"3"`        |

When the slider is moved off `0`, the plugin also writes `DP 1: true` so the
device powers on automatically.

## Tests

A cross-version smoke test verifies the plugin loads on both Homebridge v1
and v2:

```bash
npm test
```

GitHub Actions (`.github/workflows/ci.yml`) runs this on Node 20 + 22 against
`homebridge@latest` and `homebridge@beta` for every push and PR.

## Credits
- Original project: [iRayanKhan/homebridge-tuya](https://github.com/iRayanKhan/homebridge-tuya)
- Medion MD 10378 support, Homebridge v2 / HAP-NodeJS v1 migration, and
  `AirPurifierAccessory` refactor by Minh Tuan Nguyen

## License
MIT
