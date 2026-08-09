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

// ======================== LOAD KEYS ========================
function loadKeys() {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            const data = fs.readFileSync(KEYS_FILE, 'utf8');
            keysDB = JSON.parse(data);
            console.log(`✅ Loaded ${Object.keys(keysDB).length} registered keys`);
        } else {
            console.log('📝 No keys file found. Creating default keys...');
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
        console.log(`💾 Saved ${Object.keys(keysDB).length} keys to database`);
    } catch (error) {
        console.error('❌ Error saving keys:', error);
    }
}

// ======================== DEFAULT KEYS ========================
function initializeDefaultKeys() {
    const users = [
        { user_key: 'anurag1', serial: 'device_001' },
        { user_key: 'anurag2', serial: 'device_002' },
        { user_key: 'anurag3', serial: 'device_003' },
        { user_key: 'anurag4', serial: 'device_004' }
    ];
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    users.forEach(user => {
        const deviceId = generateDeviceId(user.user_key, user.serial);
        keysDB[deviceId] = {
            user_key: user.user_key,
            serial: user.serial,
            created_at: new Date().toISOString(),
            expiry: expiryDate.toISOString(),
            is_active: true
        };
    });
    
    console.log(`✅ Initialized 4 default keys`);
}

// ======================== HELPER FUNCTIONS ========================
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
    
    const { game, user_key, serial } = req.body;
    
    // 🔥 Check if user_key and serial exist
    if (!user_key || !serial) {
        return res.status(400).json({
            status: false,
            reason: 'Missing user_key or serial'
        });
    }
    
    // 🔥 Generate device ID
    const deviceId = generateDeviceId(user_key, serial);
    const deviceRecord = keysDB[deviceId];
    
    console.log(`🔑 Device ID: ${deviceId}`);
    
    // 🔥 CHECK 1: Is device registered?
    if (!deviceRecord) {
        console.log(`❌ Device not registered: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: '❌ Device not registered! Contact admin.'
        });
    }
    
    // 🔥 CHECK 2: Is key active?
    if (!deviceRecord.is_active) {
        console.log(`❌ Key revoked for: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: '❌ Key revoked! Contact admin.'
        });
    }
    
    // 🔥 CHECK 3: Is key expired?
    const now = new Date();
    const expiry = new Date(deviceRecord.expiry);
    if (now > expiry) {
        console.log(`⏰ Key expired: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: '⏰ Key expired! Contact admin for renewal.'
        });
    }
    
    // ✅ ALL CHECKS PASSED - Generate token
    const token = generateToken(user_key, serial);
    const rng = generateRng();
    
    console.log(`✅ Login success: ${user_key}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`📅 Expires: ${deviceRecord.expiry}`);
    
    res.json({
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    });
});

// ======================== API: CREATE KEY (Admin) ========================
app.post('/admin/create-key', (req, res) => {
    const { user_key, serial, expiry_days = 30 } = req.body;
    
    if (!user_key || !serial) {
        return res.status(400).json({
            success: false,
            error: 'Missing user_key or serial'
        });
    }
    
    const deviceId = generateDeviceId(user_key, serial);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiry_days);
    
    // Check if already exists
    if (keysDB[deviceId]) {
        return res.status(409).json({
            success: false,
            error: 'Device already registered!',
            existing: {
                user_key: keysDB[deviceId].user_key,
                serial: keysDB[deviceId].serial,
                expiry: keysDB[deviceId].expiry
            }
        });
    }
    
    // Save new key
    keysDB[deviceId] = {
        user_key: user_key,
        serial: serial,
        created_at: new Date().toISOString(),
        expiry: expiryDate.toISOString(),
        is_active: true
    };
    saveKeys();
    
    console.log(`🔑 New key created: ${user_key}_${serial}`);
    res.json({
        success: true,
        key: `${user_key}_${serial}`,
        user_key: user_key,
        serial: serial,
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
        return res.json({
            registered: false,
            message: '❌ Device not registered'
        });
    }
    
    const now = new Date();
    const expiry = new Date(record.expiry);
    const isExpired = now > expiry;
    const daysRemaining = isExpired ? 0 : Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    res.json({
        registered: true,
        user_key: record.user_key,
        serial: record.serial,
        created_at: record.created_at,
        expiry: record.expiry,
        is_expired: isExpired,
        days_remaining: daysRemaining,
        is_active: record.is_active,
        status: isExpired ? 'EXPIRED' : (record.is_active ? 'ACTIVE' : 'REVOKED')
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
    res.json({
        success: true,
        message: `🚫 Key revoked for ${user_key}`
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
            created_at: record.created_at,
            expiry: record.expiry,
            is_active: record.is_active,
            is_expired: now > expiry,
            days_remaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
        };
    });
    
    res.json({
        total: keys.length,
        keys: keys
    });
});

// ======================== HEALTH CHECK ========================
app.get('/', (req, res) => {
    res.json({
        status: "Server is running!",
        total_keys: Object.keys(keysDB).length,
        users: Object.values(keysDB).map(u => `${u.user_key}_${u.serial}`)
    });
});

// ======================== START ========================
loadKeys();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`\n🔑 Registered Users:`);
    Object.values(keysDB).forEach(u => {
        console.log(`   ✅ ${u.user_key}_${u.serial}`);
    });
    console.log(`\n📅 All keys expire in 30 days`);
});
