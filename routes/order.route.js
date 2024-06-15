const router = require('express').Router();

const { requireLogin, hasAuth } = require('../controllers/auth.cont');
const { isOwner, shopById } = require('../controllers/shop.cont');
const {
  userById,
  stripeCustomer,
  createCharge
} = require('../controllers/user.cont');
const {
  decreaseQuantity,
  increaseQuantity,
  productById
} = require('../controllers/product.cont');

const {
  create,
  read,
  update,
  orderById,
  listByShop,
  listByUser,
  getStatusValues,
  saveCartItems,
  getCart
} = require('../controllers/order.cont');

// create order
router
  .route('/orders/:userId')
  // no-inet- test
  // .post(requireLogin, hasAuth, decreaseQuantity, create);
  .post(requireLogin, hasAuth, stripeCustomer, decreaseQuantity, create);

// save cart, get cart
router.route('/orders/cart/:userId').post(requireLogin, hasAuth, saveCartItems);
router.route('/orders/cart/:cartId').get(requireLogin, getCart);

// list of orders for each shop
router.get('/orders/shop/:shopId', requireLogin, isOwner, listByShop);

// list orders by User
router.get('/orders/user/:userId', requireLogin, hasAuth, listByUser);

// ?
router.get('/order/status-val', getStatusValues);

router.get('/order/:orderId', read);

// cancel
router
  .route('/order/:shopId/cancel/:productId')
  .patch(requireLogin, isOwner, increaseQuantity, update);

// process change
router
  .route('/order/:orderId/charge/:userId/:shopId')
  .patch(requireLogin, isOwner, createCharge, update);

// upd status
router.route('/order/status/:shopId').patch(requireLogin, isOwner, update);

router.param('userId', userById);
router.param('shopId', shopById);
router.param('productId', productById);
router.param('orderId', orderById);

module.exports = { orderRoute: router };
