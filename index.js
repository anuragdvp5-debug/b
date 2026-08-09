const express = require('express');
const app = express();
const crypto = require('crypto');

// ✅ Headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ EXACT ORIGINAL TOKEN GENERATION
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

function generateRng() {
    return Math.floor(Math.random() * 2000000000) + 1000000000;
}

// ✅ POST Endpoint
app.post('/connect/*', (req, res) => {
    console.log(`\n🔍 ===== REQUEST RECEIVED =====`);
    console.log(`📥 Body:`, req.body);
    
    const game = req.body.game || 'unknown';
    const user_key = req.body.user_key || 'unknown';
    const serial = req.body.serial || 'unknown';
    
    // ✅ Token generate karein
    const token = generateToken();
    const rng = generateRng();
    
    console.log(`🎮 Game: ${game}`);
    console.log(`🔑 User Key: ${user_key}`);
    console.log(`📱 Serial: ${serial}`);
    console.log(`🔑 Token: ${token} (Length: ${token.length})`);
    console.log(`🔢 RNG: ${rng}`);
    console.log(`================================\n`);
    
    // ✅ EXACT RESPONSE (Original jaisa)
    const response = {
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    };
    
    res.json(response);
});

// ✅ GET Endpoint
app.get('/connect/*', (req, res) => {
    const game = req.query.game || 'unknown';
    const user_key = req.query.user_key || 'unknown';
    const serial = req.query.serial || 'unknown';
    
    res.json({
        "status": true,
        "data": {
            "token": generateToken(),
            "rng": generateRng()
        }
    });
});

// ✅ Health Check
app.get('/', (req, res) => {
    res.json({ status: "Server is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
