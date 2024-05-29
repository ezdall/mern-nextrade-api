require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');

const { connectMDB, mongoDisconnect } = require('./config/db');
const app = require('./app');

const validLogin = {
  name: 'guest',
  email: 'guest@gmail.com',
  password: 'guest'
};

const validLogin2 = {
  name: 'seller',
  email: 'seller@gmail.com',
  password: 'seller',
  seller: true
};

const validUpdate = {
  name: 'edit',
  email: 'edit@gmail.com',
  password: 'seller',
  seller: true
};

// const someId = '609f1f2da90d810fc0900253';

let accessToken;
let user;
let user2;

beforeAll(async () => {
  await connectMDB();

  // register
  await request(app).post('/auth/register').send(validLogin);
  await request(app).post('/auth/register').send(validLogin2);

  // login
  const { body } = await request(app).post('/auth/login').send(validLogin);
  const resp2 = await request(app).post('/auth/login').send(validLogin2);

  user = body.user;
  user2 = resp2.body.user;

  accessToken = body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropCollection('users');

  await mongoDisconnect();
});

describe('GET /users, /users/:id', () => {
  it('all users ', async () => {
    const { body } = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(body)).toBeTruthy();

    // find data of validLogin in list
    const userData = body.find(i => i.email === validLogin.email);

    expect(userData).toMatchObject({
      name: validLogin.name,
      email: validLogin.email,
      _id: expect.any(String)
    });
  });

  it('read user /user/:id', async () => {
    const { body } = await request(app)
      .get(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // only prop
    expect(body).toEqual({
      _id: expect.any(String),
      name: validLogin.name,
      email: validLogin.email,
      seller: Boolean(validLogin.seller)
    });
  });

  it('no bearer token', async () => {
    const { body } = await request(app)
      .get('/api/users')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(body.message).toMatch(/No authorization/);
  });

  it('not authenticated', async () => {
    const { body } = await request(app)
      .get(`/api/users/${user2._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(body.message).toMatch(/Forbidden/);
  });

  it('invalid id', async () => {
    const { body } = await request(app)
      .get('/api/users/12345')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(body.message).toMatch(/invalid id/);
  });
});

describe('PATCH /users/:id', () => {
  it('update data', async () => {
    const { body } = await request(app)
      .patch(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validUpdate)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(body).toEqual({
      name: validUpdate.name,
      email: validUpdate.email,
      seller: validUpdate.seller
    });
  });
});

describe('DELETE /users/:id', () => {
  it('delete data', async () => {
    const { body } = await request(app)
      .delete(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(body.message).toMatch(/is deleted/);
  });
});

describe('stripe', () => {
  it('dealing w/ stripe', async () => {});
});
