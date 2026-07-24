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

const ORIGINAL_ENCRYPTED = "K2h0zI8ViNtaDshPUZ8bT8qIDtCNypwdXEEtDcmPG8gPUAzKiE8NT1PcmNwKzI8QnJ1Kw0lVpyxXANYQ1vBB0bDh9qD3IrNzk6K0YPJjZtaRMBNH9kLTIrFjMtZC0wLkUFgKnASf2pCMyw3PCBqGXJ2a3Zqag9yPyAgJ5FHNT1wdXEDdgIAcGNxPkI8JjYmJzEBam1jbX9qTz8o0yFxcgFjT2B5fngUfX1mb2J4GWN9aHtnag9yKio/0jpGNG1obW4EwZiYnh+ehdwfmR1Y3AZYHdwY3E8hB1iCH5kCbDoeWt8ZXwBLTI=";

app.get('/connec', (req, res) => {
    const userKey = req.query.key;
    const deviceId = req.query.device_id;

    console.log(`📥 Request: key=${userKey}, device=${deviceId}`);

    const keyData = KEYS[userKey];

    // 🔥 ORIGINAL HEADERS SET KARO (Original server jaisa)
    res.set({
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': 'Thu, 19 Nov 1981 08:52:00 GMT',
        'X-Powered-By': 'PHP/8.0.30',
        'Server': 'LiteSpeed'
    });

    // 🔥 SEND KARO
    res.send(ORIGINAL_ENCRYPTED);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
