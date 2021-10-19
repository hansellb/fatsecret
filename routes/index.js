const express = require('express');
const router  = express.Router();

const auth    = require('./auth');
const pages   = require('./pages');
const smarty  = require('./smarty');
const users   = require('./users');

const { requireAdmin, requireLogin, requireSignup } = require('../middleware/auth');

/**
 * Pages endpoints
 */

router
  .get('/', pages.home)
  .get('/admin', requireAdmin, pages.admin)
  .get('/special', requireSignup, pages.special);

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
  .post('/login', auth.login)
  .get('/logout', auth.logout)
  .get('/signup', auth.signupPage)
  .post('/signup', auth.signup);

/**
 * Smarty endpoints
 */
router
  .get('/smarty', smarty.home);

module.exports = router;
