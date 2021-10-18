let signup = module.exports = {}

const passport = require('passport');

signup.page = (req, res, next) => {
  res.render('auth/signup');
}

signup.auth = passport.authenticate('local-signup', {
  failureFlash: true, // { message: 'Email already taken', type: 'messageFailure' }
  failureRedirect: '/signup',
  successFlash: true, // { message: 'Successfully signed up.', type: 'messageSuccess' }
  successRedirect: '/users/profile',
});
