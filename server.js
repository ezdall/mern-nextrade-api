require('express-async-errors');
require('dotenv').config(); // access .env at root '/'

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const { connectMDB } = require('./config/db');
const { corsOptions } = require('./config/cors-options');
const { errorHandler } = require('./helpers/error-handler');
const { UrlError } = require('./helpers/url.error');

const { authRoute } = require('./routes/auth.route');
const { userRoute } = require('./routes/user.route');
const { productRoute } = require('./routes/product.route');
const { shopRoute } = require('./routes/shop.route');
const { orderRoute } = require('./routes/order.route');

connectMDB().catch(err => console.error('connect-MongoDB Error2', err.stack));

const app = express();

const PORT = parseInt(process.env.PORT, 10) || 3000;

/** middlewares ----------------------------*/
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json()); // parse req.body
app.use(cookieParser()); // parse req.cookies
app.use(express.urlencoded({ extended: true }));
// app.use(helmet());

// app.use('/favicon.ico', express.static(path.join(__dirname, 'dist', 'favicon.ico')))
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// for /, /index, /index.html
app.get('^/$|/index(.html)?', (req, res) => {
  return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use('/auth', authRoute);
app.use('/api', [userRoute, shopRoute, productRoute, orderRoute]);

app.all('*', (req, res, next) => {
  const error = new UrlError(`${req.ip} tried to access ${req.originalUrl}`);

  return next(error);
});

app.use(errorHandler);

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

module.exports = app;
