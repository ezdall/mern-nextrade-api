const { Schema, model } = require('mongoose');

const shopSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'name is required'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    image: {
      data: Buffer,
      contentType: String
    },
    owner: {
      type: Schema.ObjectId,
      ref: 'user'
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = model('shop', shopSchema);
