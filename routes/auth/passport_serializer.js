const passport = require('passport');
// import { serializeUser, deserializeUser } from 'passport';

passport.
serializeUser((user, done) => {
  process.nextTick(() => {
    // The "user" object will be available in the request's user object
    // It is possible to store any object, e.g., done(null, { id: user._id })
    //done(null, user);
    done(null, {
      id: user._id,
      username: user.username
    });
  });
});

passport.
deserializeUser((user, done) => {
  process.nextTick(() => {
    done(null, user);
  });
});
