var fs = require('fs');
var path = require('path');
var basename = path.basename(__filename);
var models = {};
const mongoose = require('mongoose');

if (CONFIG.db_uri != '') {
  mongoose.Promise = global.Promise; //set mongo up to use promises
  const mongo_location = CONFIG.db_uri; //'mongodb://'+CONFIG.db_user+':'+CONFIG.db_password+'@'+CONFIG.db_host+':'+CONFIG.db_port+'/'+CONFIG.db_name;

  mongoose
    .connect(mongo_location, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((err) => {
      console.log('*** Can Not Connect to Mongo Server:', mongo_location);
    });

  let db = mongoose.connection;
  module.exports = db;
  db.once('open', () => {
    console.log('Connected to mongo at ' + mongo_location);
  });
  db.on('error', (error) => {
    console.log('error', error);
  });
  // End of Mongoose Setup
} else {
  console.log('No Mongo Credentials Given');
}

module.exports = models;
