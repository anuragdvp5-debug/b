const express = require('express');
const app = express();
const crypto = require('crypto');

// ======================== MIDDLEWARE ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// ======================== CONFIG ========================
const SECRET_KEY = "Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E";

// 🔥 HAR KEY KI ALAG EXPIRY + DEVICE BINDING
const KEYS = {
    "anurag1_device_001": {
        expiry: "2026-09-30",
        device_id: null   // 🔥 Pehli baar login pe set hoga
    },
    "anurag2_device_002": {
        expiry: "2026-10-15",
        device_id: null
    },
    "anurag3_device_003": {
        expiry: "2026-08-20",
        device_id: null
    },
    "anurag4_device_004": {
        expiry: "2026-12-31",
        device_id: null
    },
    "newuser_device_005": {
        expiry: "2026-09-10",
        device_id: null
    }
};

// ======================== TOKEN GENERATION ========================
function generateToken(user_key, serial) {
    const data = `PUBG-${user_key}-${serial}-${SECRET_KEY}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

function generateRng() {
    return Math.floor(Math.random() * 2000000000) + 1000000000;
}

// ======================== API: APP LOGIN ========================
app.post('/connect/*', (req, res) => {
    console.log(`\n📥 Login attempt:`, req.body);

    const { user_key, serial } = req.body;

    if (!user_key) {
        return res.status(400).json({
            status: false,
            reason: 'Missing key'
        });
    }

    console.log(`🔑 Received Key: ${user_key}`);
    console.log(`📱 Device Serial: ${serial || 'N/A'}`);

    // 🔥 Check if key exists
    if (!KEYS[user_key]) {
        console.log(`❌ Key not registered: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: 'Invalid Key'
        });
    }

    // 🔥 Check expiry
    const expiryDate = new Date(KEYS[user_key].expiry);
    const now = new Date();
    if (now > expiryDate) {
        console.log(`⏰ Key expired: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: 'Key Expired'
        });
    }

    // 🔥 1 KEY = 1 DEVICE CHECK
    const keyData = KEYS[user_key];
    if (keyData.device_id === null) {
        // ✅ Pehli baar login - Device bind karo
        keyData.device_id = serial;
        console.log(`🔗 Device bound: ${user_key} → ${serial}`);
    } else if (keyData.device_id !== serial) {
        // ❌ Different device trying to use same key
        console.log(`❌ Device mismatch! ${user_key} is bound to ${keyData.device_id}, but trying from ${serial}`);
        return res.status(403).json({
            status: false,
            reason: 'This key is already used on another device!'
        });
    }

    // ✅ ALL CHECKS PASSED - Generate token
    const token = generateToken(user_key, serial);
    const rng = generateRng();

    console.log(`✅ Login success: ${user_key}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`📅 Expires: ${KEYS[user_key].expiry}`);
    console.log(`📱 Bound Device: ${KEYS[user_key].device_id}`);

    res.json({
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    });
});

// ======================== ADMIN APIs ========================

// 📌 Check Key Status
app.get('/admin/check-key', (req, res) => {
    const { user_key } = req.query;

    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }

    if (!KEYS[user_key]) {
        return res.json({ valid: false, reason: 'Key not found' });
    }

    const expiryDate = new Date(KEYS[user_key].expiry);
    const now = new Date();
    const isExpired = now > expiryDate;

    res.json({
        valid: !isExpired,
        expires_on: KEYS[user_key].expiry,
        is_expired: isExpired,
        device_bound: KEYS[user_key].device_id !== null,
        device_id: KEYS[user_key].device_id || 'Not bound yet'
    });
});

// 📌 List All Keys (ONLY COUNT)
app.get('/admin/list-keys', (req, res) => {
    const total = Object.keys(KEYS).length;
    const now = new Date();
    let active = 0;
    let expired = 0;
    let bound = 0;

    Object.values(KEYS).forEach(key => {
        if (new Date(key.expiry) > now) {
            active++;
        } else {
            expired++;
        }
        if (key.device_id !== null) {
            bound++;
        }
    });

    res.json({
        total: total,
        active: active,
        expired: expired,
        device_bound: bound
    });
});

// 📌 Reset Device Binding (Admin - Agar device change karna ho)
app.post('/admin/reset-device', (req, res) => {
    const { user_key } = req.body;

    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }

    if (!KEYS[user_key]) {
        return res.status(404).json({ error: 'Key not found' });
    }

    KEYS[user_key].device_id = null;
    console.log(`🔄 Device binding reset for: ${user_key}`);

    res.json({
        success: true,
        message: `Device binding reset for ${user_key}`
    });
});

// 📌 Health Check
app.get('/', (req, res) => {
    res.json({
        status: "🚀 Server is running!",
        total_keys: Object.keys(KEYS).length
    });
});

// ======================== START SERVER ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`\n✅ ===== REGISTERED KEYS =====`);
    Object.keys(KEYS).forEach(k => {
        const bound = KEYS[k].device_id ? `🔒 Bound to: ${KEYS[k].device_id}` : '🔓 Not bound yet';
        console.log(`   🔑 ${k} → Expires: ${KEYS[k].expiry} | ${bound}`);
    });
    console.log(`\n🔒 1 Key = 1 Device Mode ACTIVE`);
});
