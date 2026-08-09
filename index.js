const express = require('express');
const app = express();
const crypto = require('crypto');

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 Token generate with RNG combination
function generateToken(rng) {
    // Token ko RNG ke saath combine karein
    const combined = rng.toString() + crypto.randomBytes(8).toString('hex');
    return crypto.createHash('md5').update(combined).digest('hex');
}

function generateRng() {
    return Math.floor(Math.random() * 2000000000) + 1000000000;
}

app.post('/connect/*', (req, res) => {
    console.log(`\n📥 Body:`, req.body);
    
    const game = req.body.game || 'unknown';
    const user_key = req.body.user_key || 'unknown';
    const serial = req.body.serial || 'unknown';
    
    const rng = generateRng();
    const token = generateToken(rng);
    
    console.log(`🎮 Game: ${game}`);
    console.log(`🔑 User Key: ${user_key}`);
    console.log(`📱 Serial: ${serial}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`🔢 RNG: ${rng}`);
    
    const response = {
        "status": true,
        "data": {
            "token": token,
            "rng": rng
        }
    };
    
    res.json(response);
});

app.get('/connect/*', (req, res) => {
    const rng = generateRng();
    res.json({
        "status": true,
        "data": {
            "token": generateToken(rng),
            "rng": rng
        }
    });
});

app.get('/', (req, res) => {
    res.json({ status: "Server is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
