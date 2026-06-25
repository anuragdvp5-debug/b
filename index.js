const express = require('express');
const app = express();

// Middleware: JSON aur Form-data dono ke liye
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONTROL CENTER ---
// Yahan tumhari keys hain. 
// 'lockedDevice' ko 'null' rakhna, jab user login karega toh ye apne aap device ID se bhar jayega.
const KEYS = {
    "anurag1": { active: true, expiry: "2099-12-31", lockedDevice: null },
    "anurag2": { active: true, expiry: "2026-08-30", lockedDevice: null },
    "sachin": { active: true, expiry: "2026-08-30", lockedDevice: null }
};

app.get('/', (req, res) => {
    res.send('Injector Backend is Live!');
});

app.post('/connect', (req, res) => {
    // Screenshot ke mutabik field ka naam 'user_key' hai
    const userKey = req.body.user_key; 
    const deviceId = req.body.serial;  // Device ID pakadne ke liye
    
    const keyData = KEYS[userKey];

    // 1. Key check
    if (!keyData) return res.json({ "status": false, "message": "Invalid Key!" });

    // 2. Active status check
    if (!keyData.active) return res.json({ "status": false, "message": "Key Inactive! Contact Admin." });

    // 3. Device Lock Logic
    if (keyData.lockedDevice === null) {
        keyData.lockedDevice = deviceId; // Pehli baar mein device lock kar diya
    }

    // Check karo ki wahi device hai ya nahi
    if (keyData.lockedDevice !== deviceId) {
        return res.json({ "status": false, "message": "Key is locked to another device!" });
    }

    // 4. Success Response
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
