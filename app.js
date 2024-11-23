import './env.js';
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import passport from 'passport';
import session from 'express-session';
//import sqlite3 from 'sqlite3';
//import sqliteStoreFactory from 'express-session-sqlite';
import connectSqlite3 from 'connect-sqlite3';

import indexRouter from './routes/index.js';
import authRouter from './routes/auth.js';
import pluralize from 'pluralize';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

var app = express();
const SQLiteStore = connectSqlite3(session);
app.locals.pluralize = pluralize;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET, // This is a randomly generated long string that is used for encryption
    resave: false, // Should we re-save the session if everything is still the same and nothing changed
    saveUninitialized: false, // Do you want to save an empty vaue in the session?
    store: new SQLiteStore({ db: 'sessions.db', dir: './var/db' }),
    // store: new SqliteStore({
    //   driver: sqlite3.Database,
    //   path: './var/db/sessions.db', // Path to your database file
    //   ttl: 86400, // Session TTL in seconds (optional)
    // }),
  })
);
app.use(passport.authenticate('session'));
app.use(passport.initialize()); // A function inside passport library that setups up some basics
app.use(passport.session()); // To persist the session across pages

app.use('/', indexRouter);
app.use('/', authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;
