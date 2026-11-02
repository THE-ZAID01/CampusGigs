const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: [env.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'], credentials: false }));
app.use(express.json({ limit: '3mb' }));

app.use('/api', routes);
app.use('/api', notFound);

// Optional: serve the built client from the same server (npm run build in /client)
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);
module.exports = app;
