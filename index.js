const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 SIRF EK ENDPOINT — /connect
app.get('/connect', (req, res) => {
    const key = req.query.key || 'unknown';
    const hwid = req.query.hwid || 'unknown';

    console.log(`📥 Request: key=${key}, hwid=${hwid}`);

    // 🔥 HAR REQUEST KO SUCCESS BHEJO
    const response = {
        "status": true,
        "reason": "VALID",
        "message": "Login Successful",
        "expiry": "2026-12-31"
    };

    res.json(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
