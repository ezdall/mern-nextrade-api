const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 32,
      required: true
    },
    email: {
      type: String,
      trim: true,
      minlength: 4,
      unique: 'Email already exists',
      required: 'Email is required',
      match: [/.+@.+\..+/, 'Please fill a valid email address']
    },
    password: {
      type: String,
      required: 'password is required'
    },
    salt: String,
    seller: {
      type: Boolean,
      default: false
    },
    refresh_token: String,
    stripe_seller: {},
    stripe_customer: {}
  },
  { timestamps: true, versionKey: false }
);

userSchema.path('password').validate(function validatePass() {
  if (this.password && this.password.length < 5) {
    this.invalidate('password', 'Password must be at least 5 characters.');
  }

  if (this.isNew && !this.password) {
    this.invalidate('password', 'Password is required');
  }
}, null);

module.exports = model('user', userSchema);
