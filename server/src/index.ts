import express from 'express';
import path from 'path';
import fs from 'fs';
import app from './app';

const PORT = process.env.PORT || 5000;

// Serve the built frontend for `npm start` (single-origin local production).
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
