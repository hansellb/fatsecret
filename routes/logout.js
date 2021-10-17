const express   = require('express');
const passport  = require('passport');
const router    = express.Router();

/**
 * GET /logout
 *
 * Logout users, delete their session and return to homepage
 */
router.get('/', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

module.exports = router;
