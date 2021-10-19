let pages = module.exports = {}

pages.admin = (req, res, next) => {
  res.render('pages/admin')
}

pages.home = (req, res, next) => {
  res.render('pages/home');
}

pages.special = (req, res, next) => {
  res.render('pages/special')
}
