const db = require('../db/mongodb');

const Users = db.instance.collection('users');

const UserRepository = {
  get: (filter = {}) => Users.find(filter),
  getBy: (property, value) => {
    property = property === 'id' ? '_id' : property;
    return Users.find({ [property]: value });
  },
  getOneBy: (property, value) => {
    property = property === 'id' ? '_id' : property;
    return Users.findOne({ [property]: value });
  },
  add: (user) => {
    return Users.insertOne(user);
  }
}

module.exports = UserRepository