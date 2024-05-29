const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const _extend = require('lodash/extend');
const { IncomingForm } = require('formidable');

const Shop = require('../models/shop.model');
const Product = require('../models/product.model');

// helper
const { BadRequest400 } = require('../helpers/bad-request.error');
const { Unauthorized401 } = require('../helpers/unauthorized.error');
const { Forbidden403 } = require('../helpers/forbidden.error');
const { NotFound404 } = require('../helpers/not-found.error');
// const { isMongoObj } = require('../helpers/is-mongo-obj');

const list = async (req, res, next) => {
  try {
    const shops = await Shop.find()
      .select('-image') // for dev
      .populate({ path: 'owner', select: 'name' }) // for dev
      .lean()
      .exec();

    if (!shops) return next(new NotFound404('error shops @list-shop'));

    return res.json(shops);
  } catch (error) {
    return next(error);
  }
};

const listByOwner = async (req, res, next) => {
  try {
    if (!req.profile)
      return next(new NotFound404('no profile @shop-listByOwner'));

    const shops = await Shop.find({ owner: req.profile._id })
      .select('-image.data')
      .populate({ path: 'owner', select: 'name' })
      .lean()
      .exec();

    if (!shops) return next(new NotFound404('err shops @list-by-owner'));

    return res.json(shops);
  } catch (error) {
    return next(error);
  }
};

const read = (req, res, next) => {
  if (!req?.shop) return next(new NotFound404('no req.shop @readShop'));

  req.shop.image = undefined;

  return res.json(req.shop);
};

const create = (req, res, next) => {
  // reject 'json' and 'form-urlencoded'
  // Check if request is 'multipart/form-data' (formidable)
  if (!req.is('multipart/form-data'))
    return next(
      new BadRequest400(
        'Invalid form type. Only "multipart/form-data" is allowed.'
      )
    );

  // pase the form using formidable
  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 2 * 1024 * 1024 // 2mb
  });

  return form.parse(req, async (err, fields, files) => {
    if (err) {
      return next(new BadRequest400(`Error parsing form data: ${err.message}`));
      // return next(err);
    }
    console.log({ fields, files }); // name, doc, img

    try {
      // create a new shop using form fields
      const shop = new Shop(fields);
      // is redundant, is this populated?
      // ans: no, bcoz it uses :userId
      shop.owner = req.profile._id;

      // process image file if provided
      if (files?.image) {
        // validate image size and prop
        if (files.image?.size > 2 * 1024 * 1024) {
          return next(new BadRequest400('Image size should not exceed 2MB.'));
        }

        if (!files.image?.filepath || !files.image?.mimetype) {
          return next(
            new BadRequest400(
              'missing image file or type @createShop-file-image'
            )
          );
        }
        // read image and set to shop
        shop.image.data = fs.readFileSync(files.image?.filepath);
        shop.image.contentType = files.image?.mimetype;
      }

      // save shop instance
      const result = await shop.save();

      // validate result
      if (!result) {
        return next(new BadRequest400('Failed to create @crtShop'));
      }

      const { _id, name, description, owner, image } = result;

      if (process.env.NODE_ENV !== 'production') {
        image.data = undefined; // remove during dev/test only
      }

      return res.status(201).json({ _id, name, description, owner, image });
    } catch (error) {
      return next(error);
    }
  });
};

const update = (req, res, next) => {
  if (!req.is('multipart/form-data'))
    return next(
      new BadRequest400(
        'Invalid form type. Only "multipart/form-data" is allowed.'
      )
    );

  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 2 * 1024 * 1024 // 2mb
  });

  return form.parse(req, async (err, fields, files) => {
    if (err) return next(err);

    try {
      let { shop } = req;

      shop = _extend(shop, fields);

      if (files?.image) {
        if (files.image?.size > 2 * 2 * 1024) {
          return next(new BadRequest400('Image size should not exceed 2MB.'));
        }

        if (!files.image?.filepath || !files.image?.mimetype) {
          return next(new BadRequest400('lack image info @updShop-file-image'));
        }

        shop.image.data = fs.readFileSync(files.image?.filepath);
        shop.image.contentType = files.image?.mimetype;
      }

      const result = await shop.save();

      if (!result) {
        return next(new BadRequest400('Failed to update @crtShop'));
      }

      const { _id, name, description, owner, image } = result;

      if (process.env.NODE_ENV !== 'production') {
        image.data = undefined; // remove during dev/test only
      }

      return res.json({ _id, name, description, owner, image });
    } catch (error) {
      return next(error);
    }
  });
};

const remove = async (req, res, next) => {
  try {
    const { shop } = req;

    if (!shop) return next(new NotFound404('Shop not found @delShop'));

    // check if shop has any associated products
    // const product = await Product.findOne({shop: shop._id}).lean().exec()
    const hasProducts = await Product.exists({ shop: shop._id });

    if (hasProducts) {
      return next(
        new BadRequest400('Cannot delete because it shop has products')
      );
    }

    const deletedShop = await shop.deleteOne();

    if (!deletedShop) {
      return next(new NotFound404('Failed to delete @delShop'));
    }

    const { _id, name, owner } = deletedShop;

    return res.json({ _id, name, owner });
  } catch (err) {
    return next(err);
  }
};

const isOwner = (req, res, next) => {
  const { shop, auth } = req;

  // Verify if the shop owner matches the authenticated user
  // similar to hasAuth
  const userIsOwner = shop?.owner?._id.toString() === auth?._id.toString();

  if (!userIsOwner) {
    return next(
      new Forbidden403('Forbidden: You are not the owner of this shop.')
    );
  }

  // continue to next middleware
  return next();
};

const shopById = async (req, res, next, shopId) => {
  try {
    // validate shopId
    if (!shopId || !mongoose.isValidObjectId(shopId)) {
      return next(new Unauthorized401('valid shop id is required @shopById'));
    }

    // find shop, then populate owner field
    const shop = await Shop.findById(shopId)
      .populate({ path: 'owner', select: 'name ' }) // for client
      .exec();

    if (!shop) return next(new Unauthorized401('Shop not found'));

    // attach
    req.shop = shop;

    // proceed to next middleware
    return next();
  } catch (error) {
    return next(error);
  }
};

const photo = (req, res, next) => {
  const { shop } = req;

  // must check if shop exist and has image data
  if (shop?.image?.data) {
    // set content type to shop image content type
    res.set('Content-Type', shop.image.contentType);
    return res.send(shop.image.data);
  }
  // proceed to default photo, if not image data found
  return next();
};

const defaultPhoto = (req, res, next) => {
  // define path for default image file
  const defaultImagePath = path.resolve(
    __dirname,
    '..',
    'dist',
    'img',
    'default.jpg'
  );

  return res.sendFile(defaultImagePath);
};

module.exports = {
  list,
  listByOwner,
  read,
  create,
  update,
  remove,
  isOwner,
  shopById,
  photo,
  defaultPhoto
};
