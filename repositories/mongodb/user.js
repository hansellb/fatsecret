let userMongoDB = module.exports = {}

const db = require('../../utils/db');

userMongoDB.find = () => {
  const Users = db.instance.collection('users');

  return Users.find();
}