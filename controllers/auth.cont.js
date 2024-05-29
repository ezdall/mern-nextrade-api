const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { compare, hash, genSalt } = require('bcrypt');

//
const User = require('../models/user.model');

// helper
const { BadRequest400 } = require('../helpers/bad-request.error');
const { Unauthorized401 } = require('../helpers/unauthorized.error');
const { Forbidden403 } = require('../helpers/forbidden.error');

/**
 * @desc Register
 * @route POST - /auth/register
 * @access Public
 */

const register = async (req, res, next) => {
  try {
    const { name, email, password, seller } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      (seller && typeof seller !== 'boolean')
    ) {
      return next(new BadRequest400('valid fields are required @register'));
    }

    // async hash
    const salt = await genSalt();
    const hashedPassword = await hash(password, salt);

    const newUser = await User.create({
      ...req.body,
      hashed_password: hashedPassword, // add hash on schmema
      password, // handle by virtual
      salt
    });

    if (!newUser) return next(new BadRequest400('invalid user @register'));

    return res.status(201).json({
      message: `register ${name} successfully!`
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * @desc Login
 * @route POST - /auth
 * @access Public
 */

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new BadRequest400('all field required @login'));
    }

    const user = await User.findOne({ email }).exec();

    if (!user) {
      return next(new Unauthorized401('User not found @login'));
    }

    // pass, hashed_password
    const passMatch = await compare(password, user.hashed_password);

    if (!passMatch || typeof passMatch !== 'boolean') {
      return next(new Unauthorized401('wrong password @login'));
    }

    const accessToken = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        seller: user.seller
      },
      process.env.ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { email: user.email },
      process.env.REFRESH_SECRET,
      { expiresIn: '1d' }
    );

    user.refresh_token = refreshToken;

    const result = await user.save();

    if (!result) return next(new BadRequest400('invalid refresh @login'));

    // refresh token for cookie
    res.cookie('jwt', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000 // maxAge: 60* 1000
    });

    const { _id, name, seller } = user;

    return res.json({
      accessToken,
      user: { _id, name, email, seller }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc Logout
 * @route GET - /auth/logout
 * @access Public
 */

const logout = async (req, res, next) => {
  try {
    const { cookies } = req;

    if (!cookies?.jwt) {
      res.clearCookie('jwt');
      return res.sendStatus(204); // 204 no content
    }

    // eslint-disable-next-line camelcase
    const refresh_token = cookies.jwt;

    // + .lean() ?
    const user = await User.findOne({ refresh_token }).exec();

    if (!user) {
      res.clearCookie('jwt');
      return res.sendStatus(204);
    }

    // clear cookie at database
    user.refresh_token = undefined;

    await user.save();

    // add more options
    res.clearCookie('jwt');

    // 204 no-content
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc Refresh
 * @route GET - /auth/refresh
 * @access Public - bcoz access token has expired
 */

const refresh = async (req, res, next) => {
  const { cookies } = req;

  // console.log({ cookieRef: cookies.jwt });

  if (!cookies?.jwt)
    return next(new Unauthorized401('cookie not found! @refresh'));

  // eslint-disable-next-line camelcase
  const refresh_token = cookies.jwt;

  // console.log({ foundUser, refresh_token });

  // if (!foundUser) return next(new Forbidden403('Forbidden token @refresh'));

  // console.log(foundUser);

  // refresh token reuse

  // if (!foundUser) {
  //   return jwt.verify(
  //     refresh_token,
  //     process.env.REFRESH_SECRET,
  //     async (err, decoded) => {
  //       if (err) {
  //         console.log(err);
  //         // return next(err);
  //         // return next(new Forbidden403('Forbidden verify1 @refresh'));
  //       }
  //       console.log('attempt refresh reuse!');

  //       const hackedUser = await User.findOne({ email: decoded.email }).exec();
  //       hackedUser.refresh_token = undefined;
  //       const result = await hackedUser.save();
  //       console.log({ result });
  //       return res.sendStatus(405); // Forbidden
  //     }
  //   );
  // }

  return jwt.verify(
    refresh_token,
    process.env.REFRESH_SECRET,
    async (err, decoded) => {
      if (err) return next(err);

      const foundUser = await User.findOne({ refresh_token }).exec();

      if (!foundUser || foundUser.email !== decoded.email)
        return next(new Forbidden403('cookie dont match'));

      const { _id, name, email, seller } = foundUser;

      const accessToken = jwt.sign(
        {
          _id,
          email,
          seller
        },
        process.env.ACCESS_SECRET,
        { expiresIn: '30min' }
      );

      return res.json({ accessToken, user: { _id, name, email, seller } });
    }
  );
};

// checks and decoder of "Bearer xxx" req.headers.authorization
// then "Mount" data to req.auth
const requireLogin = expressJwt({
  secret: process.env.ACCESS_SECRET,
  algorithms: ['HS256'],
  requestProperty: 'auth'
});

const hasAuth = (req, res, next) => {
  console.log({ reqProf: req.profile, reqAuth: req.auth });

  const authorized =
    req.profile && req.auth && String(req.profile._id) === String(req.auth._id);

  if (!authorized) return next(new Forbidden403('Forbidden! @isAuth'));

  return next();
};

// header check
const hdrChk = (req, res, next) => {
  const authHeaders = req.headers.authorization || req.headers.Authorization;
  console.log({ authHeaders });

  next();
};

module.exports = {
  hdrChk,
  login,
  register,
  refresh,
  logout,
  hasAuth,
  requireLogin
};
