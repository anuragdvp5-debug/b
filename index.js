const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SIMPLE HEALTH CHECK (Test karne ke liye)
app.get('/', (req, res) => {
    res.send('✅ Server is running!');
});

// 🔥 MAIN LOGIN ENDPOINT (GET)
app.get('/connect', (req, res) => {
    const key = req.query.key || 'unknown';
    const hwid = req.query.hwid || 'unknown';

    console.log(`📥 Request: key=${key}, hwid=${hwid}`);

    // 🔥 HAR REQUEST KO SUCCESS BHEJO
    res.json({
        "status": true,
        "reason": "VALID",
        "message": "Login Successful",
        "expiry": "2026-12-31"
    });
});

// ✅ POST METHOD BHI SUPPORT KARO (agar app POST bheje)
app.post('/connect', (req, res) => {
    const key = req.body.key || 'unknown';
    const hwid = req.body.hwid || 'unknown';

    console.log(`📥 POST Request: key=${key}, hwid=${hwid}`);

    res.json({
        "status": true,
        "reason": "VALID",
        "message": "Login Successful",
        "expiry": "2026-12-31"
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
