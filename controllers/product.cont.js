const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const _extend = require('lodash/extend');
const { IncomingForm } = require('formidable');

const Product = require('../models/product.model');

// utils
const { BadRequest400 } = require('../helpers/bad-request.error');
const { Unauthorized401 } = require('../helpers/unauthorized.error');
const { Forbidden403 } = require('../helpers/forbidden.error');
const { NotFound404 } = require('../helpers/not-found.error');

// const list = async (req, res, next) => {
//   try {
//     const query = {};

//     if (req.query?.search) {
//       query.name = {
//         $regex: req.query.search,
//         $options: 'i'
//       };
//     }
//     if (req.query?.category && req.query.category !== 'All') {
//       query.category = req.query.category;
//     }

//     const products = await Product.find(query)
//       .populate({ path: 'shop', select: 'name' })
//       .select('-image')
//       .lean()
//       .exec();

//     // check only for internal error
//     if (!products) {
//       // return [], let front-end do if-else
//       return next(new NotFound404('error products @listProds'));
//     }

//     return res.json(products);
//   } catch (error) {
//     return next(error);
//   }
// };

// const read = (req, res, next) => {
//   if (!req.product) return next(new NotFound404('no product @read-product'));

//   req.product.image = undefined;

//   return res.json(req.product);
// };

const create = async (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next(
      new BadRequest400(
        'Invalid form type. Only "multipart/form-data" is allowed. @crtProd'
      )
    );
  }

  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 2 * 1024 * 1024 // 2mb
  });

  return form.parse(req, async (err, fields, files) => {
    if (err) return next(err);

    try {
      const product = new Product(fields);
      product.shop = req.shop._id;

      if (files.image) {
        if (files.image?.size > 1000000) {
          return next(new BadRequest400('max 2mb image size '));
        }

        if (!files.image.filepath || !files.image.mimetype) {
          return next(new BadRequest400('lack image info @crtProd-file-image'));
        }
        product.image.data = fs.readFileSync(files.image.filepath);
        product.image.contentType = files.image.mimetype;
      }
      const result = await product.save();

      if (!result) {
        return next(new BadRequest400('invalid product @createProd'));
      }

      result.image.data = undefined;

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  });
};

// all product
const list = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.search) {
      query.name = {
        $regex: req.query.search,
        $options: 'i'
      };
    }
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }
    const products = await Product.find(query)
      .populate({ path: 'shop', select: 'name' })
      .select('-image')
      .lean()
      .exec();

    if (!products) {
      // products?.length
      return next(new NotFound404('no products @listProds'));
    }

    return res.json(products);
  } catch (err) {
    return next(err);
  }
};

const read = (req, res, next) => {
  const prod = req.product;

  prod.image = undefined;

  return res.json(prod);
};

const update = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next(new BadRequest400('invalid form @update-Prod'));
  }

  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 2 * 1024 * 1024 // 2mb
  });

  return form.parse(req, async (err, fields, files) => {
    if (err)
      return next(new BadRequest400('photo cant be uploaded @updateProd'));

    try {
      let prod = req.product;
      prod = _extend(prod, fields);

      if (files.image) {
        if (!files.image.filepath || !files.image.mimetype) {
          return next(new BadRequest400('lack image info @updProd-file-image'));
        }
        prod.image.data = fs.readFileSync(files.image.filepath); // 'path' to 'filepath'
        prod.image.contentType = files.image.mimetype; // 'type' to 'mimetype'
      }

      const result = await prod.save();

      if (!result) {
        return next(new BadRequest400('invalid update @updProd'));
      }

      result.image.data = undefined;

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });
};

// TODO  add cant remove if has order
const remove = async (req, res, next) => {
  try {
    const prod = req.product;

    if (!prod) return next(new NotFound404('no product @del-Prod'));

    const deletedProduct = await prod.deleteOne();

    if (!deletedProduct) {
      return next(new Unauthorized401('Failed to delete @delProd'));
    }

    const { _id, name, price, quantity, category, shop } = deletedProduct;

    return res.json({ _id, name, price, quantity, category, shop });
  } catch (err) {
    return next(err);
  }
};

const productById = async (req, res, next, prodId) => {
  try {
    if (!prodId || !mongoose.isValidObjectId(prodId)) {
      return next(new BadRequest400('valid id is required @prodById'));
    }

    const product = await Product.findById(prodId)
      .populate({ path: 'shop', select: 'name' })
      .exec();

    if (!product) return next(new NotFound404('Product not found'));

    req.product = product;

    return next();
  } catch (error) {
    return next(error);
  }
};

// const listByShop = async (req, res, next) => {
//   try {
//     if (!req.shop) return next(new NotFound404('no shop @prod-listByShop'));

//     const products = await Product.find({ shop: req.shop._id })
//       .populate({ path: 'shop', select: 'name' })
//       .select('-image') // ?
//       .lean()
//       .exec();

//     if (!products) {
//       return next(new NotFound404('error products @listByShop'));
//     }

//     return res.json(products);
//   } catch (error) {
//     return next(error);
//   }
// };

const listLatest = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .populate({ path: 'shop', select: 'name' })
      .sort({ createdAt: 'desc' }) // OR '-createdAt' ?
      .limit(4)
      .lean()
      .exec();

    if (!products) {
      // !products?.length
      return next(new NotFound404('no products @listLatest'));
    }

    return res.json(products);
  } catch (error) {
    return next(error);
  }
};

const listByShop = async (req, res, next) => {
  try {
    const products = await Product.find({ shop: req.shop._id })
      .populate({ path: 'shop', select: 'name' })
      .select('-image')
      .lean()
      .exec();

    if (!products) {
      // !products?.length
      return next(new NotFound404('no products @listByShop'));
    }

    return res.json(products);
  } catch (err) {
    return next(err);
  }
};

const listCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', {}).lean().exec();

    if (!categories) {
      return next(new NotFound404('no products @listCategories'));
    }

    const filterCategories = categories.filter(cat => cat.trim() !== '');

    return res.json(filterCategories);
  } catch (error) {
    return next(error);
  }
};

const listRelated = async (req, res, next) => {
  try {
    if (!req.product) return next(new NotFound404('no prod @prod-listRelated'));

    const products = await Product.find({
      _id: { $ne: req.product._id },
      category: req.product.category
    })
      .populate({ path: 'shop', select: 'name' })
      .limit(5)
      .lean()
      .exec();

    if (!products) {
      return next(new NotFound404('no products @listRelated'));
    }

    return res.json(products);
  } catch (error) {
    return next(error);
  }
};

const photo = (req, res, next) => {
  const { product } = req;

  // must check if(prod)
  if (product?.image?.data) {
    res.set('Content-Type', product.image.contentType);
    return res.send(product.image.data);
  }
  // console.log('default photo')

  return next();
};

const defaultPhoto = (req, res, next) => {
  res.sendFile(path.resolve(__dirname, '..', 'dist', 'img', 'default.jpg'));
};

const decreaseQuantity = async (req, res, next) => {
  try {
    //  no qty check??

    if (!req?.body?.order?.products) {
      return next(new BadRequest400('Invalid request format @dec-prod-qty'));
    }

    const bulkOps = req.body.order.products.map(item => {
      return {
        updateOne: {
          filter: { _id: item.product._id },
          update: { $inc: { quantity: -item.quantity } }
        }
      };
    });

    const result = await Product.bulkWrite(bulkOps, {});

    if (!result) {
      return next(new BadRequest400('invalid update @ prod-decrease'));
    }

    console.log('decrease-quantity');

    return next();
  } catch (error) {
    return next(error);
  }
};

const increaseQuantity = async (req, res, next) => {
  try {
    if (!req?.body?.quantity) {
      return next(new BadRequest400('Invalid quantity provided @inc-prod-qty'));
    }

    await Product.findByIdAndUpdate(
      req.product._id,
      { $inc: { quantity: req.body.quantity } },
      { new: true }
    ).exec();

    // no checking

    console.log('increase-quantity');

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  create,
  list,
  read,
  update,
  remove,
  productById,
  photo,
  defaultPhoto,
  listByShop,
  listLatest,
  listCategories,
  listRelated,
  decreaseQuantity,
  increaseQuantity
};
