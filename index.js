const express = require('express');
const app = express();
app.use(express.json());

// Ye wohi path hai jo tumhari .so file me hai
app.post('/connect', (req, res) => {
    res.json({
        "status": true,
        "data": {
            "real": "key-@toxicteamofc-1acc74bd6862522a3c08c21371265bffa676e6c9d8789d673a873e9d4e3e0ce3-Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E",
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
