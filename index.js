const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_FILE = './database.json';

let KEYS = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {
    "B2ALTRIAL": { type: "pro", active: true, expiry: "2026-07-26", lockedDevice: null },
    "ANURAG81": { type: "pro", active: true, expiry: "2026-07-26", lockedDevice: null },
    "SACHIN": { type: "pro", active: true, expiry: "2026-07-26", lockedDevice: null },
    "ANURAG16": { type: "pro", active: true, expiry: "2026-07-29", lockedDevice: null },
    "leonardi": { type: "pro", active: true, expiry: "2026-07-12", lockedDevice: null },
    "TRIAHGL": { type: "trial", active: true, expiry: "2026-06-28", maxDevices: 500, usedDevices: [] }
};

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(KEYS, null, 2));
}

// 🔥 FIX: GET request handle karo
app.get('/connec', (req, res) => {
    // 🔥 FIX: Query params se data lo
    const userKey = req.query.key;           // APK "key" bhej raha hai
    const deviceId = req.query.device_id;    // APK "device_id" bhej raha hai

    console.log(`📥 Request: key=${userKey}, device=${deviceId}`);

    const keyData = KEYS[userKey];

    if (!keyData) {
        return res.json({ "status": false, "message": "Invalid Key!" });
    }
    if (!keyData.active) {
        return res.json({ "status": false, "message": "Key Inactive!" });
    }

    const today = new Date().toISOString().split('T')[0];
    if (today > keyData.expiry) {
        return res.json({ "status": false, "message": "Key has expired!" });
    }

    if (keyData.type === "trial") {
        if (!keyData.usedDevices.includes(deviceId) && keyData.usedDevices.length < keyData.maxDevices) {
            keyData.usedDevices.push(deviceId);
            saveDB();
        }
        if (!keyData.usedDevices.includes(deviceId)) {
            return res.json({ "status": false, "message": "Limit reached!" });
        }
    } else {
        if (keyData.lockedDevice === null) {
            keyData.lockedDevice = deviceId;
            saveDB();
        }
        if (keyData.lockedDevice !== deviceId) {
            return res.json({ "status": false, "message": "Key is locked to another device!" });
        }
    }

    // 🔥 Original response format match karo
    res.json({
        "status": true,
        "message": "Login Successful",
        "access": 1,
        "provider": "google",
        "validity": 30,
        "login": 1,
        "expired": 0
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
