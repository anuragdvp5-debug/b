const express = require('express');
const app = express();
const crypto = require('crypto');

// ✅ Headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Token generate (Original format)
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

function generateRng() {
    return Math.floor(Math.random() * 2000000000) + 1000000000;
}

// ✅ POST Endpoint with FULL logging
app.post('/connect/*', (req, res) => {
    console.log(`\n🔍 ===== REQUEST RECEIVED =====`);
    console.log(`📥 Headers:`, req.headers);
    console.log(`📥 Body:`, req.body);
    console.log(`📥 Query:`, req.query);
    console.log(`📥 Params:`, req.params);
    
    const key = req.body.key || req.query.key || 'unknown';
    const hwid = req.body.hwid || req.query.hwid || 'unknown';
    
    const token = generateToken();
    const rng = generateRng();
    
    console.log(`🔑 Generated Token: ${token} (Length: ${token.length})`);
    console.log(`🔢 Generated RNG: ${rng}`);
    console.log(`================================\n`);
    
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
    console.log(`\n🔍 ===== GET REQUEST =====`);
    console.log(`📥 Query:`, req.query);
    
    const key = req.query.key || 'unknown';
    const hwid = req.query.hwid || 'unknown';
    
    const token = generateToken();
    const rng = generateRng();
    
    res.json({
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    });
});

// ✅ Health Check
app.get('/', (req, res) => {
    res.json({ status: "Server is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
