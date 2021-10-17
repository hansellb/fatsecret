const express = require('express');
const router  = express.Router();

/**
 * GET /
 *
 * Display Home page
 */
 router.get("/", (request, response) => {
  response.render('home', { user: request.user });
});

module.exports = router;
