const router = require('express').Router();

const { isSeller, userById } = require('../controllers/user.cont');
const { requireLogin, hasAuth } = require('../controllers/auth.cont');
const {
  list,
  listByOwner,
  read,
  create,
  update,
  remove,
  shopById,
  isOwner,
  photo,
  defaultPhoto
} = require('../controllers/shop.cont');

router.get('/shops', list);

router.get('/shop/:shopId', read);

router
  .route('/shops/by/:userId')
  .post(requireLogin, hasAuth, isSeller, create)
  .get(requireLogin, hasAuth, listByOwner);

router.get('/shops/logo/:shopId', photo, defaultPhoto);

router.get('/shops/defaultphoto', defaultPhoto);

router
  .route('/shops/:shopId')
  .patch(requireLogin, isOwner, update) // this will be error
  .delete(requireLogin, isOwner, remove); // isOwner instead of hasAuth

router.param('userId', userById);
router.param('shopId', shopById);

module.exports = { shopRoute: router };
