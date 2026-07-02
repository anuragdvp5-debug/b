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
    
    "SANDEEP": { type: "pro", active: true, expiry: "2026-07-02", lockedDevice: null },

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
app.get('/exec', (req, res) => {
    // 1. App se aane wala data capture karo
    const clientHwid = req.query.hwid;
    const clientModel = req.query.model;
    const clientKey = req.query.key;

    // 2. Logging: Dekho ki kya aa raha hai (Render/Local console mein)
    console.log(`Connection from: ${clientModel} | HWID: ${clientHwid} | Key: ${clientKey}`);

    // 3. Response Headers (Wahi jo pehle the)
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Connection': 'keep-alive',
        'Reporting-Endpoints': 'default="/macros/web-reports?bl=editors.maestro_20260622.01_p3&context=eJwV0PtXlHUCB2B55_1-3lBAHRgHUAS56GRGaEe0ZUZih-GiOYikLYuLh0O4El4ACbFFV3RlF0qqbcOTZdwGnMRI8ZiISavBttrpCF52SbFMEBAYxxyVGUPYz_7w_APP5GPT4uYPS2Z67vYD6UUSLzgkTzq73CF10PcLH0nXKHrPIymebuaMSnfIu2lUCqFf9E7JRZ0Gp9RN725wSgdoyttOyZs2jTilYnp_vUuqobkXXVI4lXS6pDL6Vv1EukSt1U-k8_TCzjEpmq7_fly6Ta0T49J58giYkHxo1o4JKZQ-3D5JVU-5FjdVEdmrJdUoNbdLqlbamqJSbaeUEpUqjR6WqlRjdN2iUv34f3dUqn667i6rblO1_Teylb7SR8nJyVHyfyr0cj81H9DLreSx1CD7kPllgxwda5CXjC6T4-lYQozcQjErYuRE0hb_Vg6kklyjXEbbC43yn6m51ih_Q59-YZQbKO-kUd5BiytjZRPNTzXJUTSYbZLv08o8k7yGcttMchEl9JvkVWRdHCcfoyuj8fINqshJkCvpkjpR_i8VKcvl3TS8uko4SL23SoTQPFpKupYqEUEpLdUikxY_rBYGSkiqFauoq6NO_EDHe-rEafreXieuUXy2RSTRnk0WUU6-FRaho7V9FpFO8vF64UF-5gYxh34uaRC_kPZsgwikxfsOCwPdHDksbORvOyzmU32gVXxOoyutQjFbxf1Uq3BS_lGrKL97RPydPho6ImpI-3yjCKSkFY3iNTKZG8VKCitqFJHUubNRdNPBzCZRS-YtTWItDRQOCTv1q4fFY_pH9Ij4hBrPj4gTtO93NrGfDhy0iSraV28TlVS8zi7eoalWD2hJN80TETR-yhNo8cTl7zzRS4m-Xkil2C-98Cpldnghh16qmooY6m2ejmH6IEKNj6nJrEYbrW1SI53-ekKNdyk52Bup1LPEG330bYY3LtHkmz5Q0zk3Dbooy6zBZtq9Q4O_0a63NCil3gsaOEhc1EBDOlpKpVRJX1_V4BLpVszAUvqpZgYGKLNnBnLodo4WQ_TjhBb9VLbBF-_TxiZf5NJYrR_kOj94-vojgKLK_WGkZKc_UmnWezMRSm7ts-BOM4_OxiT7bDxDS5QgRFPSG0H4tCUIDfRd3RxcIcPPc2AieUEwPOhheDDGaFtpMP5EgWXBmEeOqmD8SprxYATQ5_oQnKTTBSE4RwNXQ2CnvMZQdJKdRmniRhiUnjDcCp2LQSp9bS4qaK2sQzplCB2y6S_Q4R16w0uHfIpcoMMyyqzVIYeG-nV4QMrRKEyliQV6TH1ejwNmPaooqNIAHaWVLUMmrXePxh-pvS4aV6ncEo2D9HH7y6ij5YdisJoyumKQTQFDMQij_ZuM-JB6thnRR88WGbGQXt1rxDqyaWLxiC7ci0UXZRebkEd77CZ8QPnqOLxFP-2OwwB9YomDhY4XxPMqHulH47GBhrvj4aCvbsWjnc6EJ-Ab8r6VgJl0yD0R9fRcUCKi6Om9Xgh7L86v6sNFSlndhzTa4upDIdV81o_PqKGxH010JXEAN-hs0gA66I5lEDaqnXsXR-iHvUO4S5tHhvAmRaqHsYzunBqBjVwRNrgvtMEz0QYN7cmyoZySu21IJTfDPbjTuRN2XKDLf7iP62TVP8AxGkh2wE5rEh8jizqSHuManXrixNf0b18XOqk51oVWCup2QUeD4y64KK3pCTIppXkMabQj4ylKaMvJpyikuImnMFOzNI5WGtZOwEGlxklKBWlq3ZQAeqVMUtaRc4ZKmaRVKbF-KuUVevN1WdlJbWdl5V9UoBdKMX0UBaWGVuyCkkKyA4oHdYVNUaboPBRv2njFQ8mll-Z5KTF061kvZZC-HPBS2sghpiu_0qEvpiv1lB2gVvLIVOetrKHp230UPzp3xkfposLdWmUXhYb4Kgsovc1X2UCS_0xlMk3752zFl9RTnjl9Zv9lTLMO3XPzl02ZG7cGz856Pbtga_628M0ZWdsK8reuXxSxKDIictGi8IiF63Nf_B9vIAiB&build-label=editors.maestro_20260622.01_p3&is-cached-offline=false"'
    });

    // 4. Response: App ko lagna chahiye ki uska HWID server ne accept kar liya
    res.end("SUCCESS\n");
});


