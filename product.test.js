require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { connectMDB, mongoDisconnect } = require('./config/db');
const app = require('./app');

const validLogin = {
  name: 'guest',
  email: 'guest@gmail.com',
  password: 'guest',
  seller: true
};

let accessToken;
let user;

beforeAll(async () => {
  await connectMDB();

  // register
  await request(app).post('/auth/register').send(validLogin);

  // login
  const { body } = await request(app).post('/auth/login').send(validLogin);

  user = body.user;
  accessToken = body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropCollection('users');

  await mongoDisconnect();
});

describe('prod test', () => {
  it('prod', async () => {});
});
