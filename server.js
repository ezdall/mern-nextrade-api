// const http = require('http');
const mongoose = require('mongoose');

const app = require('./app');
const { connectMDB } = require('./config/db');

connectMDB().catch(err => console.error('connect-mongoDB Error', err.stack));

const PORT = process.env.PORT || 3000;

// const server = http.createServer(app);

mongoose.connection.once('open', () => {
  const isProd = process.env.NODE_ENV === 'production';

  const nodeEnv = isProd ? 'PROD' : 'DEV';
  const hostNamePort = isProd
    ? 'nextrade-api.onrender.com'
    : `localhost:${PORT}`;

  app.listen(PORT, err => {
    if (err) throw err;
    console.log(`NexTrade-Srv -${nodeEnv}- running at ${hostNamePort}`);
  });
});

mongoose.connection.on('error', err => {
  console.error('error @mongo-conn-error ---', err);
});
