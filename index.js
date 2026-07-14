const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File jahan keys save hongi
const DB_FILE = './database.json';

// Initial data load
let KEYS = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {
    "ANURAG81": { type: "pro", active: true, expiry: "2026-07-26", lockedDevice: null },
    "SACHIN": { type: "pro", active: true, expiry: "2026-07-26", lockedDevice: null },
    

    "ANURAG16": { type: "pro", active: true, expiry: "2026-07-29", lockedDevice: null },

    "leonardi": { type: "pro", active: true, expiry: "2026-07-12", lockedDevice: null },
    
    
    "TRIAHGL": { type: "trial", active: true, expiry: "2026-06-28", maxDevices: 500, usedDevices: [] }
};

// Data save karne ka function
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(KEYS, null, 2));
}

app.post('/connect', (req, res) => {
    const userKey = req.body.user_key;
    const deviceId = req.body.serial;
    
    const keyData = KEYS[userKey];

    if (!keyData) return res.json({ "status": false, "message": "Invalid Key!" });
    if (!keyData.active) return res.json({ "status": false, "message": "Key Inactive!" });

    const today = new Date().toISOString().split('T')[0];
    if (today > keyData.expiry) return res.json({ "status": false, "message": "Key has expired!" });

    if (keyData.type === "trial") {
        if (!keyData.usedDevices.includes(deviceId) && keyData.usedDevices.length < keyData.maxDevices) {
            keyData.usedDevices.push(deviceId);
            saveDB(); // Save after update
        }
        if (!keyData.usedDevices.includes(deviceId)) return res.json({ "status": false, "message": "Limit reached!" });
    } else {
        // PRO: Single device lock
        if (keyData.lockedDevice === null) {
            keyData.lockedDevice = deviceId;
            saveDB(); // Yahan lock ho gaya, aur permanently save ho gaya!
        }
        
        if (keyData.lockedDevice !== deviceId) {
            return res.json({ "status": false, "message": "Key is locked to another device!" });
        }
    }

    res.json({
        "status": true,
        "data": { "real": userKey, "token": "8117e9b001fb568b9279eccf5a64e08d", "modname": "Anurag Related", "mod_status": "Safe", "expired_date": keyData.expiry, "device": deviceId }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));











// ==========================================
// START: CONFIGURATION FOR NEW APK (v2)


const crypto = require('crypto');

app.post('/connect-v2', (req, res) => {
    const { user_key, serial } = req.body;
    const secret = "Vm8Lk7Uj2JmsjCPVPVjrLa7zgfX3uz9E"; // Jo screenshot mein hai
    
    // 1. MD5 Hash Generate karo
    const inputString = `${user_key}|${serial}|${secret}`;
    const token = crypto.createHash('md5').update(inputString).digest('hex');
    
    // 2. Current Timestamp (seconds mein)
    const timestamp = Math.floor(Date.now() / 1000);

    // 3. Response bhejo
    res.status(200).json({
        "status": true,
        "data": {
            "token": token,
            "timestamp": timestamp 
        }
    });
});




