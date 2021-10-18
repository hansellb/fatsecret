require('./passport_strategies');
require('./passport_serializer');
const { loginAuth, loginPage } = require('./login');
const signup = require('./signup');
//import { signupPage, signupAuth } from './signup'; // Cannot use import statement outside a module

module.exports = {
  loginAuth: loginAuth,
  loginPage: loginPage,
  signupAuth: signup.auth,
  signupPage: signup.page
}
