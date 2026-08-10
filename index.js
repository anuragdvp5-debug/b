const express = require('express');
const app = express();
const crypto = require('crypto');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ==================== BINDINGS ====================
const BINDINGS_FILE = './bindings.json';
let bindings = {};

async function loadBindings() {
    try {
        if (fs.existsSync(BINDINGS_FILE)) {
            const data = fs.readFileSync(BINDINGS_FILE, 'utf8');
            bindings = JSON.parse(data);
            console.log(`✅ Loaded ${Object.keys(bindings).length} device bindings from bindings.json`);
        } else {
            console.log('📝 No bindings.json found. Loading from Supabase...');
            await loadFromSupabase();
        }
    } catch (error) {
        console.error('❌ Error loading bindings:', error);
        await loadFromSupabase();
    }
}

async function loadFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('bindings')
            .select('user_key, device_id');

        if (error) {
            console.error('❌ Supabase load error:', error);
            return;
        }

        if (data && data.length > 0) {
            data.forEach(row => {
                bindings[row.user_key] = row.device_id;
            });
            console.log(`✅ Loaded ${Object.keys(bindings).length} device bindings from Supabase`);
            saveBindings(); // bindings.json mein bhi save kar do
        } else {
            console.log('📝 No bindings found in Supabase');
        }
    } catch (err) {
        console.error('❌ Supabase connection failed:', err);
    }
}

function saveBindings() {
    try {
        fs.writeFileSync(BINDINGS_FILE, JSON.stringify(bindings, null, 2));
        console.log(`💾 Saved ${Object.keys(bindings).length} device bindings to bindings.json`);
    } catch (error) {
        console.error('❌ Error saving bindings:', error);
    }
}

async function saveToSupabase(user_key, device_id) {
    try {
        const { error } = await supabase
            .from('bindings')
            .upsert({ user_key, device_id }, { onConflict: 'user_key' });

        if (error) {
            console.error('❌ Supabase insert error:', error);
        } else {
            console.log(`✅ Synced to Supabase: ${user_key} → ${device_id}`);
        }
    } catch (err) {
        console.error('❌ Supabase insert failed:', err);
    }
}

// ==================== KEYS ====================
const KEYS = {
    "anurag1b": { expiry: "2026-08-30" },
    "sachin": { expiry: "2026-08-12" },
    "newuser_device_005": { expiry: "2026-09-10" }
};

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// ==================== TOKEN GENERATION ====================
function generateToken(user_key, serial) {
    const data = `PUBG-${user_key}-${serial}-Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E`;
    return crypto.createHash('md5').update(data).digest('hex');
}

function generateRng() {
    return Math.floor(Math.random() * 2000000000) + 1000000000;
}

// ==================== LOGIN ====================
app.post('/connect/*', async (req, res) => {
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

    if (!KEYS[user_key]) {
        console.log(`❌ Key not registered: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: 'Invalid Key'
        });
    }

    const expiryDate = new Date(KEYS[user_key].expiry);
    const now = new Date();
    if (now > expiryDate) {
        console.log(`⏰ Key expired: ${user_key}`);
        return res.status(403).json({
            status: false,
            reason: 'Key Expired'
        });
    }

    // ==================== 🔥 1 KEY = 1 DEVICE CHECK ====================
    if (!bindings[user_key]) {
        // Pehli baar login - Device bind karo
        bindings[user_key] = serial;
        saveBindings();
        await saveToSupabase(user_key, serial);
        console.log(`🔗 Device bound: ${user_key} → ${serial}`);
    } else if (bindings[user_key] !== serial) {
        console.log(`❌ Device mismatch! ${user_key} is bound to ${bindings[user_key]}, but trying from ${serial}`);
        return res.status(403).json({
            status: false,
            reason: 'This key is already used on another device!'
        });
    }

    const token = generateToken(user_key, serial);
    const rng = generateRng();

    console.log(`✅ Login success: ${user_key}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`📅 Expires: ${KEYS[user_key].expiry}`);
    console.log(`📱 Bound Device: ${bindings[user_key]}`);

    res.json({
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    });
});

// ==================== ADMIN ====================
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
        device_bound: bindings[user_key] ? true : false,
        device_id: bindings[user_key] || 'Not bound yet'
    });
});

app.get('/admin/list-keys', (req, res) => {
    const total = Object.keys(KEYS).length;
    const now = new Date();
    let active = 0, expired = 0, bound = 0;
    Object.keys(KEYS).forEach(key => {
        if (new Date(KEYS[key].expiry) > now) active++;
        else expired++;
        if (bindings[key]) bound++;
    });
    res.json({ total, active, expired, device_bound: bound });
});

app.post('/admin/reset-device', async (req, res) => {
    const { user_key } = req.body;
    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }
    if (!KEYS[user_key]) {
        return res.status(404).json({ error: 'Key not found' });
    }
    delete bindings[user_key];
    saveBindings();
    
    try {
        await supabase.from('bindings').delete().eq('user_key', user_key);
        console.log(`🗑️ Deleted from Supabase: ${user_key}`);
    } catch (err) {
        console.error('❌ Supabase delete error:', err);
    }
    
    console.log(`🔄 Device binding reset for: ${user_key}`);
    res.json({ success: true, message: `Device binding reset for ${user_key}` });
});

app.get('/', (req, res) => {
    res.json({
        status: "🚀 Server is running!",
        total_keys: Object.keys(KEYS).length,
        bound_devices: Object.keys(bindings).length
    });
});

// ==================== SECOND APK CONTROL ====================

// 1️⃣ LOGIN ENDPOINT - /api/login (POST)
app.post('/api/login', async (req, res) => {
    console.log(`\n📥 [SECOND APK] Login attempt:`, req.body);

    const { key } = req.body;

    if (!key) {
        return res.status(400).json({
            success: false,
            message: 'Missing key'
        });
    }

    console.log(`🔑 Key: ${key}`);

    if (!KEYS[key]) {
        console.log(`❌ Key not registered: ${key}`);
        return res.status(401).json({
            success: false,
            message: 'Invalid key'
        });
    }

    const expiryDate = new Date(KEYS[key].expiry);
    const now = new Date();
    if (now > expiryDate) {
        console.log(`⏰ Key expired: ${key}`);
        return res.status(401).json({
            success: false,
            message: 'Key expired'
        });
    }

    console.log(`✅ [SECOND APK] Login success: ${key}`);
    res.json({
        success: true,
        message: 'Login successful'
    });
});

// 2️⃣ ACTIVATE ENDPOINT - /api/activate (POST)
app.post('/api/activate', async (req, res) => {
    console.log(`\n📥 [SECOND APK] Activate attempt:`, req.body);

    const { key, username, device } = req.body;

    if (!key || !username || !device) {
        return res.status(400).json({
            success: false,
            message: 'Missing fields (key, username, device required)'
        });
    }

    console.log(`🔑 Key: ${key}`);
    console.log(`👤 Username: ${username}`);
    console.log(`📱 Device: ${device}`);

    if (!KEYS[key]) {
        console.log(`❌ Key not registered: ${key}`);
        return res.status(401).json({
            success: false,
            message: 'Invalid key'
        });
    }

    const expiryDate = new Date(KEYS[key].expiry);
    const now = new Date();
    if (now > expiryDate) {
        console.log(`⏰ Key expired: ${key}`);
        return res.status(401).json({
            success: false,
            message: 'Key expired'
        });
    }

    console.log(`✅ [SECOND APK] Activate success: ${key} → ${username}`);
    res.json({
        success: true,
        message: 'Key activated successfully'
    });
});

// 3️⃣ CHECK ENDPOINT - /api/check (GET)
app.get('/api/check', async (req, res) => {
    const { key } = req.query;

    console.log(`\n📥 [SECOND APK] Check attempt: key=${key}`);

    if (!key) {
        return res.status(400).json({
            success: false,
            message: 'Missing key'
        });
    }

    if (!KEYS[key]) {
        console.log(`❌ Key not registered: ${key}`);
        return res.json({
            valid: false,
            message: 'Invalid key'
        });
    }

    const expiryDate = new Date(KEYS[key].expiry);
    const now = new Date();
    if (now > expiryDate) {
        console.log(`⏰ Key expired: ${key}`);
        return res.json({
            valid: false,
            message: 'Key expired'
        });
    }

    console.log(`✅ [SECOND APK] Check success: ${key}`);
    res.json({
        valid: true,
        message: 'Key is valid'
    });
});

// ==================== START ====================
(async () => {
    await loadBindings();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on port ${PORT}`);
        console.log(`\n✅ ===== REGISTERED KEYS =====`);
        Object.keys(KEYS).forEach(k => {
            const bound = bindings[k] ? `🔒 Bound to: ${bindings[k]}` : '🔓 Not bound yet';
            console.log(`   🔑 ${k} → Expires: ${KEYS[k].expiry} | ${bound}`);
        });
        console.log(`\n🔒 1 Key = 1 Device Mode ACTIVE (bindings.json + Supabase)`);
    });
})();
