const pe = require('parse-error');

module.exports.to = function (promise) {
  return promise
    .then((data) => {
      return [null, data];
    })
    .catch((err) => [err]);
};

module.exports.TE = function (err_message, log) {
  // TE stands for Throw Error
  if (log === true) {
    console.error({ 'is this ': err_message });
  }

  throw new Error({ enna: err_message });
};

module.exports.ReE = function (res, err, code) {
  // Error Web Response
  if (typeof err == 'object' && typeof err.message != 'undefined') {
    err = err.message;
  }

  if (typeof code !== 'undefined') res.statusCode = code;

  return res.json({ success: false, error: err });
};

module.exports.ReS = function (res, data, code) {
  // Success Web Response
  let send_data = { success: true };

  if (typeof data == 'object') {
    send_data = Object.assign(data, send_data); //merge the objects
  }

  if (typeof code !== 'undefined') res.statusCode = code;

  return res.json(send_data);
};

module.exports.random = function (length) {
  var result = '';
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
