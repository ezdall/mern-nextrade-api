const { Schema, model } = require('mongoose');

const productSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 32,
      required: 'Name is required'
    },
    quantity: {
      type: Number,
      required: 'Quantity is required'
    },
    price: {
      type: Number,
      require: 'Price is required'
    },
    image: {
      data: Buffer,
      contentType: String
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    category: {
      // this must be array?
      type: String,
      trim: true
    },
    shop: {
      type: Schema.ObjectId,
      ref: 'shop'
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = model('product', productSchema);
