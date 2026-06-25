const express = require('express');
const app = express();

// Ye dono lines zaroori hain taaki JSON aur Form-data dono kaam karein
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MY_VALID_KEY = "anurag";

app.get('/', (req, res) => {
    res.send('Injector Backend is Live!');
});

app.post('/connect', (req, res) => {
    // Screenshot ke mutabik field ka naam 'user_key' hai
    const clientKey = req.body.user_key; 
    
    // Debugging: Agar abhi bhi error aaye, toh Render ke Logs mein ye dikhega
    console.log("Request received, user_key:", clientKey);

    if (clientKey === MY_VALID_KEY) {
        res.json({
            "status": true,
            "data": {
                "real": MY_VALID_KEY,
                "token": "8117e9b001fb568b9279eccf5a64e08d",
                "modname": "Aryanispe Related",
                "mod_status": "Safe",
                "credit": "GIVE FEEDBACK",
                "ESP": "off",
                "Item": "off",
                "AIM": "off",
                "SilentAim": "off",
                "BulletTrack": "off",
                "Floating": "off",
                "Memory": "off",
                "Setting": "off",
                "expired_date": "2099-12-31 23:59:59",
                "EXP": "2099-12-31 23:59:59",
                "exdate": "2099-12-31 23:59:59",
                "device": "1000",
                "rng": 1782299913
            }
        });
    } else {
        res.json({
            "status": false,
            "message": "Invalid Key! Access Denied."
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
