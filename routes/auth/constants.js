let authConstants = module.exports = {};

authConstants.bcrypt = {
  saltRounds: 10
};

authConstants.msgs = {
  login: {
    invalidCredentials: {
      message: 'Invalid Credentials',
      type: 'messageFailure'
    },
    success: {
      message: 'Welcome!!!',
      type: 'messageSuccess'
    }
  },
  signup: {
    createError: {
      message: 'Could not create user',
      type: 'messageFailure'
    },
    userExists: {
      message: 'Username already exists',
      type: 'messageFailure'
    },
    success: {
      message: 'Sign up successful!!!',
      type: 'messageSuccess'
    }
  }
};
