const { Schema, model } = require('mongoose');
const { cartItemSchema } = require('./order.model');

const cartSchema = new Schema(
  {
    cart: []
  },
  { timestamps: true, versionKey: false }
);

module.exports = model('cart', cartSchema);
