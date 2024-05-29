const router = require('express').Router();

const { requireLogin, hasAuth } = require('../controllers/auth.cont');
const {
  list,
  read,
  update,
  remove,
  stripeAuth,
  userById
} = require('../controllers/user.cont');

// router.use(requireLogin);
// any route that follows, will inherit this 'requireLogin'
// app.use('/api',[userRoute, otherRoute])
// so position it last

router.route('/users').get(list);

router
  .route('/users/:userId')
  .get(requireLogin, hasAuth, read)
  .patch(requireLogin, hasAuth, update)
  .delete(requireLogin, hasAuth, remove);

router
  .route('/stripe-auth/:userId')
  .patch(requireLogin, hasAuth, stripeAuth, update);

router.param('userId', userById);

module.exports = { userRoute: router };
