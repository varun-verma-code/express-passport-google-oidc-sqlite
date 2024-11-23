import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oidc';

import db from '../db.js';

var router = express.Router();

router.get('/login', function (req, res, next) {
  res.render('login');
});

router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar.events',
    ], // Permissions to request
  })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/login',
  })
);

router.post('/logout', (req, res, next) => {
  req.logout(function (err) {
    // Passports sets the logOut function. It removes the user session and logs them out
    if (err) {
      console.error(err);
      return next(err);
    }
    res.redirect('/');
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env['GOOGLE_CLIENT_ID'],
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
      callbackURL: '/auth/google/callback',
      scope: ['profile'],
    },
    /* The Strategy has the following options initialized as default
    options.issuer = options.issuer || 'https://accounts.google.com';
    options.authorizationURL = options.authorizationURL || 'https://accounts.google.com/o/oauth2/v2/auth';
    options.tokenURL = options.tokenURL || 'https://www.googleapis.com/oauth2/v4/token';

    Verify function can have these parameters
      issuer: string,
      profile: Profile,
      context: object,
      idToken: string | object,
      accessToken: string | object,
      refreshToken: string,
      params: any,
      done: VerifyCallback,
    */
    function verify(
      issuer,
      profile,
      context,
      idToken,
      accessToken,
      refreshToken,
      params,
      done
    ) {
      console.log(`issuer:${issuer}`);
      console.log(`profile:${profile}`);
      console.log(`context:${context}`);
      console.log(`idToken:${idToken}`);
      console.log(`accessToken:${accessToken}`);
      console.log(`refreshToken:${refreshToken}`);
      console.log(`params:${params}`);
      db.get(
        'SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?',
        [issuer, profile.id],
        function (err, row) {
          if (err) {
            return done(err);
          }
          if (!row) {
            db.run(
              'INSERT INTO users (name) VALUES (?)',
              [profile.displayName],
              function (err) {
                if (err) {
                  return done(err);
                }

                var id = this.lastID;
                db.run(
                  'INSERT INTO federated_credentials (user_id, provider, subject) VALUES (?, ?, ?)',
                  [id, issuer, profile.id],
                  function (err) {
                    if (err) {
                      return done(err);
                    }
                    var user = {
                      id: id,
                      name: profile.displayName,
                    };
                    return done(null, user);
                  }
                );
              }
            );
          } else {
            db.get(
              'SELECT * FROM users WHERE id = ?',
              [row.user_id],
              function (err, row) {
                if (err) {
                  return done(err);
                }
                if (!row) {
                  return done(null, false);
                }
                return done(null, row);
              }
            );
          }
        }
      );
    }
  )
);

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

export default router;
