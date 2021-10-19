const db = require('../db/mongodb');

const Users = db.instance.collection('users');

const UserRepository = {
  get: (filter = {}) => Users.find(filter),
  getBy: (property, value) => {
    property = property === 'id' ? '_id' : property;
    return Users.find({ [property]: value });
  },
  getOneBy: (property, value, options = {}) => {
    property = property === 'id' ? '_id' : property;
    return Users.findOne({ [property]: value }, options);
  },
  add: (user) => {
    return Users.insertOne(user); // insert can create duplicates
    // return Users.updateOne(user, { $set: user }, { upsert: true });
  }
}

module.exports = UserRepository