const passport = require('passport');
// import { serializeUser, deserializeUser } from 'passport';

passport.
serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, user);
  });
});

passport.
deserializeUser((user, done) => {
  process.nextTick(() => {
    done(null, user);
  });
});
