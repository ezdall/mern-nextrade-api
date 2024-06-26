require('dotenv').config();
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { connectMDB, mongoDisconnect } = require('./config/db');
const app = require('./app');

const validLogin = {
  name: 'guest',
  email: 'guest@gmail.com',
  password: 'guest',
  seller: true
};

const casedLogin = {
  name: 'guest',
  email: 'GuEsT@gmail.com',
  password: 'guest',
  seller: false
};

const spacePass = {
  email: 'guest@gmail.com',
  password: '        '
};

const invalidPass = {
  name: 'guest',
  email: 'guest@gmail.com',
  password: 'guest2',
  seller: true
};

const invalidEmail = {
  email: 'guest22@gmail.com',
  password: 'guest'
};

const invalidLogin = {
  email: 'hacker@gmail.com',
  password: 'hacker'
};

const validRegister = {
  name: 'johndoe',
  email: 'johndoe@gmail.com',
  password: 'johndoe',
  seller: false
};

const spacePassRegister = {
  name: 'janedoe',
  email: 'janedoe@gmail.com',
  password: '      ',
  seller: false
};

const invalidRegister = {};

const lackPassRegister = {};

let token;
let refreshTokenFull;

beforeAll(async () => {
  await connectMDB();

  await request(app).post('/auth/register').send(validLogin);
});

// beforeEach(async () => {});

// afterEach(async () => {});

afterAll(async () => {
  await mongoose.connection.dropCollection('users');

  await mongoDisconnect();
});

/** * * * * *    LOGIN, LOGOUT   * *  * * */

describe('POST /auth/login', () => {
  it('valid login (200), res w/ cookie', async () => {
    // destructure
    const { headers, body } = await request(app)
      .post('/auth/login')
      .send(validLogin)
      .expect('Content-Type', /json/)
      .expect(200);

    // cookie
    expect(headers['set-cookie'][0]).toMatch(
      /jwt=.+; Max-Age=\d+; Path=\/; Expires=.+/
      // or /jwt=.*; Max-Age=\d+; Path=\/; Expires=.*; HttpOnly/
    );

    // has token, user
    expect(body).toMatchObject({
      accessToken: expect.any(String),
      user: expect.any(Object)
    });

    // assign access, refresh token
    token = body.accessToken;

    [refreshTokenFull] = headers['set-cookie'][0].split(';');

    // check user
    expect(body.user).toMatchObject({
      name: validLogin.name,
      email: validLogin.email,
      seller: Boolean(validLogin.seller),
      _id: expect.any(String)
    });

    // check token
    const decoded = jwt.verify(body.accessToken, process.env.ACCESS_SECRET);

    expect(decoded).toMatchObject({
      email: validLogin.email,
      iat: expect.any(Number),
      exp: expect.any(Number)
    });

    // no password related
    expect(body.user).not.toHaveProperty('password');
    expect(body.user).not.toHaveProperty('salt');
    expect(body.user).not.toHaveProperty('hashed_password');
  });

  it('wrong password, (401) error', async () => {
    const { body } = await request(app)
      .post('/auth/login')
      .send(invalidPass)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(body.message).toMatch(/wrong password/);
  });

  it('invalid or not-found user/email', async () => {
    const { body } = await request(app)
      .post('/auth/login')
      .send(invalidEmail)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(body.message).toMatch(/User not found/);
  });
});

describe('GET /auth/logout', () => {
  it('logout 204 (no-content), clear cookie', async () => {
    // supertest has convenient way http
    const { headers } = await request(app).get('/auth/logout').expect(204);

    // check refresh_token=undefined in user
    // const user = await User.findOne({ refresh_token }).exec();

    // no content, empty body coz 204
    expect(headers).not.toHaveProperty('Content-Type');

    // clear/reset
    expect(headers['set-cookie'][0]).toMatch(
      'jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );
  });
});

/** * * * * *    REGISTER     * *  * * */

describe('POST /auth/register', () => {
  it('register valid (201)', async () => {
    const { body } = await request(app)
      .post('/auth/register')
      .send(validRegister)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(body.message).toMatch(
      `register ${validRegister.name} successfully!`
    );
  });

  it('register duplicate (409) error', async () => {
    const { body } = await request(app)
      .post('/auth/register')
      .send(validLogin)
      .expect('Content-Type', /json/)
      .expect(409); // express-jwt duplicate error

    expect(body.message).toMatch(`${validLogin.email} already exist`);
  });

  it('register duplicate (409) in upper-case', async () => {
    // email has lowercase: true
    const { body } = await request(app)
      .post('/auth/register')
      .send(casedLogin)
      .expect('Content-Type', /json/)
      .expect(409);

    expect(body.message).toMatch(`${validLogin.email} already exist`);
  });

  it('register w/ spaced or less-char password, (400) error', async () => {
    const { body } = await request(app)
      .post('/auth/register')
      .send(spacePassRegister)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(body.message).toMatch(/ValidationError.+password/);
  });
});

/** * * * * *    REFRESH     * *  * * */

describe('GET /refresh', () => {
  it('refresh (200)', async () => {
    const { body } = await request(app)
      .get('/auth/refresh')
      .set('Cookie', [`${refreshTokenFull}`])
      .expect('Content-Type', /json/)
      .expect(200);

    // accessToken, user
    expect(body).toMatchObject({
      accessToken: expect.any(String),
      user: expect.any(Object)
    });

    // not same w/ prev token
    expect(body.accessToken).not.toBe(token);

    // check user
    expect(body.user).toMatchObject({
      email: validLogin.email,
      seller: Boolean(validLogin.seller),
      _id: expect.any(String)
    });

    // no password related
    expect(body.user).not.toHaveProperty('password');
    expect(body.user).not.toHaveProperty('salt');
    expect(body.user).not.toHaveProperty('hashed_password');
  });

  it('invalid cookie token', async () => {
    const { body } = await request(app)
      .get('/auth/refresh')
      .set('Cookie', ['jwt=in.Valid.Token'])
      .expect('Content-Type', /json/)
      .expect(401);

    expect(body.message).toMatch(/invalid token/);
  });

  it('valid token but by others 403', async () => {
    const otherRefreshToken = jwt.sign(
      { username: validLogin.username },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const { body } = await request(app)
      .get('/auth/refresh')
      .set('Cookie', [`jwt=${otherRefreshToken}`])
      .expect('Content-Type', /json/)
      .expect(403);

    expect(body.message).toMatch(/cookie dont match/);
  });

  it('expire refresh (401)', async () => {});
});
