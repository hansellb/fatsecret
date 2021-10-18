require('./passport_strategies');
require('./passport_serializer');
const login = require('./login');
const signup = require('./signup');
//import { signupPage, signupAuth } from './signup'; // Cannot use import statement outside a module

module.exports = {
  loginAuth: login.loginAuth,
  loginPage: login.loginPage,
  signupAuth: signup.signupAuth,
  signupPage: signup.signupPage
}
