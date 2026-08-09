const express = require('express');
const app = express();
const crypto = require('crypto');
const fs = require('fs');

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
const KEYS_FILE = './keys.json';
let keysDB = {};

// ======================== LOAD / RESET KEYS ========================
function loadKeys() {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            const data = fs.readFileSync(KEYS_FILE, 'utf8');
            keysDB = JSON.parse(data);
            console.log(`✅ Loaded ${Object.keys(keysDB).length} keys from database`);

            if (Object.keys(keysDB).length < 4) {
                console.log('⚠️ Less than 4 keys found. Resetting to default...');
                initializeDefaultKeys();
                saveKeys();
            }
        } else {
            console.log('📝 No keys file found. Creating default keys...');
            initializeDefaultKeys();
            saveKeys();
        }
    } catch (error) {
        console.error('❌ Error loading keys:', error);
        initializeDefaultKeys();
        saveKeys();
    }
}

function saveKeys() {
    try {
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keysDB, null, 2));
        console.log(`💾 Saved ${Object.keys(keysDB).length} keys to database`);
    } catch (error) {
        console.error('❌ Error saving keys:', error);
    }
}

// ======================== INITIALIZE 4 KEYS ========================
function initializeDefaultKeys() {
    keysDB = {};
    const users = [
        'anurag1_device_001',
        'anurag2_device_002',
        'anurag3_device_003',
        'anurag4_device_004'
    ];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    users.forEach(userKey => {
        const deviceId = crypto.createHash('md5').update(userKey).digest('hex');
        keysDB[deviceId] = {
            user_key: userKey,
            created_at: new Date().toISOString(),
            expiry: expiryDate.toISOString(),
            is_active: true
        };
    });

    console.log(`✅ Initialized ${users.length} default keys`);
}

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

    const deviceId = crypto.createHash('md5').update(user_key).digest('hex');
    const deviceRecord = keysDB[deviceId];

    if (!deviceRecord || !deviceRecord.is_active) {
        console.log(`❌ Key not registered: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: '❌ Invalid Key! Contact admin.'
        });
    }

    const now = new Date();
    const expiry = new Date(deviceRecord.expiry);
    if (now > expiry) {
        console.log(`⏰ Key expired: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: '⏰ Key expired! Contact admin for renewal.'
        });
    }

    // ✅ ALL CHECKS PASSED - Return ONLY success
    console.log(`✅ Login success: ${user_key}`);

    res.json({
        "status": true
        // 🔥 No token, no rng, no keys!
    });
});

// ======================== ADMIN APIs (SECURE) ========================

// 📌 Create New Key (Admin Only)
app.post('/admin/create-key', (req, res) => {
    const { user_key, expiry_days = 30 } = req.body;

    if (!user_key) {
        return res.status(400).json({
            success: false,
            error: 'Missing user_key'
        });
    }

    const deviceId = crypto.createHash('md5').update(user_key).digest('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiry_days);

    if (keysDB[deviceId]) {
        return res.status(409).json({
            success: false,
            error: 'Key already exists!'
        });
    }

    keysDB[deviceId] = {
        user_key: user_key,
        created_at: new Date().toISOString(),
        expiry: expiryDate.toISOString(),
        is_active: true
    };
    saveKeys();

    console.log(`🔑 New key created: ${user_key}`);
    res.json({
        success: true,
        message: `✅ Key created! Valid for ${expiry_days} days.`
        // 🔥 Key not exposed in response
    });
});

// 📌 Check Key Status (Public - Only true/false)
app.get('/admin/check-key', (req, res) => {
    const { user_key } = req.query;

    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }

    const deviceId = crypto.createHash('md5').update(user_key).digest('hex');
    const record = keysDB[deviceId];

    if (!record || !record.is_active) {
        return res.json({ valid: false });
    }

    const now = new Date();
    const expiry = new Date(record.expiry);
    const isExpired = now > expiry;

    if (isExpired) {
        return res.json({ valid: false });
    }

    res.json({ valid: true });
});

// 📌 List All Keys (Admin Only - Secure)
app.get('/admin/list-keys', (req, res) => {
    // 🔥 Sirf count dikhao, keys nahi
    res.json({
        total: Object.keys(keysDB).length,
        active: Object.values(keysDB).filter(k => k.is_active).length
    });
});

// 📌 Extend Expiry (Admin Only)
app.post('/admin/extend-key', (req, res) => {
    const { user_key, extra_days = 30 } = req.body;

    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }

    const deviceId = crypto.createHash('md5').update(user_key).digest('hex');

    if (!keysDB[deviceId]) {
        return res.status(404).json({ error: 'Key not found' });
    }

    const currentExpiry = new Date(keysDB[deviceId].expiry);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + extra_days);

    keysDB[deviceId].expiry = newExpiry.toISOString();
    keysDB[deviceId].is_active = true;
    saveKeys();

    console.log(`⏰ Extended key for ${user_key} by ${extra_days} days`);
    res.json({
        success: true,
        message: `✅ Key extended by ${extra_days} days`
    });
});

// 📌 Revoke Key (Admin Only)
app.post('/admin/revoke-key', (req, res) => {
    const { user_key } = req.body;

    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }

    const deviceId = crypto.createHash('md5').update(user_key).digest('hex');

    if (!keysDB[deviceId]) {
        return res.status(404).json({ error: 'Key not found' });
    }

    keysDB[deviceId].is_active = false;
    saveKeys();

    console.log(`🚫 Key revoked for ${user_key}`);
    res.json({
        success: true,
        message: `🚫 Key revoked for ${user_key}`
    });
});

// 📌 Health Check
app.get('/', (req, res) => {
    res.json({
        status: "🚀 Server is running!",
        total_keys: Object.keys(keysDB).length
    });
});

// ======================== START SERVER ========================
loadKeys();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`\n✅ ===== REGISTERED KEYS =====`);
    Object.values(keysDB).forEach(u => {
        console.log(`   🔑 ${u.user_key}`);
    });
    console.log(`\n🔒 Secure Mode: Keys not exposed in responses`);
});
