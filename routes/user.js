const express   = require('express');
const passport  = require('passport');
const router    = express.Router();

/**
 * GET /user/
 *
 * Display Home page
 */
router.get("/", passport.authenticate('session'), (request, response) => {
  response.render('user', { user: request.user });
});

/**
 * POST /user/signup
 *
 * Register user using Passport.js Local Strategy (local-signup)
 * On success, redirect to homepage, otherwise to signin page
 */
//
router.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/user',
  failureRedirect: '/login'
  })
);

module.exports = router;
