import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const PROXY_TARGETS = {
  edgex:       'https://pro.edgex.exchange/api',
  extended:    'https://api.starknet.extended.exchange/api',
  pacifica:    'https://api.pacifica.fi/api',
};

// GET proxies
for (const [name, target] of Object.entries(PROXY_TARGETS)) {
  app.get(`/api/${name}/*`, async (req, res) => {
    try {
      const targetPath = req.originalUrl.replace(new RegExp(`^/api/${name}`), '/api');
      const url = `${target.replace('/api', '')}${targetPath}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`${name} proxy error:`, error.message);
      res.status(500).json({ error: `Failed to fetch from ${name}` });
    }
  });
}

// GRVT proxy (POST-based API)
app.post('/api/grvt/*', async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api\/grvt/, '');
    const url = `https://market-data.grvt.io${targetPath}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('GRVT proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from GRVT' });
  }
});

// Variational proxy
app.get('/api/variational/*', async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api\/variational/, '');
    const url = `https://omni-client-api.prod.ap-northeast-1.variational.io${targetPath}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Variational proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from Variational' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
