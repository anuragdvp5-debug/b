const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const KEYS = {
    "anurag1": { active: true, expiry: "2099-12-31", lockedDevice: null },
    "anurag3": { active: true, expiry: "2026-06-20", lockedDevice: null }, // Example: Iski date nikal gayi hai
    "sachin": { active: true, expiry: "2026-08-30", lockedDevice: null }
};

app.post('/connect', (req, res) => {
    const userKey = req.body.user_key; 
    const deviceId = req.body.serial; 
    
    const keyData = KEYS[userKey];

    // 1. Key check
    if (!keyData) return res.json({ "status": false, "message": "Invalid Key!" });

    // 2. Active status check
    if (!keyData.active) return res.json({ "status": false, "message": "Key Inactive! Contact Admin." });

    // 3. --- NEW: DATE EXPIRY LOGIC ---
    const today = new Date(); // Current date (2026-06-25)
    const expiryDate = new Date(keyData.expiry);
    
    // Agar aaj ki date expiry date se badi hai
    if (today > expiryDate) {
        return res.json({ "status": false, "message": "Key has expired! Contact Admin." });
    }
    // ---------------------------------

    // 4. Device Lock Logic
    if (keyData.lockedDevice === null) {
        keyData.lockedDevice = deviceId; 
    }

    if (keyData.lockedDevice !== deviceId) {
        return res.json({ "status": false, "message": "Key is locked to another device!" });
    }

    // 5. Success
    res.json({
        "status": true,
        "data": {
            "real": userKey,
            "token": "8117e9b001fb568b9279eccf5a64e08d",
            "modname": "Aryanispe Related",
            "mod_status": "Safe",
            "expired_date": keyData.expiry,
            "device": deviceId
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
