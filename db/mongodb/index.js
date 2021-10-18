const { MongoClient } = require('mongodb');

const mongo_conn_str  = `mongodb+srv://${process.env.mongodb_user}:${process.env.mongodb_pass}@cluster0.xu9wm.mongodb.net/test?retryWrites=true&w=majority`;
const mongo_opts      = {
  useUnifiedTopology: true // Removes "DeprecationWarning: current Server Discovery and Monitoring..."
};

class Db {
  constructor() {
    this.client = new MongoClient(mongo_conn_str, mongo_opts);
  }

  async init() {
    await this.client.connect();
    console.info('Connected to MongoDB Atlas DB!!!');
    this.instance = this.client.db('smarty');
  }
}

module.exports = new Db();
