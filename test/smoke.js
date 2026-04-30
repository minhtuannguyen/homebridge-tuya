/**
 * Smoke test: verifies the plugin loads against the installed homebridge + hap-nodejs
 * (whatever versions the matrix dropped into ./node_modules). Compatible with both
 * Homebridge v1 (HAP v0) and Homebridge v2 (HAP v1).
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const hap = require('hap-nodejs');
const hapVer = require('hap-nodejs/package.json').version;
const hbVer = (() => {
    try { return require(path.join(require.resolve('homebridge/package.json'))).version; }
    catch (e) {
        // Some homebridge versions don't expose package.json via exports; read it manually.
        const pkgPath = path.join(__dirname, '..', 'node_modules', 'homebridge', 'package.json');
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
    }
})();

const isV1Hap = !hap.Characteristic.Perms; // v1 moved enums off Characteristic

console.log(`[smoke] homebridge=${hbVer} hap-nodejs=${hapVer} (HAP v${isV1Hap ? '1' : '0'})`);

// Build a minimal Homebridge-like API
const registered = [];
const homebridge = {
    version: 2.7,
    serverVersion: hbVer,
    user: { storagePath: () => '/tmp' },
    hap,
    platformAccessory: class PlatformAccessory {
        constructor(displayName, UUID) {
            this.displayName = displayName;
            this.UUID = UUID;
            this.services = [];
            this.context = {};
        }
        addService(svc, name, subtype) {
            const s = typeof svc === 'function' ? new svc(name, subtype) : svc;
            this.services.push(s);
            return s;
        }
        removeService(s) { this.services = this.services.filter(x => x !== s); }
        getServiceById(svc, subtype) {
            const uuid = svc.UUID || (typeof svc === 'function' && new svc().UUID);
            return this.services.find(s => s.UUID === uuid && s.subtype === subtype);
        }
        getService(svc) {
            const uuid = svc.UUID || (typeof svc === 'function' && new svc().UUID);
            return this.services.find(s => s.UUID === uuid);
        }
    },
    on() {},
    registerPlatform(pluginName, platformName, ctor) {
        registered.push({ pluginName, platformName });
        homebridge._platformCtor = ctor;
    },
    registerPlatformAccessories() {},
    unregisterPlatformAccessories() {},
    updatePlatformAccessories() {},
};

// 1) Plugin loads & registers
const plugin = require(path.join(__dirname, '..', 'index.js'));
assert.strictEqual(typeof plugin, 'function');
plugin(homebridge);
assert.strictEqual(registered.length, 1);
assert.strictEqual(registered[0].pluginName, 'homebridge-tuya');
assert.strictEqual(registered[0].platformName, 'TuyaLan');
console.log('[ok] platform registered');

// 2) Platform constructs without throwing
const log = Object.assign(() => {}, { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} });
const Platform = homebridge._platformCtor;
const platformInst = new Platform(log, { devices: [] }, homebridge);
console.log('[ok] platform constructed');

// 3) EnergyCharacteristics attached & functional under both HAP versions
assert.ok(hap.EnergyCharacteristics, 'EnergyCharacteristics not attached');
const w = new hap.EnergyCharacteristics.Watts();
const Formats = hap.Formats || hap.Characteristic.Formats;
const Perms = hap.Perms || hap.Characteristic.Perms;
assert.strictEqual(w.props.format, Formats.FLOAT);
assert.ok(w.props.perms.includes(Perms.READ));
console.log('[ok] EnergyCharacteristics work');

// 4) Every lib/*.js loads
const libDir = path.join(__dirname, '..', 'lib');
const files = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
for (const f of files) require(path.join(libDir, f));
console.log(`[ok] ${files.length} accessory modules loaded`);

// 5) Categories resolved (the bug we fixed in v3.2.1)
const Categories = hap.Categories || (hap.Accessory && hap.Accessory.Categories);
assert.ok(Categories && typeof Categories.AIR_PURIFIER === 'number', 'Categories not resolvable');
console.log('[ok] hap.Categories resolved');

console.log(`\nAll smoke tests passed against homebridge@${hbVer} / hap-nodejs@${hapVer}`);
