const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const UsersRepository = require('../../repositories/usersRepository');

// Extract the "msgs" prop and assign it to the "authMsgs" const
// Extract the "saltRounds" prop (nested in the "bcrypt" prop), and assign it to the "rounds" const
const { msgs: authMsgs, bcrypt: { saltRounds: rounds } } = require('./constants');

const strategyOpts = {
  usernameField: 'email', // override the default 'username' field in the request body
  // passwordField: 'pass', // override the default 'password' field in the request body
  passReqToCallback: true
};

const queryOpts = {
  projection: {
    password: 1 // Explicitly include "password" and implicitly exclude all unspecified fields
  }
};

// From http://www.passportjs.org/docs/configure/
// The verify callback's job is to find a user with the provided credentials
// When Passport authenticates a request, it parses the credentials contained
// in the request body ('username' and 'password' fields, unless overridden)
// It then invokes the verify callback with those credentials as arguments.
// If the credentials are valid, the verify callback invokes 'done' to supply
// Passport with the authenticated user. If the credentials are not valid,
// 'done' should be invoked with false instead of a user to indicate
// authentication failure.
// If an exception occurred while verifying the credentials
// 'done' should be invoked with an error, in conventional Node style.

const loginVerifyCallback = async (req, username, password, done) => {
  // const cursor = UsersRepository.get();
  // const cursor = UsersRepository.get({ username: { $eq: username } });
  // const cursor = UsersRepository.getBy('username', { $eq: username });
  // const user = await cursor.next();
  // Find the username in the DB
  const user = await UsersRepository.getOneBy('email', username, queryOpts);

  if (!user) {
    return done(null, false, authMsgs.login.invalidCredentials);
  }

  // const passOK = await bcrypt.compare();
  // return passOK ? done(null, user) : done(null, false);
  bcrypt.compare(password, user.password)
    .then(passOK => {
      return passOK ?
        done(null, { id: user._id }, authMsgs.login.success) :
        done(null, false, authMsgs.login.invalidCredentials);
    });
}

const signupVerifyCallback = async (req, username, password, done) => {
  // Find the username
  // const cursor = UsersRepository.getBy('username', username);
  // const user = await cursor.next();
  const user = await UsersRepository.getOneBy('email', username, queryOpts);

  if (user) {
    return done(null, false, authMsgs.signup.userExists);
  }

  // Hash new user's password and add user to DB
  bcrypt.hash(password, rounds)
    .then(hash => {
      UsersRepository.add({ email: username, password: hash })
        .then(result => {
          return result.insertedCount === 1 ? // If the repository uses upsertOne is used, check upsertedCount & upsertedId._id
            done(null, { id: result.insertedId }, authMsgs.signup.success) :
            done(null, false, authMsgs.signup.createError);
        })
        .catch(err => done(err));
    })
    .catch(err => done(err));
}

passport.use('local-login', new LocalStrategy(strategyOpts, loginVerifyCallback));
passport.use('local-signup', new LocalStrategy(strategyOpts, signupVerifyCallback));
