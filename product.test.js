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

const prodData = {
  name: 'js book',
  price: 20,
  quantity: 20,
  category: 'js'
};

const prodData2 = {
  name: 'css book',
  price: 10,
  quantity: 10,
  category: 'css'
};

const prodData3 = {
  name: 'js 2 book',
  price: 15,
  quantity: 15,
  category: 'js'
};

let accessToken;
let accessToken2;
let user;
let user2;
let shop;
let product;

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
  accessToken2 = resp2.body.accessToken;

  const respShop = await request(app)
    .post(`/api/shops/by/${user._id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .field('name', 'seller shop')
    .field('description', 'this is seller shop')
    .attach('image', path.join(__dirname, 'dist', 'img', 'download (7).jfif'));

  shop = respShop.body;
});

afterAll(async () => {
  await mongoose.connection.dropCollection('products');
  await mongoose.connection.dropCollection('shops');
  await mongoose.connection.dropCollection('users');

  await mongoDisconnect();
});

/** CREATE PRODUCT & LIST BY SHOP */

describe('POST /products/by/:shopId', () => {
  it('create prod', async () => {
    const { body } = await request(app)
      .post(`/api/products/by/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field(prodData) // { name: 'etc', ...}
      .attach(
        'image',
        path.join(__dirname, 'dist', 'img', 'download (15).jfif')
      )
      .expect('Content-Type', /json/)
      .expect(201);

    // console.log({ body });

    expect(body).toMatchObject({
      _id: expect.any(String),
      ...prodData,
      shop: shop._id,
      image: { contentType: expect.any(String) }
    });

    product = body;

    // second prod
    await request(app)
      .post(`/api/products/by/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field(prodData3) // { name: 'etc', ...}
      .expect('Content-Type', /json/)
      .expect(201);
  });

  it('invalid format', async () => {
    const { body } = await request(app)
      .post(`/api/products/by/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        // .send() is json,, .field() is form-data
        name: 'css book',
        price: 20,
        quantity: 20
      })
      .expect('Content-Type', /json/);

    expect(body.message).toMatch(/Invalid form/);
  });

  it('image exceed 2mb ', async () => {});

  it('list by shop', async () => {
    const { body } = await request(app)
      .get(`/api/products/by/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(body)).toBeTruthy();

    // body.forEach(s => {
    //   expect(s).toMatchObject({
    //     _id: expect.any(String),
    //     name: 'seller shop',
    //     description: 'this is seller shop',
    //     owner: { _id: user._id, name: user.name },
    //     image: { contentType: expect.any(String) }
    //   });
    // });

    // expect(body).toMatchObject({
    //   _id: expect.any(String),
    //   ...prodData,
    //   shop: shop._id,
    //   image: { contentType: expect.any(String) }
    // });
  });
});

/**  SHOW PRODUCTS  */

describe('GET /products', () => {
  it('read product', async () => {
    const { body } = await request(app)
      .get(`/api/product/${product._id}`)
      .expect('Content-Type', /json/)
      .expect(200);

    const { _id, name, price, quantity } = product;

    expect(body).toMatchObject({
      _id,
      name,
      price,
      quantity,
      shop: {
        _id: shop._id,
        name: shop.name
      }
    });
  });

  it('prods (w/ query)', async () => {
    const { body } = await request(app)
      .get('/api/products')
      .expect('Content-Type', /json/)
      .expect(200);

    // console.log({ body });

    expect(Array.isArray(body)).toBeTruthy();
  });

  it('prod latest', async () => {
    const { body } = await request(app)
      .get('/api/products/latest')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(body)).toBeTruthy();
  });
});

/**  RELATED, CATEGORIES  */

describe('related prod, categories', () => {
  it('list categories', async () => {
    const { body } = await request(app)
      .get('/api/products/categories')
      .expect('Content-Type', /json/)
      .expect(200);

    // console.log({ body });

    expect(Array.isArray(body)).toBeTruthy();
  });

  it('related', async () => {
    const { body } = await request(app)
      .get(`/api/products/related/${product._id}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(body)).toBeTruthy();

    expect(body.some(prod => prod._id === product._id)).toBeFalsy();
  });
});

/**  Default Days & Product Image */

describe('prod image, default photo', () => {
  it('default photo', async () => {
    const { body } = await request(app)
      .get('/api/products/defaultphoto')
      .expect('Content-Type', /image/)
      .expect(200);
  });

  it('product photo', async () => {
    const { body } = await request(app)
      .get(`/api/product/image/${product._id}`)
      .expect('Content-Type', /(image)|(octet-stream)/)
      .expect(200);
  });
});

/** *   * UPDATE, DELETE  *  * */

describe('PATCH, DELETE /product/:shop/:prod', () => {
  it('update prod', async () => {
    const { body } = await request(app)
      .patch(`/api/product/${shop._id}/${product._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field({ name: 'html 4' })
      .expect('Content-Type', /json/)
      .expect(200);

    const { _id, price, quantity } = product;

    expect(body).toMatchObject({
      _id,
      name: 'html 4', // edited
      price,
      quantity,
      shop: {
        _id: shop._id,
        name: shop.name
      }
    });
  });

  it('delete prod', async () => {
    const { body } = await request(app)
      .delete(`/api/product/${shop._id}/${product._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    const { _id, price, quantity } = product;

    expect(body).toMatchObject({
      _id,
      name: 'html 4', // edited
      price,
      quantity,
      shop: {
        _id: shop._id,
        name: shop.name
      }
    });
  });
});
