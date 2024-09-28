const mongoose = require('mongoose');
// const _extend = require('lodash/extend');

const { Order, CartItem } = require('../models/order.model');
const Cart = require('../models/cart.model');

// helper
const { BadRequest400 } = require('../helpers/bad-request.error');
const { Unauthorized401 } = require('../helpers/unauthorized.error');
// const { Forbidden403 } = require('../helpers/forbidden.error');
const { NotFound404 } = require('../helpers/not-found.error');

const create = async (req, res, next) => {
  try {
    const userId = req.profile._id;

    // console.log({ req: req.body, userId });

    if (!userId || !req.body.order) {
      return next(new BadRequest400('need valid user and order @crtOrder'));
    }

    const order = await Order.create({
      ...req.body.order,
      user: userId
    });

    if (!order) return next(new BadRequest400('invalid order @crtOrder'));

    return res.status(201).json(order);
  } catch (error) {
    return next(error);
  }
};

const read = (req, res, next) => {
  if (!req.order) return next(new NotFound404('no order @readOrder'));

  // console.log({ order: req.order.products });

  return res.json(req.order);
};

const update = async (req, res, next) => {
  try {
    const { cartItemId, status } = req.body;

    // console.log({ cartItemId, status });

    if (!cartItemId || !status) {
      return next(
        new BadRequest400('need valid status or id @order-status-update')
      );
    }

    // using updateOne
    // { n:1, nModified: 1, ok: 1 },, coz .updateOne()
    const order = await Order.updateOne(
      {
        // 'products._id': cartItemId // not match
        // rename product to cart?
        'products.product': cartItemId
      },
      {
        'products.$.status': status // .$.? array
      }
    );

    if (!order.ok) return next(new BadRequest400('invalid update @ordUpdStat'));

    const result = await Order.findOne({
      'products.product': cartItemId
    }).exec();

    // console.log({ result });

    return res.json(order);
  } catch (error) {
    return next(error);
  }
};

const listByShop = async (req, res, next) => {
  try {
    if (!req.shop) return next(new NotFound404('no shop @order/listByShop'));

    // accessing CartItem
    const orders = await Order.find({ 'products.shop': req.shop._id })
      // pop prod
      .populate({ path: 'products.product', select: 'name price' })
      .sort('-createdAt') // latest
      .lean()
      .exec();

    return res.json(orders);
  } catch (error) {
    return next(error);
  }
};

const listByUser = async (req, res, next) => {
  try {
    if (!req.profile) return next(new NotFound404('no user @order/listByUser'));

    const orders = await Order.find({ user: req.profile._id })
      .populate({ path: 'products.product', select: 'name price' })
      .sort('-createdAt')
      .lean()
      .exec();

    return res.json(orders);
  } catch (error) {
    return next(error);
  }
};

const orderById = async (req, res, next, orderId) => {
  try {
    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return next(new Unauthorized401('valid id is required @orderById'));
    }

    const order = await Order.findById(orderId)
      .populate('products.product', 'name price')
      .populate({ path: 'products.shop', select: 'name' })
      .exec();

    // .populate({ path: 'products.product', select: 'name price' })

    if (!order) return next(new Unauthorized401('order not found @orderById'));

    // console.log({ order: order.products, shop: order.products[0].shop });

    req.order = order;

    return next();
  } catch (error) {
    return next(error);
  }
};

const getStatusValues = (req, res, next) => {
  res.json(CartItem.schema.path('status').enumValues);
};

// new feature for saving cart item
// not yet implemented
const saveCartItems = async (req, res, next) => {
  try {
    const { cart } = req.body;

    // if (!cart?.length) return next(new BadRequest400('empty cart'));

    // console.log({ ...req.body.cart });

    // const a = req.body.map(s=>s.pr)

    // avoid feeding .create w/ array
    const result = await Cart.create({ cart });

    if (!result) {
      return next(new BadRequest400('failed at saving cart @order'));
    }

    // const { cartId } = result;

    console.log(result);

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

// implemented in the future
const getCart = async (req, res, next) => {
  try {
    const { cartId } = req.params;

    if (!cartId || !mongoose.isValidObjectId(cartId)) {
      return next(new Unauthorized401('valid id is required @order cart'));
    }

    const cart = await Cart.findById(cartId)
      .populate({ path: 'cart.product', select: 'name price' })
      .lean()
      .exec();

    if (!cart) return next(new Unauthorized401('order not found @order cart'));

    // req.cart = cart

    return res.json(cart);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  create,
  read,
  update,
  listByShop,
  listByUser,
  orderById,
  getStatusValues,
  saveCartItems,
  getCart
};
