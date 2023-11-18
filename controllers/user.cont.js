const mongoose = require('mongoose');
const _ = require('lodash');
const { genSalt, hash } = require('bcrypt');
const axios = require('axios')
const stripe = require('stripe')

const myStripe = stripe(process.env.STRIPE_SECRET_KEY)

// model
const User = require('../models/user.model');
const Shop = require('../models/shop.model')

// helper
const { BadRequest400 } = require('../helpers/bad-request.error');
const { Unauthorized401 } = require('../helpers/unauthorized.error');
const { Forbidden403 } = require('../helpers/forbidden.error');
const { NotFound404 } = require('../helpers/not-found.error');

const read = (req, res, next) => {
  const user = req.profile.toObject();

  user.password = undefined;
  user.salt = undefined;

  return res.json({ user });
};

const list = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('name email updated created')
      .lean()
      .exec();

    if (!users) return next(new NotFound404('no users @list'));

    return res.json(users);
  } catch (err) {
    return next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { password } = req.body;
    let user = req.profile;

    if (!user) return next(new NotFound404('no user found @update'));

    user = _.extend(user, req.body);

    if (password) {
      const salt = await genSalt();

      user.salt = salt;
      user.password = await hash(password, salt);
    }

    // user.name = name || user.name;
    // user.email = email || user.email;
    //  user.seller = seller ?? user.seller;

    await user.save();

    user.password = undefined;
    user.salt = undefined;

    return res.json(user);
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const user = req.profile;

    if (!user) return next(new NotFound404('no user found @remove-user'));

    const shop = await Shop.findOne({owner: user._id}).lean().exec()

    if(shop){
      return next(new BadRequest400('user has shop @remove-user'))
    }

    const deletedUser = await user.deleteOne();

    if (!deletedUser)
      return next(new BadRequest400('invalid delete user @remove-user'));

    deletedUser.password = undefined;
    deletedUser.salt = undefined;

    return res.json(deletedUser);
  } catch (err) {
    return next(err);
  }
};

const userById = async (req, res, next, userId) => {
  try {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return next(new BadRequest400('valid id is required @userById'));
    }

    const user = await User.findById(userId).exec();

    if (!user) return next(new NotFound404('User not found @userById'));

    req.profile = user;

    return next();
  } catch (err) {
    return next(err);
  }
};

//  need to transfer
const isSeller = (req, res, next) => {
  const { seller, name } = req.profile;
  const wasSeller = seller && typeof seller === 'boolean';

  if (!wasSeller) return next(new Forbidden403(`${name} is not a seller @isSeller`));

  return next();
};

// https://connect.stripe.com/express/oauth/authorize
// https://connect.stripe.com/express/oauth/token

const stripeAuth = async (req, res, next) => {
  try{
     const {stripe} = req.body

     if(!stripe) return next(new NotFound404('no stripe'))

    const response = await axios.post("https://connect.stripe.com/oauth/token", {
      client_secret: process.env.STRIPE_SECRET_KEY,
      code: stripe, 
      grant_type: 'authorization_code'
    })

    // console.log({resp:response.data})

    if(!response) return next(new BadRequest400('stripe auth error'))

    // mount
    // req.body.stripeSeller=response.data
    req.body.stripe_seller = response.data

    return next()
  } catch(err){
    return next(err)
  }
}

const stripeCustomer = (req, res, next) => {
  // console.log('stripeCustomer');

  // console.log({ stripe: req.profile })

  if(req.profile.stripe_customer){
      //update stripe customer
      myStripe.customers.update(req.profile.stripe_customer, {
          source: req.body.token
      }, (err, customer) => {
        if(err){
          return next(new BadRequest400('Could not update charge details'))
        }

        req.body.order.payment_id = customer.id
        next()
      })
  } else {
    // create new
      myStripe.customers.create({
            email: req.profile.email,
            source: req.body.token
        })
      .then(async customer => {
         try{
            const result = await User.updateOne({_id:req.profile._id}, {$set: { stripe_customer: customer.id }})

            if(!result){
                return next(new BadRequest400('error at update customer'))
            }

            // mount
            req.body.order.payment_id = customer.id

          return next()
        } catch (err){
          return next(err)
        } 
      })
  }
};


const createCharge = (req, res, next) => {
  console.log('createCharge');

  if(!req.profile.stripe_seller){
    return next(new BadRequest400("Please connect your Stripe account"))
  }

  myStripe.tokens.create({
    customer: req.order.payment_id,
  }, {
    stripeAccount: req.profile.stripe_seller.stripe_user_id,
  })
  .then((token) => {
      myStripe.charges.create({
        amount: req.body.amount * 100, //amount in cents
        currency: "usd",
        source: token.id,
      }, {
        stripeAccount: req.profile.stripe_seller.stripe_user_id,
      }).then((charge) => {
        next()
      })
  })
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
