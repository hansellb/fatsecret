const passport = require('passport');
// import { serializeUser, deserializeUser } from 'passport';

passport.
serializeUser((user, done) => {
  process.nextTick(() => {
    // The "user" object will be available in req.user (user prop in request obj)
    // with the data passed to the invoked callback (usually named `done`) in
    // Passport.js strategy's verify callback, that is,
    // passport.use('strategy-name', new Strategy(strategyOpts, verifyCallback));
    // verifyCallback = (req, username, password, [callback|done]) => { ... done ...}
    // It is possible to store any object, e.g.,
    // done(null, { id: user._id, username: user.username });
    done(null, user);
  });
});

passport.
deserializeUser((user, done) => {
  process.nextTick(() => {
    done(null, user);
  });
});
