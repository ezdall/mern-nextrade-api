require('dotenv').config({
  path: './config/config.env'
});

// const config = {
//  env: process.env.NODE_ENV || 'development',
//  port: process.env.PORT || 3000,
//  mongoUri: process.env.MONGODB_URI || process.env.MONGO_HOST
//  || `mongodb://${process.env.IP || 'localhost'}:${process.env.MONGO_PORT || '27017'}/mernproject`
// }

const env = process.env.NODE_ENV || 'development';

const port = parseInt(process.env.PORT, 10) || 3000;

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_HOST ||
  `mongodb://${process.env.IP || 'localhost'}:${process.env.MONGO_PORT ||
    '27017'}/mernproject`;

module.exports = { env, port, mongoUri };
