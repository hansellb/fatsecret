let pages = module.exports = {}

pages.home = (req, res, next) => {
  res.render('pages/home');
}