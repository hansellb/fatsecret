const express   = require('express');
const passport  = require('passport');
const router    = express.Router();

/**
 * GET /login
 *
 * Display login page
 */
router.get('/', function(req, res){
  res.render('login');
});

/**
 * POST /login
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

/**
 * GET /logout
 *
 * Logout users, delete their session and return to homepage
 */
router.get('/logout', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

module.exports = router;
