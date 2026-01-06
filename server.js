const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;

// 1. Priority: Serve static files from the build output ('dist')
// This ensures that requests for /audio/bgm.mp3, /assets/*.js, etc.
// are served directly as files, not intercepted by the SPA router.
app.use(express.static(path.join(__dirname, 'dist')));

// 2. Fallback: Serve index.html for any other route (SPA behavior)
// This allows React Router (if used) or app navigation to handle URL changes
// without 404ing on the server side.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});