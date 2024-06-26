const router = require('express').Router();

const { requireLogin } = require('../controllers/auth.cont');
const { isOwner, shopById } = require('../controllers/shop.cont');
const {
  list,
  read,
  create,
  update,
  remove,
  productById,
  listByShop,
  listLatest,
  listCategories,
  listRelated,
  photo,
  defaultPhoto
} = require('../controllers/product.cont');

router
  .route('/products/by/:shopId')
  .get(listByShop)
  .post(requireLogin, isOwner, create);

router.route('/products/latest').get(listLatest);

router.route('/products/related/:productId').get(listRelated);

router.route('/products/categories').get(listCategories);

router.route('/products').get(list); // list w/ Query

router.route('/product/image/:productId').get(photo, defaultPhoto);

router.route('/products/defaultphoto').get(defaultPhoto);

router.route('/product/:productId').get(read);

router
  .route('/product/:shopId/:productId')
  .patch(requireLogin, isOwner, update)
  .delete(requireLogin, isOwner, remove);

router.param('shopId', shopById);
router.param('productId', productById);

module.exports = { productRoute: router };
