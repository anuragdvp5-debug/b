const express = require('express');
const app = express();
app.use(express.json());

// Key ab sirf "anurag" hai
const MY_VALID_KEY = "anurag";

app.get('/', (req, res) => {
    res.send('Injector Backend is Live!');
});

app.post('/connect', (req, res) => {
    // Injector se aane wala data check karo
    const clientKey = req.body.key; 

    // Validation Logic
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
        // Agar key galat hai toh status false bhej do
        res.json({
            "status": false,
            "message": "Invalid Key! Access Denied."
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
