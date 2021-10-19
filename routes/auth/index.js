require('./passport_strategies');
require('./passport_serializer');
const { login, loginPage } = require('./login');
const logout = require('./logout');
const signup = require('./signup');
//import { signupPage, signupAuth } from './signup'; // Cannot use import statement outside a module

module.exports = {
  login: login,
  loginPage: loginPage,
  logout: logout,
  signup: signup.authenticate,
  signupPage: signup.page
}
