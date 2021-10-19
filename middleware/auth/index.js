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

auth.requireSignup = requireAuth({
  flashMsg: {
    message: 'Signup required',
    type: 'messageFailure',
  },
  redirectPath: '/signup'
});

auth.requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.admin) {
    req.flash('messageFailure', 'Admins only');
    return res.redirect('/users/profile');
  }
  next();
};