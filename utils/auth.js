const db                      = require('./db.js');
const objectId                = require('mongodb').ObjectId;
const passport                = require('passport');
const passprtFacebookStrategy = require('passport-facebook');
const passprtGoogleStrategy   = require('passport-google');
const passprtLocalStrategy    = require('passport-local');
const passprtTwitterStrategy  = require('passport-twitter');





module.exports = function() {
  passport.use('local-login', new passprtLocalStrategy({
    // usernameField: 'email', // override the default 'username' field in the request body
    // passwordField: 'pass', // override the default 'password' field in the request body
    passReqToCallback: true
  },
  // From http://www.passportjs.org/docs/configure/
  // This verify callback's job is to find a user with the provided credentials
  // When Passport authenticates a request, it parses the credentials contained
  // in the request body ('username' and 'password' fields, unless overridden)
  // It then invokes the verify callback with those credentials as arguments.
  // If the credentials are valid, the verify callback invokes 'done' to supply
  // Passport with the authenticated user. If the credentials are not valid,
  // 'done' should be invoked with false instead of a user to indicate
  // authentication failure.
  // If an exception occurred while verifying the credentials
  // 'done' should be invoked with an error, in conventional Node style.
  function(request, username, password, done) { // Verify callback
    const Users = db.instance.collection('users');

    Users.findOne({ email: username })
      .then(user => {
        if (!user) {
          // Add 'flash: { error: [ 'invalid credentials' ] }' to req.session
          // return done(null, false, request.flash('message', 'invalid credentials'));
          console.log(request.body);
          if (request.body.hasOwnProperty('newUser') || request.body.newUser) {
            console.log(request.body);
          }

          return done(null, false, { message: 'invalid credentials' });
        }
        return done(null, user, { message: 'Login successful' });
      })
      .catch(err => done(err));
  }));

  passport.serializeUser((user, done) => {
    console.log('\n*************** serializeUser user ***************\n', user);
    console.log('\n*******************************************\n');
    process.nextTick(() => done(null, { id: user.id, username: user.email }));
  });

  passport.deserializeUser((user, callback) => {
    console.log('\n*************** deserializeUser user ***************\n', user);
    console.log('\n*******************************************\n');
    process.nextTick(() => callback(null, user));
  });
}