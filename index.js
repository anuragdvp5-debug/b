const express = require('express');
const app = express();
const cors = require('cors');  
const crypto = require('crypto');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ==================== BINDINGS ====================
const BINDINGS_FILE = './bindings.json';
let bindings = {};

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
    "akash": { expiry: "2026-08-19" },
    "suraj": { expiry: "2026-08-19" },
    "vivek": { expiry: "2026-08-20" },
    "anurag1": { expiry: "2026-08-23" },
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

// ==================== ACTIVE APK LOGIN ====================
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

    const freshBindings = await getBindingsFromSupabase();
    const deviceId = freshBindings[user_key];

    if (!deviceId) {
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


















// ==================== RESELLER SYSTEM ====================
const RESELLERS = {
    "reseller1": { password: "pass123", expiry: "2026-12-31" },
    "reseller2": { password: "pass123", expiry: "2026-12-31" },
    "reseller3": { password: "pass123", expiry: "2026-12-31" },
    "reseller4": { password: "pass123", expiry: "2026-12-31" },
    "ANURAGMODS": { password: "123anurag", expiry: null }
};

// Reseller Login
app.post('/reseller/login', async (req, res) => {
    const { username, password, device_id } = req.body;

    if (!username || !password || !device_id) {
        return res.status(400).json({ success: false, message: 'Missing credentials or device ID' });
    }

    if (!RESELLERS[username]) {
        console.log(`❌ Reseller "${username}" not found.`);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (RESELLERS[username].password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (RESELLERS[username].expiry) {
        const expiryDate = new Date(RESELLERS[username].expiry);
        const now = new Date();
        if (now > expiryDate) {
            return res.status(403).json({ success: false, message: 'Account expired' });
        }
    }

    try {
        let { data, error } = await supabase
            .from('resellers')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !data) {
            console.log(`📝 Reseller "${username}" not in Supabase. Inserting...`);

            const { data: newData, error: insertError } = await supabase
                .from('resellers')
                .insert({
                    username: username,
                    password: password,
                    role: 'reseller',
                    is_active: true,
                    expiry: RESELLERS[username].expiry || null,
                    device_id: device_id,
                    created_at: new Date()
                })
                .select()
                .single();

            if (insertError) {
                console.error('❌ Insert failed:', insertError);
                return res.status(500).json({ success: false, message: 'Registration failed' });
            }

            data = newData;
            console.log(`✅ Reseller "${username}" inserted in Supabase with device bind!`);
        }

        if (data.device_id && data.device_id !== device_id) {
            console.log(`❌ Device mismatch! ${username} is bound to ${data.device_id}, trying from ${device_id}`);
            return res.status(403).json({
                success: false,
                message: 'This account is already bound to another device!'
            });
        }

        if (!data.device_id) {
            console.log(`🔗 Binding device for ${username}: ${device_id}`);
            await supabase
                .from('resellers')
                .update({ device_id: device_id })
                .eq('username', username);
        }

        const token = Buffer.from(`${data.id}:${Date.now()}`).toString('base64');

        res.json({
            success: true,
            token: token,
            role: data.role || 'reseller',
            user: data.username,
            expiry: data.expiry,
            device_bound: data.device_id || device_id
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Reseller Dashboard
app.get('/reseller/dashboard', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
        const resellerId = Buffer.from(token, 'base64').toString().split(':')[0];

        const { data: keys, error: keysErr } = await supabase
            .from('keys')
            .select('*')
            .eq('reseller_id', resellerId);

        if (keysErr) throw new Error(keysErr.message);

        const { data: reseller } = await supabase
            .from('resellers')
            .select('allowed_apks')
            .eq('id', resellerId)
            .single();

        let apks = [];
        if (reseller?.allowed_apks?.length) {
            const { data: apkData } = await supabase
                .from('apks')
                .select('*')
                .in('id', reseller.allowed_apks);
            apks = apkData || [];
        }

        res.json({
            success: true,
            total: keys.length,
            active: keys.filter(k => k.status === 'active').length,
            expired: keys.filter(k => k.status === 'expired').length,
            keys: keys,
            apks: apks
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create Key
app.post('/reseller/key/create', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { key, expiry, apk_id } = req.body;
    if (!key || !expiry || !apk_id) {
        return res.status(400).json({ success: false, message: 'All fields required' });
    }

    try {
        const resellerId = Buffer.from(token, 'base64').toString().split(':')[0];

        const { data: existing } = await supabase
            .from('keys')
            .select('key')
            .eq('key', key)
            .single();

        if (existing) {
            return res.status(400).json({ success: false, message: 'Key already exists' });
        }

        const { data, error } = await supabase
            .from('keys')
            .insert({ key, expiry, apk_id, reseller_id: resellerId, status: 'active' })
            .select()
            .single();

        if (error) throw new Error(error.message);

        res.json({ success: true, message: 'Key created', key: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Key
app.delete('/reseller/key/:key', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { key } = req.params;

    try {
        const resellerId = Buffer.from(token, 'base64').toString().split(':')[0];

        const { data: existing } = await supabase
            .from('keys')
            .select('*')
            .eq('key', key)
            .eq('reseller_id', resellerId)
            .single();

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Key not found or not yours' });
        }

        const { error } = await supabase
            .from('keys')
            .delete()
            .eq('key', key);

        if (error) throw new Error(error.message);

        res.json({ success: true, message: 'Key deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});



// ==================== ADMIN SYSTEM ====================

// Admin Dashboard
app.get('/admin/dashboard', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
        const resellerId = Buffer.from(token, 'base64').toString().split(':')[0];

        const { data: reseller } = await supabase
            .from('resellers')
            .select('role')
            .eq('id', resellerId)
            .single();

        if (reseller?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { data: keys, error: keysErr } = await supabase
            .from('keys')
            .select('*');

        const { data: resellers, error: resellersErr } = await supabase
            .from('resellers')
            .select('*');

        if (keysErr || resellersErr) throw new Error('Database error');

        res.json({
            success: true,
            total_keys: keys.length,
            active_keys: keys.filter(k => k.status === 'active').length,
            expired_keys: keys.filter(k => k.status === 'expired').length,
            total_resellers: resellers.length,
            resellers: resellers,
            keys: keys
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Add Reseller
app.post('/admin/add-reseller', async (req, res) => {
    const { username, password, role, expiry } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
        const { data: existing } = await supabase
            .from('resellers')
            .select('username')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const { data, error } = await supabase
            .from('resellers')
            .insert({
                username: username,
                password: password,
                role: role || 'reseller',
                is_active: true,
                expiry: expiry || null
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        res.json({
            success: true,
            message: `Reseller "${username}" added successfully!`,
            reseller: data
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Reseller
app.delete('/admin/delete-reseller/:username', async (req, res) => {
    const { username } = req.params;

    if (username === 'admin') {
        return res.status(403).json({ success: false, message: 'Cannot delete admin' });
    }

    try {
        const { error } = await supabase
            .from('resellers')
            .delete()
            .eq('username', username);

        if (error) throw new Error(error.message);

        res.json({
            success: true,
            message: `Reseller "${username}" deleted successfully!`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// List Resellers
app.get('/admin/list-resellers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('resellers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        res.json({
            success: true,
            resellers: data
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Reset Device Bind
app.post('/admin/reset-device/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const { error } = await supabase
            .from('resellers')
            .update({ device_id: null })
            .eq('username', username);

        if (error) throw new Error(error.message);

        res.json({
            success: true,
            message: `Device binding reset for ${username}`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== LEGACY ADMIN APIs ====================
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
        delete bindings[user_key];
        saveBindings();
    } catch (err) {
        console.error('❌ Supabase delete error:', err);
    }
    
    console.log(`🔄 Device binding reset for: ${user_key}`);
    res.json({ success: true, message: `Device binding reset for ${user_key}` });
});

// ==================== ROOT ====================
app.get('/', (req, res) => {
    res.json({
        status: "🚀 Server is running!",
        total_keys: Object.keys(KEYS).length,
        bound_devices: Object.keys(bindings).length
    });
});

// ==================== START SERVER ====================
(async () => {
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
