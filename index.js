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

// 🔥 HAR KEY KI ALAG EXPIRY (YYYY-MM-DD format)
const KEYS = {
    "anurag1_device_001": {
        expiry: "2026-09-30"   // 30 Sept 2026
    },
    "anurag2_device_002": {
        expiry: "2026-10-15"   // 15 Oct 2026
    },
    "anurag3_device_003": {
        expiry: "2026-08-20"   // 20 Aug 2026
    },
    "anurag4_device_004": {
        expiry: "2026-12-31"   // 31 Dec 2026
    },
    "newuser_device_005": {
        expiry: "2026-09-10"   // 10 Sept 2026
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
    console.log(`📱 Serial: ${serial || 'N/A'}`);

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
        console.log(`⏰ Key expired: ${user_key} (Expiry: ${KEYS[user_key].expiry})`);
        return res.status(403).json({
            status: false,
            reason: 'Key Expired'
        });
    }

    // ✅ ALL CHECKS PASSED - Generate token
    const token = generateToken(user_key, serial || 'device_001');
    const rng = generateRng();

    console.log(`✅ Login success: ${user_key}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`📅 Expires: ${KEYS[user_key].expiry}`);

    res.json({
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    });
});

// ======================== ADMIN APIs ========================

// 📌 Check Key Status (Public - Only true/false)
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
        is_expired: isExpired
    });
});

// 📌 List All Keys (ONLY COUNT - NO KEYS EXPOSED)
app.get('/admin/list-keys', (req, res) => {
    const total = Object.keys(KEYS).length;
    const now = new Date();
    let active = 0;
    let expired = 0;

    Object.values(KEYS).forEach(key => {
        if (new Date(key.expiry) > now) {
            active++;
        } else {
            expired++;
        }
    });

    res.json({
        total: total,
        active: active,
        expired: expired
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
    console.log(`\n✅ ===== REGISTERED KEYS WITH EXPIRY =====`);
    Object.keys(KEYS).forEach(k => {
        console.log(`   🔑 ${k} → Expires: ${KEYS[k].expiry}`);
    });
    console.log(`\n🔒 Secure Mode: Keys not exposed in responses`);
});
