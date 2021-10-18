const bcrypt                  = require('bcrypt');
const db                      = require('./db.js');
const objectId                = require('mongodb').ObjectId;
const passport                = require('passport');
const passprtFacebookStrategy = require('passport-facebook');
const passprtGoogleStrategy   = require('passport-google');
const passprtLocalStrategy    = require('passport-local');
const passprtTwitterStrategy  = require('passport-twitter');

const saltRounds = 10;




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

    // Find the username
    Users.findOne({ username: username })
      .then(async user => {
        // Check if request is to signup a new user
        if (request.body.hasOwnProperty('newUser') || request.body.newUser) {
          if (user) {
            return done(null, false, { message: 'Username already exists' });
          }

          // Hash new user's password and add user to DB
          bcrypt.hash(password, saltRounds)
            .then(hash => {
              Users.insertOne({ username: username, password: hash })
                .then(result => {
                  if (result.ok === 1 || result.insertedCount === 1) {
                    console.log(`User ${result.ops[0].username} with id ${result.insertedId} added successfully!!!`);
                    return done(null, user, { message: 'Sign up successful!!!' });
                  }

                  return done(null, false, { message: 'Could not create user' });
                })
                .catch(err => console.error(err));
            });
        } else {
          // If request is for login, check if user was found
          if (!user) {
            return done(null, false, { message: 'Invalid credentials' });
          }

          // Compare the provided password with the hash found in the DB
          bcrypt.compare(password, user.password)
            .then(hashesEqual => {
               if (!hashesEqual) {
                return done(null, false, { message: 'Invalid credentials' });
              }

              return done(null, user, { message: 'Login successful!!!' });
            });
        }
      })
      .catch(err => done(err));
  }));

  passport.serializeUser((user, done) => {
    // console.log('\n*************** serializeUser user ***************\n', user);
    // console.log('\n*******************************************\n');
    process.nextTick(() =>
      done(null, {
        id: user.id,
        username: user.username,
        email: user.email
      }));
  });

  passport.deserializeUser((user, callback) => {
    // console.log('\n*************** deserializeUser user ***************\n', user);
    // console.log('\n*******************************************\n');
    process.nextTick(() => callback(null, user));
  });
}