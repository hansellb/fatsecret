const express   = require('express');
const passport  = require('passport');
const router    = express.Router();

/**
 * POST /signup
 *
 * Authenticate user using Passport.js Local Strategy - https://github.com/jaredhanson/passport-local
 * On successful auth, redirect to homepage, otherwise to signin page
 */
 router.post('/',
  passport.authenticate(
    'local-login',
    {
      successRedirect: '/user',
      successFlash: true,
      failureRedirect: '/login',
      failureFlash: true
    },
    // Use Passport Authenticate Custom Callback
    // function (err, user, info) {
    //   console.log('\n*************** err, user, info ***************\n', err, user, info);
    //   console.log('\n*******************************************\n');
    // }
  )
);

module.exports = router;
