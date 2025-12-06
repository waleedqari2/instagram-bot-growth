// railway-server.js
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// نخدم ملف login الثابت
app.use(express.static(path.join(__dirname, 'public')));

// redirect / → /login
app.get('/', (_req, res) => res.redirect('/login'));

// نعمل endpoint بسيط للتأكد إن السيرفر شغال
app.get('/health', (_req, res) => res.send('OK'));

app.listen(port, '0.0.0.0', () => {
  console.log(`[Railway] Server listening on 0.0.0.0:${port}`);
});
