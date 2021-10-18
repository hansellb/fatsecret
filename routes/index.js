const express = require('express');
const router  = express.Router();

const auth    = require('./auth');
const pages   = require('./pages');
const smarty  = require('./smarty');
const users   = require('./users');

const { requireLogin } = require('../middleware/auth');

/**
 * Pages endpoints
 */

router
  .get('/', pages.home);

/**
 * Users endpoints
 */
router
  .get('/users', requireLogin, users.home)
  .get('/users/profile', requireLogin, users.profile);;

/**
 * Authenticatoin endpoints
 */
router
  .get('/login', auth.loginPage)
  .post('/login', auth.loginAuth)
  .get('/signup', auth.signupPage)
  .post('/signup', auth.signupAuth);

/**
 * Smarty endpoints
 */
router
  .get('/smarty', smarty.home);

module.exports = router;
