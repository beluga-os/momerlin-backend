const { ExtractJwt, Strategy } = require('passport-jwt');
const Users = require('../models/user.model');
const { to } = require('../services/global.services');

module.exports = function (passport) {
  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
  opts.secretOrKey = CONFIG.jwt_encryption;
  passport.use(
    new Strategy(opts, async function (jwt_payload, done) {
      let err, user;
      [err, user] = await to(Users.findById(jwt_payload.user_id));
      if (err) return done(err, false);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    }),
  );

  return passport;
};
