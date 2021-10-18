const express = require('express');
const router  = express.Router();

const auth    = require('./auth');
const pages   = require('./pages');

/**
 * Pages endpoints
 */

router
  .get('/', pages.home);

/**
 * Authenticatoin endpoints
 */
router
  .get('/login', auth.loginPage)
  .post('/login', auth.loginAuth)
  .get('/signup', auth.signupPage)
  .post('/signup', auth.signupAuth);


module.exports = router;
