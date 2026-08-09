const express = require('express');
const app = express();
const crypto = require('crypto');

// ✅ CORS Headers (Original server jaisa)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 GENERATE RANDOM TOKEN (Original format - 32 char hex)
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

// 🔥 GENERATE RNG (Original format - 10 digit number)
function generateRng() {
    return Math.floor(Math.random() * 2000000000) + 1000000000;
}

// 🔥 MAIN ENDPOINT - GET (Original response structure)
app.get('/connect/*', (req, res) => {
    const key = req.query.key || 'unknown';
    const hwid = req.query.hwid || 'unknown';

    console.log(`📥 GET Request: key=${key}, hwid=${hwid}`);

    const response = {
        "status": true,
        "data": {
            "token": generateToken(),
            "rng": generateRng()
        }
    };

    res.json(response);
});

// 🔥 MAIN ENDPOINT - POST (Original response structure)
app.post('/connect/*', (req, res) => {
    const key = req.body.key || 'unknown';
    const hwid = req.body.hwid || 'unknown';

    console.log(`📥 POST Request: key=${key}, hwid=${hwid}`);

    const response = {
        "status": true,
        "data": {
            "token": generateToken(),
            "rng": generateRng()
        }
    };

    res.json(response);
});

// 🔥 HEALTH CHECK (Optional)
app.get('/', (req, res) => {
    res.json({ status: "Server is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
