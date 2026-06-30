const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File jahan keys save hongi
const DB_FILE = './database.json';

// Initial data load
let KEYS = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {
    "ANURAG": { type: "pro", active: true, expiry: "2026-07-26", lockedDevice: null },
    "SACHIN": { type: "pro", active: true, expiry: "2026-07-26", lockedDevice: null },
    
    "SANDEEP": { type: "pro", active: true, expiry: "2026-06-29", lockedDevice: null },

    "ANURAG1": { type: "pro", active: true, expiry: "2026-07-29", lockedDevice: null },
    
    "TRIAL": { type: "trial", active: true, expiry: "2026-06-28", maxDevices: 500, usedDevices: [] }
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





// --- CENTRALIZED INJECTOR CONTROL (BKL HOOKS) ---

app.get('/bkl-verify', (req, res) => {
    // 1. App se aane wale parameters log karo (Taaki pata chale ki request sahi aa rahi hai)
    const { id, key, hwid, model } = req.query;
    console.log(`[+] Login Request -> ID: ${id} | Key: ${key} | HWID: ${hwid} | Model: ${model}`);

    // 2. Maintenance Check
    const isMaintenance = false;
    if (isMaintenance) {
        return res.send("MAINTENANCE"); // App ka 'onPostExecute' check karega ki "SUCCESS" hai ya nahi
    }

    // 3. Response: App 'SUCCESS' string dhund rahi hai
    // Hum simple text bhej rahe hain taaki parsing mein error na aaye
    res.status(200).send("SUCCESS");
});

// --- Config Endpoint (Agar app kabhi config mangti hai) ---
app.get('/bkl-config', (req, res) => {
    res.json({
        "status": "online",
        "version": "1.0.0",
        "announcement": "Welcome to BKL Hook System!"
    });
});


