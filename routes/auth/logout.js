module.exports = (req, res, next) => {
  req.logout();
  req.flash('messageSuccess', 'Successfully logged out')
  res.redirect('/login')
}
