require('dotenv').config();
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');

const { connectMDB, mongoDisconnect } = require('./config/db');
const app = require('./app');

// seller
const validLogin = {
  name: 'seller',
  email: 'seller@gmail.com',
  password: 'seller',
  seller: true
};

// not a seller
const validLogin2 = {
  name: 'guest',
  email: 'guest@gmail.com',
  password: 'guest',
  seller: false
};

let accessToken;
let accessToken2;
let user;
let user2;
let shop;

beforeAll(async () => {
  await connectMDB();

  // register guest & seller
  await request(app).post('/auth/register').send(validLogin);
  await request(app).post('/auth/register').send(validLogin2);

  // login
  const { body } = await request(app).post('/auth/login').send(validLogin);
  const resp2 = await request(app).post('/auth/login').send(validLogin2);

  user = body.user;
  user2 = resp2.body.user;

  accessToken = body.accessToken;
  accessToken2 = resp2.body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropCollection('shops');
  await mongoose.connection.dropCollection('users');

  await mongoDisconnect();
});

/**   *   *   *   *    CREATE SHOP      *   *   *   */

describe('POST /shops/by/:id', () => {
  fit('create shop 201', async () => {
    const { body } = await request(app)
      .post(`/api/shops/by/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'seller shop')
      .field('description', 'this is seller shop')
      .attach('image', path.join(__dirname, 'dist', 'img', 'download (7).jfif'))
      .expect('Content-Type', /json/)
      .expect(201);

    expect(body).toMatchObject({
      _id: expect.any(String),
      name: 'seller shop',
      description: 'this is seller shop',
      owner: user._id,
      image: { contentType: expect.any(String) }
    });

    // assign
    shop = body;
  });

  it('invalid token (isLogin)', async () => {
    const { body } = await request(app)
      .post(`/api/shops/by/${user._id}`)
      .set('Authorization', `Bearer In.Valid.Token`)
      .send()
      .expect('Content-Type', /json/)
      .expect(401);

    expect(body.message).toMatch(/invalid token/);
  });

  it('not authenticated (isAuth)', async () => {
    const { body } = await request(app)
      // wrong id
      .post(`/api/shops/by/${user2._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send()
      .expect('Content-Type', /json/)
      .expect(403);

    expect(body.message).toMatch(/Forbidden/);
  });

  it('not a seller', async () => {
    const { body } = await request(app)
      .post(`/api/shops/by/${user2._id}`)
      .set('Authorization', `Bearer ${accessToken2}`)
      .send()
      .expect('Content-Type', /json/)
      .expect(403);

    expect(body.message).toMatch(/Forbidden/);
  });

  it('not multipart/form-data', async () => {
    const { body } = await request(app)
      .post(`/api/shops/by/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      // sent a json
      .send({ name: 'json1', description: 'for json1' })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(body.message).toMatch(/Invalid form type/);
  });
});

/**   *   *   *   *  (PRIVATE:)  SHOP LIST by Owner      *   *   *   */

describe('GET /shops/by/:id', () => {
  it('list by owner 200', async () => {
    const { body } = await request(app)
      .get(`/api/shops/by/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    body.forEach(s => {
      expect(s).toMatchObject({
        _id: expect.any(String),
        name: 'seller shop',
        description: 'this is seller shop',
        owner: { _id: user._id, name: user.name },
        image: { contentType: expect.any(String) }
      });
    });
  });
});

/**   *   *   *   *    PHOTO & default PHOTO      *   *   *   */

describe('GET /shops/logo', () => {
  it('shop logo', async () => {
    const { body } = await request(app)
      .get(`/api/shops/logo/${shop._id}`)
      .expect('Content-Type', /(image)|(octet-stream)/)
      .expect(200);

    // expect(body.type).toBe(expect.any(Buffer));
  });

  it('default photo', async () => {
    const { body } = await request(app)
      .get('/api/shops/defaultphoto')
      .expect('Content-Type', /image\/*/)
      .expect(200);
  });
});

/**   *   *   *   *  (PUBLIC:)  SHOP LIST, READ SHOP     *   *   *   */

fdescribe('GET /shops, /shop/:id', () => {
  it('shop lists', async () => {
    const { body } = await request(app)
      .get('/api/shops')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(body)).toBeTruthy();
  });

  it('read shop', async () => {
    const { body } = await request(app)
      .get(`/api/shop/${shop._id}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(body).toMatchObject({
      _id: shop._id,
      name: shop.name,
      description: shop.description,
      owner: { _id: user._id, name: user.name }
      // image: { contentType: shop.image.contentType } // no img @read
    });
  });
});

/**   *   *   *   *    UPDATE, DELETE SHOP     *   *   *   */

describe('UPDATE, DELETE /shops/:id', () => {
  it('update shop', async () => {
    const { body } = await request(app)
      .patch(`/api/shops/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'seller shop edited')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(body).toMatchObject({
      _id: expect.any(String),
      name: 'seller shop edited', // updated part
      description: shop.description,
      owner: { _id: user._id, name: user.name },
      image: { contentType: shop.image.contentType }
    });
  });

  it('not the owner', async () => {
    const { body } = await request(app)
      .patch(`/api/shops/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken2}`)
      .field('name', 'seller shop edited')
      .expect('Content-Type', /json/)
      .expect(403);

    expect(body.message).toMatch(/not the owner/);
  });

  it('delete shop', async () => {
    const { body } = await request(app)
      .delete(`/api/shops/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(body).toMatchObject({
      _id: shop._id,
      name: 'seller shop edited',
      owner: { _id: user._id, name: user.name }
    });
  });

  // repetitive
  // it('invalid from') it('invalid id')

  // it('cant delete has prod', async () => {});
});
