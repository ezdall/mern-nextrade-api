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
      required: 'Email is required',
      unique: 'Email already exists',
      trim: true,
      lowercase: true, // deal w/ uppercased duplicate
      minlength: 4,
      maxlength: 32,
      // collation: { locale: 'en', strength: 2 },
      match: [/.+@.+\..+/, 'Please fill a valid email address']
    },
    hashed_password: {
      type: String,
      required: true
    },
    salt: String,
    refresh_token: String,
    seller: {
      type: Boolean,
      default: false
    },
    stripe_seller: {},
    stripe_customer: {}
  },
  { timestamps: true, versionKey: false }
);

/**
 *  Statics
 */

/**
 *   Virtuals
 */

// handling 'password'
userSchema
  .virtual('password')
  .set(function passVirtSet(password) {
    this._password = password;
  })
  .get(function passVirtGet() {
    return this._password;
  });

/**
 * Paths
 */

userSchema.path('hashed_password').validate(function hashPassValidate() {
  // at least 6, trim then checks
  if (this._password && this._password.trim().length < 5) {
    // invalidates the incoming 'password'
    // Document#invalidate(<path>, <errorMsg>)
    this.invalidate('password', 'Password must be at least 5 characters.');
  }

  // Document#isNew (return boolean)
  // dealing w/ new register/signup w/ empty password
  if (this.isNew && !this._password) {
    // invalidates the incoming 'password'
    this.invalidate('password', 'Password is required');
  }
}, null);

module.exports = model('user', userSchema);
