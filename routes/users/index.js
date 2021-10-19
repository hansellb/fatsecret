let users = module.exports = {}

const ObjectId        = require('mongodb').ObjectId;
const UsersRepository = require('../../repositories/usersRepository');

users.home = async (req, res, next) => {
  // const cursor = UsersRepository.get();
  // res.send(await cursor.toArray());
  res.render('users/home');
}

users.profile = async (req, res, next) => {
  // The object passed as 2nd argument to res.render is made
  // available to the view and overrides values set in
  // res.locals, for example, using a middleware.
  // Note that req.user is set by Passport.js's serializeUser
  // res.render('users/profile', { userProfile: req.user });
  const id = req.user && req.user.id;

  // https://docs.mongodb.com/drivers/node/current/fundamentals/crud/read-operations/project/
  // Projections work in two ways:
  // Explicitly include fields with a value of 1. This has the side-effect of implicitly excluding all unspecified fields.
  // Implicitly exclude fields with a value of 0. This has the side-effect of implicitly including all unspecified fields.
  // These two methods of projection are mutually exclusive: if you explicitly include fields, you cannot explicitly exclude fields, and vice versa.
  // _id is the only exception to the mutually exclusive include-exclude behavior in projections: you can explicitly exclude _id even when explicitly including other fields if you do not want _id to be present in returned documents.
  const options = {
    projection: {
      password: 0
    }
  };
  const user = await UsersRepository.getOneBy('id', ObjectId(id), options);
  res.render('users/profile', {
    user: user
  });
};
