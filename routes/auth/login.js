const passport = require('passport');

const loginPage = (req, res, next) => {
  res.render('auth/login');
}

/**
 * Authenticate user using Passport.js Local Strategy - https://github.com/jaredhanson/passport-local
 */
const loginAuth = passport.authenticate('local-login', {
  // failureFlash: {
  //   type: 'messageFailure',
  //   message: 'Invalid email and/ or password.'
  // },
  // When "failureFlash: true", the connect-flash messages should be sent
  // from the Verify callback. There are default messages,
  // for example, when either username or password are missing:
  // { error: 'Missing credentials' }
  // but custom messages can be sent using the callback/done function:
  // done(null, [false|user], { type: 'custom_msg', message: 'My custom msg' })
  // In order to make the flash messages available inside the views, in an
  // express middleware, store the connect-flash messages in res.locals:
  // app.use((req, res, next) => {
  //   res.locals = { ...res.locals, ...req.flash() };
  //   next();
  // });
  failureFlash: true, // { message: 'Invalid email and/or password.', type: 'messageFailure'}
  failureRedirect: '/login',
  successFlash: true, // { message: 'Successfully logged in.', type: 'messageSuccess'}
  successRedirect: '/',
}//, (err, user, info) => {
//   // Passport.js Authenticate Custom Callback - http://www.passportjs.org/docs/authenticate/
//   console.log('\n*************** err, user, info ***************\n', err, user, info);
//   console.log('\n*******************************************\n');
// }
);

module.exports = {
  loginAuth,
  loginPage
};