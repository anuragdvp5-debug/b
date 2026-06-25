const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const KEYS = {
    "anurag1": { type: "pro", active: true, expiry: "2026-06-28", lockedDevice: null },
    "anurag3": { type: "pro", active: true, expiry: "2026-06-28", lockedDevice: null },
    "sachin": { type: "pro", active: true, expiry: "2026-06-28", lockedDevice: null },
    "fuck": { type: "pro", active: true, expiry: "2026-06-28", lockedDevice: null },
    // TRIAL KEY: 500 device limit, 1 din ki expiry
    "AKTEAM": { type: "trial", active: true, expiry: "2026-06-27", maxDevices: 500, usedDevices: [] }
};

app.post('/connect', (req, res) => {
    const userKey = req.body.user_key; 
    const deviceId = req.body.serial; 
    
    const keyData = KEYS[userKey];

    // 1. Key check
    if (!keyData) return res.json({ "status": false, "message": "Invalid Key!" });

    // 2. Active status check
    if (!keyData.active) return res.json({ "status": false, "message": "Key Inactive! Contact Admin." });

    // 3. Expiry Check (Current date comparison)
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    if (today > keyData.expiry) {
        return res.json({ "status": false, "message": "Key has expired! Contact Admin." });
    }

    // 4. Logic: Trial vs Pro
    if (keyData.type === "trial") {
        // Agar device pehli baar aaya hai aur limit bachi hai
        if (!keyData.usedDevices.includes(deviceId) && keyData.usedDevices.length < keyData.maxDevices) {
            keyData.usedDevices.push(deviceId);
        }
        // Agar device list mein nahi hai
        if (!keyData.usedDevices.includes(deviceId)) {
            return res.json({ "status": false, "message": "Trial limit reached or invalid device!" });
        }
    } else {
        // Pro logic (Single device lock)
        if (keyData.lockedDevice === null) keyData.lockedDevice = deviceId;
        if (keyData.lockedDevice !== deviceId) {
            return res.json({ "status": false, "message": "Key is locked to another device!" });
        }
    }

    // 5. Success
    res.json({
        "status": true,
        "data": {
            "real": userKey,
            "token": "8117e9b001fb568b9279eccf5a64e08d",
            "modname": "Anurag Related",
            "mod_status": "Safe",
            "expired_date": keyData.expiry,
            "device": deviceId
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
