import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors()); // Platinum Standard: Opens all gates for the browser
app.use(express.json());

const CORE_API_URL = "https://api.coreidentity.coreholdingcorp.com/api";

// 🏛️ PROXY GATEWAY: The browser will now call THIS instead of AWS
app.post('/proxy/auth/login', async (req, res) => {
    try {
        const response = await fetch(`${CORE_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).json({ error: "GATEWAY_TIMEOUT", message: err.message });
    }
});

app.get('/health', (req, res) => res.json({ status: "STABLE", proxy: "ACTIVE" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`PROXY_SATELLITE_ONLINE_${PORT}`));
