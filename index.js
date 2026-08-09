const express = require('express');
const app = express();
const crypto = require('crypto');
const fs = require('fs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

const SECRET_KEY = "Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E";
const KEYS_FILE = './keys.json';
let keysDB = {};

function loadKeys() {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            const data = fs.readFileSync(KEYS_FILE, 'utf8');
            keysDB = JSON.parse(data);
            console.log(`✅ Loaded ${Object.keys(keysDB).length} keys`);
        } else {
            console.log('📝 Creating new keys database with 4 users...');
            initializeDefaultKeys();
            saveKeys();
        }
    } catch (error) {
        console.error('❌ Error loading keys:', error);
        keysDB = {};
    }
}

function saveKeys() {
    try {
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keysDB, null, 2));
        console.log(`💾 Saved ${Object.keys(keysDB).length} keys`);
    } catch (error) {
        console.error('❌ Error saving keys:', error);
    }
}

function initializeDefaultKeys() {
    const users = [
        { user_key: 'anurag1', serial: 'device_001', key: 'anurag1_device_001' },
        { user_key: 'anurag2', serial: 'device_002', key: 'anurag2_device_002' },
        { user_key: 'anurag3', serial: 'device_003', key: 'anurag3_device_003' },
        { user_key: 'anurag4', serial: 'device_004', key: 'anurag4_device_004' }
    ];
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    users.forEach(user => {
        const deviceId = generateDeviceId(user.user_key, user.serial);
        keysDB[deviceId] = {
            key: user.key,
            user_key: user.user_key,
            serial: user.serial,
            created_at: new Date().toISOString(),
            expiry: expiryDate.toISOString(),
            is_active: true
        };
    });
    
    console.log(`✅ Initialized 4 keys for anurag1, anurag2, anurag3, anurag4`);
}

function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

function generateDeviceId(user_key, serial) {
    return crypto.createHash('md5').update(`${user_key}-${serial}`).digest('hex');
}

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
    
    const { game, key } = req.body;
    
    if (!key) {
        return res.status(400).json({
            status: false,
            reason: 'Missing key'
        });
    }
    
    // 🔥 Key format: "anurag1_device_001"
    const parts = key.split('_');
    if (parts.length !== 2) {
        return res.status(400).json({
            status: false,
            reason: 'Invalid key format! Use: username_serial'
        });
    }
    
    const user_key = parts[0];
    const serial = parts[1];
    
    const deviceId = generateDeviceId(user_key, serial);
    const deviceRecord = keysDB[deviceId];
    
    if (!deviceRecord || !deviceRecord.is_active) {
        console.log(`❌ Device ${user_key} not registered`);
        return res.status(403).json({
            status: false,
            reason: '❌ Device not registered! Contact admin to get key.'
        });
    }
    
    const now = new Date();
    const expiry = new Date(deviceRecord.expiry);
    if (now > expiry) {
        console.log(`⏰ Key expired for ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: '⏰ Key expired! Contact admin for renewal.'
        });
    }
    
    const token = generateToken(user_key, serial);
    const rng = generateRng();
    
    console.log(`✅ Login success: ${user_key}`);
    
    res.json({
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    });
});

// ======================== API: CREATE KEY ========================
app.post('/admin/create-key', (req, res) => {
    const { user_key, serial, expiry_days = 30 } = req.body;
    
    if (!user_key || !serial) {
        return res.status(400).json({
            success: false,
            error: 'Missing user_key or serial'
        });
    }
    
    const deviceId = generateDeviceId(user_key, serial);
    const key = `${user_key}_${serial}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiry_days);
    
    if (keysDB[deviceId]) {
        return res.status(409).json({
            success: false,
            error: 'Device already has a key!',
            existing: {
                key: keysDB[deviceId].key,
                expiry: keysDB[deviceId].expiry
            }
        });
    }
    
    keysDB[deviceId] = {
        key: key,
        user_key: user_key,
        serial: serial,
        created_at: new Date().toISOString(),
        expiry: expiryDate.toISOString(),
        is_active: true
    };
    saveKeys();
    
    console.log(`🔑 New key created: ${key}`);
    res.json({
        success: true,
        key: key,
        expiry: expiryDate.toISOString(),
        message: `✅ Key created! Valid for ${expiry_days} days.`
    });
});

// ======================== API: CHECK KEY STATUS ========================
app.get('/admin/check-key', (req, res) => {
    const { user_key, serial } = req.query;
    
    if (!user_key || !serial) {
        return res.status(400).json({ error: 'Missing user_key or serial' });
    }
    
    const deviceId = generateDeviceId(user_key, serial);
    const record = keysDB[deviceId];
    
    if (!record) {
        return res.json({ registered: false, message: '❌ Device not registered' });
    }
    
    const now = new Date();
    const expiry = new Date(record.expiry);
    const isExpired = now > expiry;
    const daysRemaining = isExpired ? 0 : Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    res.json({
        registered: true,
        key: record.key,
        user_key: record.user_key,
        serial: record.serial,
        expiry: record.expiry,
        is_expired: isExpired,
        days_remaining: daysRemaining,
        is_active: record.is_active
    });
});

// ======================== API: EXTEND EXPIRY ========================
app.post('/admin/extend-key', (req, res) => {
    const { user_key, serial, extra_days = 30 } = req.body;
    
    if (!user_key || !serial) {
        return res.status(400).json({ error: 'Missing user_key or serial' });
    }
    
    const deviceId = generateDeviceId(user_key, serial);
    
    if (!keysDB[deviceId]) {
        return res.status(404).json({ error: 'Device not found' });
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
        message: `✅ Key extended by ${extra_days} days`,
        new_expiry: newExpiry.toISOString(),
        days_remaining: Math.ceil((newExpiry - new Date()) / (1000 * 60 * 60 * 24))
    });
});

// ======================== API: LIST ALL KEYS ========================
app.get('/admin/list-keys', (req, res) => {
    const keys = Object.entries(keysDB).map(([deviceId, record]) => {
        const now = new Date();
        const expiry = new Date(record.expiry);
        return {
            device_id: deviceId,
            user_key: record.user_key,
            serial: record.serial,
            key: record.key,
            created_at: record.created_at,
            expiry: record.expiry,
            is_active: record.is_active,
            is_expired: now > expiry,
            days_remaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
        };
    });
    
    res.json({ total: keys.length, keys: keys });
});

// ======================== API: REVOKE KEY ========================
app.post('/admin/revoke-key', (req, res) => {
    const { user_key, serial } = req.body;
    
    if (!user_key || !serial) {
        return res.status(400).json({ error: 'Missing user_key or serial' });
    }
    
    const deviceId = generateDeviceId(user_key, serial);
    
    if (!keysDB[deviceId]) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    keysDB[deviceId].is_active = false;
    saveKeys();
    
    console.log(`🚫 Key revoked for ${user_key}`);
    res.json({ success: true, message: `🚫 Key revoked for ${user_key}` });
});

// ======================== HEALTH CHECK ========================
app.get('/', (req, res) => {
    res.json({
        status: "Server is running!",
        total_keys: Object.keys(keysDB).length,
        users: Object.values(keysDB).map(u => u.user_key)
    });
});

// ======================== START ========================
loadKeys();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`\n🔑 App Mein Yeh Key Daalein:`);
    console.log(`   anurag1_device_001`);
    console.log(`   anurag2_device_002`);
    console.log(`   anurag3_device_003`);
    console.log(`   anurag4_device_004`);
});
