let auth = module.exports = {};

let requireAuth = ({ flashMsg, redirectPath }) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      req.flash(flashMsg.type, flashMsg.message);

      return res.redirect(redirectPath);
    }
    next();
  }
};

auth.requireLogin = requireAuth({
  flashMsg: {
    message: 'Login required',
    type: 'messageFailure',
  },
  redirectPath: '/login'
});
