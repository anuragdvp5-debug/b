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

// ============================================
// 🔥 KEYS — SUPABASE SE DYNAMIC FETCH
// ============================================
async function getKeysFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('keys')
            .select('key, expiry, apk_id, reseller_id, status');

        if (error) {
            console.error('❌ Error fetching keys:', error);
            return {};
        }

        const keys = {};
        data.forEach(row => {
            keys[row.key] = {
                expiry: row.expiry,
                apk_id: row.apk_id,
                reseller_id: row.reseller_id,
                status: row.status
            };
        });
        return keys;
    } catch (err) {
        console.error('❌ Supabase connection failed:', err);
        return {};
    }
}

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

    // 🔥 DYNAMIC FETCH — Supabase se keys lo
    const KEYS = await getKeysFromSupabase();

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

// ==================== DYNAMIC RESELLER SYSTEM ====================

// 🔥 Har login pe Supabase se fresh fetch
async function getResellersFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('resellers')
            .select('username, password, expiry, role, is_active');

        if (error) {
            console.error('❌ Error fetching resellers:', error);
            return {};
        }

        const resellers = {};
        data.forEach(row => {
            resellers[row.username] = {
                password: row.password,
                expiry: row.expiry,
                role: row.role || 'reseller',
                is_active: row.is_active
            };
        });
        return resellers;
    } catch (err) {
        console.error('❌ Supabase connection failed:', err);
        return {};
    }
}

// ============================================
// 🔐 AUTH MIDDLEWARE — DB VERIFIED
// ============================================
async function verifyReseller(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let resellerId;
    try {
        resellerId = Buffer.from(token, 'base64').toString().split(':')[0];
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { data: reseller, error } = await supabase
        .from('resellers')
        .select('id, username, role, is_active, expiry')
        .eq('id', resellerId)
        .single();

    if (error || !reseller) {
        return res.status(401).json({ success: false, message: 'Session invalid, please login again' });
    }

    if (reseller.is_active === false) {
        return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    if (reseller.expiry) {
        const expiryDate = new Date(reseller.expiry);
        if (new Date() > expiryDate) {
            return res.status(403).json({ success: false, message: 'Account expired' });
        }
    }

    req.reseller = reseller;
    next();
}

function requireAdmin(req, res, next) {
    if (req.reseller.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden - Admins only' });
    }
    next();
}

// Reseller Login
app.post('/reseller/login', async (req, res) => {
    const { username, password, device_id } = req.body;

    if (!username || !password || !device_id) {
        return res.status(400).json({ success: false, message: 'Missing credentials or device ID' });
    }

    const RESELLERS = await getResellersFromSupabase();

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
                    role: RESELLERS[username].role || 'reseller',
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

// ============================================
// 📊 RESELLER DASHBOARD
// ============================================
app.get('/reseller/dashboard', verifyReseller, async (req, res) => {
    const resellerId = req.reseller.id;

    try {
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
            username: req.reseller.username,
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

// ============================================
// ➕ CREATE KEY
// ============================================
app.post('/reseller/key/create', verifyReseller, async (req, res) => {
    const resellerId = req.reseller.id;
    const { key, expiry, apk_id } = req.body;

    if (!key || !expiry || !apk_id) {
        return res.status(400).json({ success: false, message: 'All fields required' });
    }

    try {
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

// ============================================
// 🗑️ DELETE KEY
// ============================================
app.delete('/reseller/key/:key', verifyReseller, async (req, res) => {
    const resellerId = req.reseller.id;
    const { key } = req.params;

    try {
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







// ============================================
// 👑 ADMIN ROUTES
// ============================================

app.get('/admin/dashboard', verifyReseller, requireAdmin, async (req, res) => {
    try {
        const { data: keys, error: keysErr } = await supabase
            .from('keys')
            .select(`*, resellers (username)`);

        const { data: resellers, error: resellersErr } = await supabase
            .from('resellers')
            .select('*');

        if (keysErr || resellersErr) throw new Error('Database error');

        res.json({
            success: true,
            username: req.reseller.username,
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

app.post('/admin/add-reseller', verifyReseller, requireAdmin, async (req, res) => {
    const { username, password, role, expiry, allowed_apks } = req.body;

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
                expiry: expiry || null,
                allowed_apks: allowed_apks || ['apk1']
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

app.delete('/admin/delete-reseller/:username', verifyReseller, requireAdmin, async (req, res) => {
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

app.get('/admin/list-resellers', verifyReseller, requireAdmin, async (req, res) => {
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

app.post('/admin/reset-device/:username', verifyReseller, requireAdmin, async (req, res) => {
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
app.get('/admin/check-key', verifyReseller, requireAdmin, async (req, res) => {
    const { user_key } = req.query;
    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }

    const KEYS = await getKeysFromSupabase();

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

app.get('/admin/list-keys', verifyReseller, requireAdmin, async (req, res) => {
    const KEYS = await getKeysFromSupabase();
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

app.post('/admin/reset-device', verifyReseller, requireAdmin, async (req, res) => {
    const { user_key } = req.body;
    if (!user_key) {
        return res.status(400).json({ error: 'Missing user_key' });
    }

    const KEYS = await getKeysFromSupabase();

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
app.get('/', async (req, res) => {
    const KEYS = await getKeysFromSupabase();
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
        console.log(`\n✅ ===== KEYS FROM SUPABASE =====`);
        (async () => {
            const KEYS = await getKeysFromSupabase();
            Object.keys(KEYS).forEach(k => {
                const bound = bindings[k] ? `🔒 Bound to: ${bindings[k]}` : '🔓 Not bound yet';
                console.log(`   🔑 ${k} → Expires: ${KEYS[k].expiry} | ${bound}`);
            });
        })();
        console.log(`\n🔒 1 Key = 1 Device Mode ACTIVE (Direct Supabase Check)`);
    });
})();























// ============================================
// 📱 SECOND APK CONTROL (/login)
// ============================================
app.post('/login', async (req, res) => {
    console.log(`\n📥 [SECOND APK] Login attempt:`, req.body);

    const { username, password, hwid } = req.body;

    // 🔥 username = key, password/hwid = device_id
    const user_key = username;
    const device_id = password || hwid;

    if (!user_key || !device_id) {
        return res.status(400).json({
            success: false,
            message: 'Missing key or device ID'
        });
    }

    console.log(`🔑 Received Key: ${user_key}`);
    console.log(`📱 Device ID: ${device_id}`);

    // 🔥 DYNAMIC FETCH — Supabase se keys lo
    const KEYS = await getKeysFromSupabase();

    if (!KEYS[user_key]) {
        console.log(`❌ Key not registered: ${user_key}`);
        return res.status(403).json({
            success: false,
            message: 'Invalid Key'
        });
    }

    // 🔥 Expiry check
    const expiryDate = new Date(KEYS[user_key].expiry);
    const now = new Date();
    if (now > expiryDate) {
        console.log(`⏰ Key expired: ${user_key}`);
        return res.status(403).json({
            success: false,
            message: 'Key Expired'
        });
    }

    // 🔥 Device bind check (1 Key = 1 Device)
    const freshBindings = await getBindingsFromSupabase();
    const deviceId = freshBindings[user_key];

    if (!deviceId) {
        bindings[user_key] = device_id;
        saveBindings();
        await saveToSupabase(user_key, device_id);
        console.log(`🔗 Device bound: ${user_key} → ${device_id}`);
    } else if (deviceId !== device_id) {
        console.log(`❌ Device mismatch! ${user_key} is bound to ${deviceId}, but trying from ${device_id}`);
        return res.status(403).json({
            success: false,
            message: 'This key is already used on another device!'
        });
    } else {
        bindings[user_key] = device_id;
        saveBindings();
    }

    // 🔥 Token generate
    const token = generateToken(user_key, device_id);
    const rng = generateRng();

    console.log(`✅ [SECOND APK] Login success: ${user_key}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`📅 Expires: ${KEYS[user_key].expiry}`);
    console.log(`📱 Bound Device: ${device_id}`);

    res.json({
        success: true,
        data: {
            token: token,
            rng: rng
        }
    });
});
