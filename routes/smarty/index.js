let smarty = {}

smarty.home = (request, response) => {
  response.sendFile(path.join(__dirname, "/../views/index.html"));
};

module.exports = smarty
