import express from 'express';
import path from 'path';
import fs from 'fs';
import app from './app';

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// In production / `npm start`, serve the built SPA from client/dist.
// In development, Vite owns the UI on :3000 — serving dist here shows a stale build.
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const serveSpa = !isDev && fs.existsSync(clientDistPath);

if (serveSpa) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  if (isDev) {
    console.log(`UI (Vite): http://localhost:3000  ← use this in development`);
    console.log(`Do not use :${PORT} for the website while developing — it will not hot-reload.`);
  } else if (serveSpa) {
    console.log(`SPA served from client/dist`);
  }
});
