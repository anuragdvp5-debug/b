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

// 🔥 HAR BAAR SUPABASE SE DIRECT LOAD (CACHE NAHI)
async function getBindingsFromSupabase() {
    try {
        console.log('🔄 Fetching fresh bindings from Supabase...');
        const { data, error } = await supabase
            .from('bindings')
            .select('user_key, device_id');

        if (error) {
            console.error('❌ Supabase load error:', error);
            return {};
        }

        const freshBindings = {};
        if (data && data.length > 0) {
            data.forEach(row => {
                freshBindings[row.user_key] = row.device_id;
            });
            console.log(`✅ Loaded ${Object.keys(freshBindings).length} device bindings from Supabase`);
        } else {
            console.log('📝 No bindings found in Supabase');
        }
        return freshBindings;
    } catch (err) {
        console.error('❌ Supabase connection failed:', err);
        return {};
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
    "anurag2": { expiry: "2026-08-12" },
    "suraj1": { expiry: "2026-08-12" },
    "anurag5": { expiry: "2026-08-12" },
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

    // 🔥 HAR BAAR SUPABASE SE DIRECT CHECK (CACHE IGNORE)
    const freshBindings = await getBindingsFromSupabase();
    const deviceId = freshBindings[user_key];

    if (!deviceId) {
        // Pehli baar login - Device bind karo
        bindings[user_key] = serial;
        saveBindings();
        await saveToSupabase(user_key, serial);
        console.log(`🔗 Device bound: ${user_key} → ${serial}`);
    } else if (deviceId !== serial) {
        console.log(`❌ Device mismatch! ${user_key} is bound to ${deviceId}, but trying from ${serial}`);
        return res.status(403).json({
            status: false,
            reason: 'This key is already used on another device!'
        });
    } else {
        // Bindings update karo (cache refresh)
        bindings[user_key] = serial;
        saveBindings();
    }

    const token = generateToken(user_key, serial);
    const rng = generateRng();

    console.log(`✅ Login success: ${user_key}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`📅 Expires: ${KEYS[user_key].expiry}`);
    console.log(`📱 Bound Device: ${serial}`);

    res.json({
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    });
});

// ==================== ADMIN ====================
app.get('/admin/check-key', async (req, res) => {
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

    // 🔥 DIRECT SUPABASE CHECK
    const freshBindings = await getBindingsFromSupabase();
    const deviceId = freshBindings[user_key];

    res.json({
        valid: !isExpired,
        expires_on: KEYS[user_key].expiry,
        is_expired: isExpired,
        device_bound: deviceId ? true : false,
        device_id: deviceId || 'Not bound yet'
    });
});

app.get('/admin/list-keys', async (req, res) => {
    const freshBindings = await getBindingsFromSupabase();
    const total = Object.keys(KEYS).length;
    const now = new Date();
    let active = 0, expired = 0, bound = 0;
    Object.keys(KEYS).forEach(key => {
        if (new Date(KEYS[key].expiry) > now) active++;
        else expired++;
        if (freshBindings[key]) bound++;
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
    
    try {
        await supabase.from('bindings').delete().eq('user_key', user_key);
        console.log(`🗑️ Deleted from Supabase: ${user_key}`);
        
        // Local bindings bhi update karo
        delete bindings[user_key];
        saveBindings();
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

// ==================== START ====================
(async () => {
    // 🔥 Server start pe bindings load karo (cache warmup)
    bindings = await getBindingsFromSupabase();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on port ${PORT}`);
        console.log(`\n✅ ===== REGISTERED KEYS =====`);
        Object.keys(KEYS).forEach(k => {
            const bound = bindings[k] ? `🔒 Bound to: ${bindings[k]}` : '🔓 Not bound yet';
            console.log(`   🔑 ${k} → Expires: ${KEYS[k].expiry} | ${bound}`);
        });
        console.log(`\n🔒 1 Key = 1 Device Mode ACTIVE (Direct Supabase Check)`);
    });
})();
