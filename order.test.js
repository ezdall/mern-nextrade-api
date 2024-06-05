require('dotenv').config();
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');

// public key, (redudant)
// const stripe = require('stripe')('sk_test_4eC39HqLyjWDarjtT1zdp7dc');

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

const orderInfo = {
  customer_name: 'guest',
  customer_email: 'guest@gmail.com',
  delivery_address: {
    street: 'diversion road',
    city: 'davao city',
    zipcode: '80000',
    country: 'Phil'
  },
  products: []
};

const cartData = {
  status: 'Not processed',
  cartItemId: ''
};

const orderQty = 2;

const orderProcessing = {};

const orderCancel = {};

let accessToken;
let accessToken2;
let user;
let user2;
let shop;
let product;
let order;

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
    .field({
      name: 'seller shop',
      description: 'this is seller shop'
    })
    .attach('image', path.join(__dirname, 'dist', 'img', 'download (7).jfif'));

  shop = respShop.body;

  const respProd = await request(app)
    .post(`/api/products/by/${shop._id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .field(prodData)
    .attach('image', path.join(__dirname, 'dist', 'img', 'download (15).jfif'));

  product = respProd.body;
});

afterAll(async () => {
  await mongoose.connection.dropCollection('orders');
  await mongoose.connection.dropCollection('products');
  await mongoose.connection.dropCollection('shops');
  await mongoose.connection.dropCollection('users');

  await mongoDisconnect();
});

describe('POST create order', () => {
  it('order', async () => {
    // cannot do this in server-side
    // const stripeToken = await stripe.tokens.create({
    //   card: {
    //     number: '4242424242424242',
    //     exp_month: '07',
    //     exp_year: '2024',
    //     cvc: '424'
    //   }
    // });

    const { body } = await request(app)
      .post(`/api/orders/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        order: {
          ...orderInfo,
          products: [
            {
              product,
              quantity: orderQty
            }
          ]
        },
        token: 'tok_visa'
        // token: 'tok_1G1bkmASmyFkWeQblrvOvE06' // ex. expired
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(body).toMatchObject({
      _id: expect.any(String),
      ...orderInfo,
      products: [
        {
          _id: expect.any(String),
          product: product._id,
          quantity: orderQty,
          status: expect.any(String)
        }
      ],
      user: user._id,
      payment_id: expect.stringMatching(/cus_/) // need inet
    });

    order = body;
  });

  it('prod qty dec after order', async () => {
    const { body } = await request(app)
      .get(`/api/product/${product._id}`)
      .expect('Content-Type', /json/)
      .expect(200);

    console.log({ body });

    expect(body.quantity).toBe(prodData.quantity - orderQty);
  });

  it('no bearer token', async () => {});

  it('no stripe?', async () => {});

  // it('not owner', async () => {});

  // it('cart not empty', async () => {});
});

/**  READ,, LIST by USER,,  STATUS  */

describe('list orders', () => {
  it('read order', async () => {
    const { body } = await request(app)
      .get(`/api/order/${order._id}`)
      .expect(200);

    expect(body).toMatchObject({
      _id: expect.any(String),
      ...orderInfo,
      user: user._id,
      products: expect.any(Array)
    });
  });

  it('status values', async () => {
    const { body } = await request(app)
      .get('/api/order/status-val')
      .expect(200);

    expect(body).toMatchObject([
      'Not processed',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled'
    ]);
  });

  // separate

  it('list by user', async () => {
    const { body } = await request(app)
      .get(`/api/orders/user/${user._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(body)).toBeTruthy();
  });

  it('no auth', async () => {});

  it('list by orders', async () => {
    const { body } = await request(app)
      .get(`/api/orders/shop/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(body)).toBeTruthy();
  });

  it('not owner', async () => {});
});

/**  *  *  CREATE CART  *  *  */

// save cart, get cart
// router.route('/orders/cart/:userId').post(requireLogin, hasAuth, saveCartItems);

/**  *  *    UPDATE, INCREASE, DECREASE ,CHARGE    *  *  *  */

describe('INC, DEC, CHARGE', () => {
  it('update status of cart', async () => {
    const { body } = await request(app)
      .patch(`/api/order/status/${shop._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ cartItemId: product._id, status: 'Processing' })
      .expect(200);

    expect(body).toMatchObject({
      n: 1,
      nModified: 1, // must be 1
      ok: 1
    });
  });

  // check
  // .patch(requireLogin, isOwner, increaseQuantity, update);
  it('cancel (increase)', async () => {
    const { body } = await request(app)
      .patch(`/api/order/${shop._id}/cancel/${product._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cartItemId: product._id,
        status: 'Cancelled',
        quantity: orderQty // return what you dec
      });

    expect(body).toMatchObject({
      n: 1,
      nModified: 1, // must be 1
      ok: 1
    });
  });

  it('prod qty after cancel', async () => {
    const { body } = await request(app)
      .get(`/api/product/${product._id}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(body.quantity).toBe(prodData.quantity);
  });

  // // .patch(requireLogin, isOwner, createCharge, update);
  // it('create charge', async () => {
  //   const { body } = await request(app)
  //     .patch(`/api/order/${order._id}/charge/${user._id}/${shop._id}`)
  //     .set('Authorization', `Bearer ${accessToken}`)
  //     .send({cartItemId: product._id, status: '', order: order._id});

  //   // { status, cartItemId, amount: prod.qty * prod.price }
  //   console.log({ body });
  // });
});
