const router = require('express').Router();

const {
  login,
  register,
  refresh,
  logout
} = require('../controllers/auth.cont');

router.post('/login', login);

router.post('/register', register);

router.get('/refresh', refresh);

router.get('/logout', logout);

module.exports = { authRoute: router };
