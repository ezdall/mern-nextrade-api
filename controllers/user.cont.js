const mongoose = require('mongoose');
const _extend = require('lodash/extend');
const { genSalt, hash } = require('bcrypt');
const axios = require('axios');
const stripe = require('stripe');

const myStripe = stripe(process.env.STRIPE_SECRET_KEY);
const stripeUrl = 'https://connect.stripe.com/oauth/token';

// model
const User = require('../models/user.model');
const Shop = require('../models/shop.model');

// utils
const { BadRequest400 } = require('../helpers/bad-request.error');
const { Unauthorized401 } = require('../helpers/unauthorized.error');
const { Forbidden403 } = require('../helpers/forbidden.error');
const { NotFound404 } = require('../helpers/not-found.error');

/**
 * List all users.
 * Route: GET /users
 */

const list = async (req, res, next) => {
  try {
    // find users and select specific details
    const users = await User.find({})
      .select('name email updated created seller.type') // seller.type = Boolean
      .lean() // lean to get plain js therefore efficient
      .exec();

    if (!users) return next(new NotFound404('err users @list'));

    return res.json(users);
  } catch (err) {
    return next(err);
  }
};

/**
 * Read a single user by ID.
 * Route: GET /users/:userId
 */

const read = (req, res, next) => {
  const user = req.profile;

  console.log({ user });

  if (!user) return next(new Unauthorized401('profile not found @user-read'));

  // remove sensitive data
  user.password = undefined;
  user.salt = undefined;

  return res.json(user);
};

const update = async (req, res, next) => {
  try {
    const { password } = req.body;

    // console.log({ one: req.body.stripe_seller });

    let user = req.profile;

    // check if user exist
    if (!user) return next(new NotFound404('no user found @upd-user'));

    // update user using req.body
    user = _extend(user, req.body); // lodash: _.extendd

    // if there is password, hash it with new salt
    if (password) {
      const salt = await genSalt();
      const hashedPassword = await hash(password, salt);

      // update user's password, salt
      user.password = hashedPassword;
      user.salt = salt;
    }

    console.log({ user });

    const result = await user.save();

    // check if update successfully
    if (!result) return next(new BadRequest400('failed to update @upd-user'));

    // remove sensitive data
    // user.password = undefined;
    // user.salt = undefined;

    const { name, email, seller } = user;

    return res.json({ name, email, seller: seller.type });
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const user = req.profile;

    if (!user) return next(new NotFound404('no user found @remove-user'));

    // check if user owns a shop
    // const shop = await Shop.findOne({ owner: user._id }).lean().exec();
    const hasShop = await Shop.exists({ owner: user._id });

    if (hasShop)
      return next(new BadRequest400('user owns a shop. @remove-user'));

    // delete user
    const deletedUser = await user.deleteOne();

    // verify deletion
    if (!deletedUser)
      return next(new BadRequest400('failed to delete user @remove-user'));

    // remove
    // deletedUser.password = undefined;
    //    deletedUser.salt = undefined;

    const { name, email, seller } = deletedUser;

    return res.json({ name, email, seller: seller.type });
  } catch (error) {
    return next(error);
  }
};

const userById = async (req, res, next, userId) => {
  try {
    // Validate the userId
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return next(new Unauthorized401('valid id is required @userById'));
    }

    // Find the user by ID
    const user = await User.findById(userId).exec();

    // Check if the user exists
    if (!user) return next(new Unauthorized401('User not found @userById'));

    // Attach the user to req.profile
    req.profile = user;

    return next();
  } catch (error) {
    return next(error);
  }
};

// need transfer?
const isSeller = (req, res, next) => {
  const { profile } = req;

  // check if user is a seller
  if (profile?.seller === true) return next();

  // else return 403
  return next(
    new Forbidden403(`${profile?.name || 'User'} is not a seller @isSeller`)
  );
};

// https://connect.stripe.com/express/oauth/authorize
// https://connect.stripe.com/express/oauth/token

// frontend - http://localhost:5000/seller/stripe/connect?scope=read_write&code=ac_PvfdPjM2VqzycLQKCqt1b5C6coS6EQ9A
// local.search = ?scope=read_write&code=ac_PvfdPjM2VqzycLQKCqt1b5C6coS6EQ9A

const stripeAuth = async (req, res, next) => {
  try {
    if (!req?.body?.stripe) return next(new NotFound404('no stripe'));

    const response = await axios.post(stripeUrl, {
      client_secret: process.env.STRIPE_SECRET_KEY,
      code: req.body.stripe,
      grant_type: 'authorization_code'
    });

    if (!response) {
      return next(new BadRequest400('stripe auth error'));
    }

    // eslint-disable-next-line require-atomic-updates
    req.body.stripe_seller = response.data;

    return next();
  } catch (error) {
    return next(error);
  }
};

// eslint-disable-next-line consistent-return
const stripeCustomer = (req, res, next) => {
  // checks
  if (!req.body?.token || !req.profile?.email) {
    return next(new NotFound404('missing info @stripeCustomer'));
  }

  console.log({ reqBodyStripe: req.body });

  // determine if user already has a stripe customer id
  if (req.profile?.stripe_customer) {
    // update existing stripe customers
    myStripe.customers.update(
      req.profile.stripe_customer,
      {
        source: req.body.token
      },
      (err, customer) => {
        if (err) {
          return next(new BadRequest400('Could not update charge details'));
        }
        console.log({ updateCust: customer });

        req.body.order.payment_id = customer.id;
        return next();
      }
    );
  } else {
    // create new stripe customer
    myStripe.customers
      .create({
        email: req.profile?.email,
        source: req.body.token
      })

      .then(async customer => {
        console.log({ customer });

        try {
          const result = await User.updateOne(
            { _id: req.profile?._id },
            { $set: { stripe_customer: customer?.id } }
          );

          if (!result) {
            return next(
              new BadRequest400('failed at update customer @strCustomer')
            );
          }

          console.log({ customerCreate: customer });

          // eslint-disable-next-line require-atomic-updates
          req.body.order.payment_id = customer.id;

          return next();
        } catch (error) {
          return next(error);
        }
      });
  }
};

const createCharge = (req, res, next) => {
  console.log('createCharge');

  if (!req.order?.payment_id) {
    return next(new NotFound404('no payment id @crtCharge'));
  }
  if (!req.profile?.stripe_seller) {
    return next(new BadRequest400('Please connect your Stripe account'));
  }

  // create toke for customer
  return myStripe.tokens
    .create(
      { customer: req.order.payment_id },
      { stripeAuth: req.profile.stripe_seller.stripe_user_id }
    )

    .then(token => {
      myStripe.charges
        .create(
          {
            amount: req.body.amount * 100, // amount in cents
            currency: 'usd',
            source: token.id
          },
          {
            stripeAuth: req.profile.stripe_seller.stripe_user_id
          }
        )
        .then(charge => {
          const {
            billing_details,
            outcome,
            paid,
            payment_method_details,
            receipt_url
          } = charge;
          console.log({
            address: billing_details.address,
            seller_message: outcome.seller_message,
            paid,
            receipt_url,
            paymentDetail: payment_method_details.card
          });
          next();
        });
    })
    .catch(err => next(err));
};

module.exports = {
  read,
  list,
  update,
  remove,
  userById,
  isSeller,
  stripeCustomer,
  stripeAuth,
  createCharge
};
