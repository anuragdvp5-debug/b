const express = require('express');
const app = express();
const crypto = require('crypto');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 GENERATE RANDOM TOKEN (Jaisa original server bhejta hai)
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

function generateRng() {
    return Math.floor(Math.random() * 2000000000) + 1000000000;
}

// 🔥 MAIN ENDPOINT
app.get('/connect', (req, res) => {
    const key = req.query.key || 'unknown';
    const hwid = req.query.hwid || 'unknown';

    console.log(`📥 Request: key=${key}, hwid=${hwid}`);

    // 🔥 EXACT ORIGINAL RESPONSE
    const response = {
        "status": true,
        "data": {
            "token": generateToken(),
            "rng": generateRng()
        }
    };

    res.json(response);
});

// POST METHOD (Agar app POST use kare)
app.post('/connect', (req, res) => {
    const key = req.body.key || 'unknown';
    const hwid = req.body.hwid || 'unknown';

    console.log(`📥 POST Request: key=${key}, hwid=${hwid}`);

    res.json({
        "status": true,
        "data": {
            "token": generateToken(),
            "rng": generateRng()
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
