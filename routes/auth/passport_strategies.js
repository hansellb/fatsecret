const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const UsersRepository = require('../../repositories/userRepository');
const authMsgs = require('./authMsgs');

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
passport.use('local-login', new LocalStrategy({
  usernameField: 'email', // override the default 'username' field in the request body
  // passwordField: 'pass', // override the default 'password' field in the request body
  passReqToCallback: true
}, async (req, username, password, done) => { // Verify callback
  // const cursor = UsersRepository.get();
  // const cursor = UsersRepository.get({ username: { $eq: username } });
  // const cursor = UsersRepository.getBy('username', { $eq: username });
  // const user = await cursor.next();
  const user = await UsersRepository.getOneBy('username', username)

  if (!user) {
    return done(null, false, authMsgs.login.invalidCredentials);
  }

  // const passOK = await bcrypt.compare();
  // return passOK ? done(null, user) : done(null, false);
  bcrypt.compare(password, user.password)
    .then(passOK => {
      return passOK ?
        done(null, user, authMsgs.login.success) :
        done(null, false, authMsgs.login.invalidCredentials);
    });

  // // Find the username
  // Users.findOne({ username: username })
  //   .then(async user => {
  //     // If request is for login, check if user was found
  //     if (!user) {
  //       return done(null, false, { message: 'Invalid credentials' });
  //     }

  //     // Compare the provided password with the hash found in the DB
  //     bcrypt.compare(password, user.password)
  //       .then(hashesEqual => {
  //           if (!hashesEqual) {
  //           return done(null, false, { message: 'Invalid credentials' });
  //         }

  //         return done(null, user, { message: 'Login successful!!!' });
  //       });
  //   })
  //   .catch(err => done(err));
}));

passport.use('local-signup', new LocalStrategy({
  usernameField: 'email',
  passReqToCallback: true
}, async (req, username, password, done) => { // Verify callback
    // Find the username
    const cursor = UsersRepository.getBy('username', username);
    const usersCount = await cursor.count();

    if (usersCount) {
      return done(null, false, authMsgs.signup.userExists);
    }

    // Hash new user's password and add user to DB
    bcrypt.hash(password, saltRounds)
      .then(hash => {
        UsersRepository.add({ username: username, password: hash })
          .then(result => {
            if (result.ok === 1 || result.insertedCount === 1) {
              console.log(`User ${result.ops[0].username} with id ${result.insertedId} added successfully!!!`);
              return done(null, user, authMsgs.signup.success);
            }

            return done(null, false, authMsgs.signup.createError);
          })
          .catch(err => console.error(err));
      })
      .catch(err => done(err));
}));