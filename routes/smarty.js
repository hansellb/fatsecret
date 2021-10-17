const express = require('express');
const router  = express.Router();
const path    = require('path');

/**
 * GET /smarty
 *
 * Display Smarty home page
 */
 router.get("/", (request, response) => {
  response.sendFile(path.join(__dirname, "/../views/index.html"));
});

module.exports = router;
