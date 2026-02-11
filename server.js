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

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy for EdgeX API
app.get('/api/edgex/*', async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api\/edgex/, '/api');
    const url = `https://pro.edgex.exchange${targetPath}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('EdgeX proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from EdgeX' });
  }
});

// Proxy for Extended API
app.get('/api/extended/*', async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api\/extended/, '/api');
    const url = `https://starknet.app.extended.exchange${targetPath}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Extended proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from Extended' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
