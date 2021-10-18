const express   = require('express');
const passport  = require('passport');
const router    = express.Router();

/**
 * GET /logout
 *
 * Logout users, delete their session and return to homepage
 */
router.get('/', function(req, res){
  req.logout();
  res.redirect('/');
  if (req.user) {
    const name = req.user.username;
    req.session.notice = "You have successfully been logged out " + name + "!";
  }
});

module.exports = router;
