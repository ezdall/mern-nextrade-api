const _ = require('lodash');
const mongoose = require('mongoose');

// checking if the obj is instance of Mongoose Obj
function isMongoObj(obj) {
  return _.get(obj, 'constructor.base') instanceof mongoose.Mongoose;
}

module.exports = { isMongoObj };
