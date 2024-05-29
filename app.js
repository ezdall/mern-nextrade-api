require('express-async-errors');
require('dotenv').config(); // access .env at root '/'

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const { corsOptions } = require('./config/cors-options');
const { errorHandler } = require('./helpers/error-handler');
const { UrlError } = require('./helpers/url.error');

const { authRoute } = require('./routes/auth.route');
const { userRoute } = require('./routes/user.route');
const { productRoute } = require('./routes/product.route');
const { shopRoute } = require('./routes/shop.route');
const { orderRoute } = require('./routes/order.route');

const app = express();

/** middlewares ----------------------------*/
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json()); // parse req.body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // parse req.cookies
// app.use(helmet());

// app.use('/favicon.ico', express.static(path.join(__dirname, 'dist', 'favicon.ico')))
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// for /, /index, /index.html
app.get('^/$|/index(.html)?', (req, res) => {
  return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use('/auth', authRoute);
// order matters
app.use('/api', [shopRoute, productRoute, orderRoute, userRoute]);

app.all('*', (req, res, next) => {
  return next(new UrlError(`${req.ip} tried ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

module.exports = app;
