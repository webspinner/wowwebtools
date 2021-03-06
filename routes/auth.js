const BnetStrategy = require('passport-bnet').Strategy
const path = require('path')
const cookieParser = require('cookie-parser')
const expressSessionSequelize = require('express-session-sequelize')
const {User, Session} = require('../models')

const {
  BLIZZARD_API_KEY,
  BLIZZARD_SECRET,
  BLIZZARD_REGION,
  DATABASE_URL,
  PORT,
  NODE_ENV
} = process.env

const callbackHost = (PORT === 8080) ? '' : 'https://www.wowwebtools.com'
const callbackURL = `${callbackHost}/auth/bnet/callback` 


module.exports = (express, app, passport, session, sequelize) => {
  const auth = express.Router()

  const SequelizeStore = expressSessionSequelize(session.Store)
 
  app.use(cookieParser())

  const myStore = new SequelizeStore({
    db: sequelize
  })

  app.use(session({ 
    secret: BLIZZARD_SECRET,
    store: myStore,
    resave: false,
    saveUninitialized: false,
    proxy: true
  }));
 
  passport.use(new BnetStrategy({
    clientID: BLIZZARD_API_KEY,
    clientSecret: BLIZZARD_SECRET,
    callbackURL: "/auth/bnet/callback",
    region: BLIZZARD_REGION,
    scope: ['wow.profile']
  }, function(accessToken, refreshToken, profile, done) {
    const bid = profile.id
    delete profile.id
    result = {...profile, bid}
    User.findOrCreate({where: {bid}, defaults: result})
    done(null, result)
  }))

  sequelize.sync()

  passport.serializeUser(function(user, done) {
    done(null, user);
  })

  passport.deserializeUser(function(user, done) {
    done(null, user);
  })


  app.use(passport.initialize())
  app.use(passport.session())

  auth.route('/bnet').get((req, res, next) => {
    if (req.user) {
      res.sendFile(path.resolve(__dirname, '../public/retry_auth.html'))
    } else {
      next()
    }
  }, passport.authenticate('bnet'))
   
  auth.route('/bnet/callback').get(
    passport.authenticate('bnet', { failureRedirect: '/' }),
    function(req, res){
      res.redirect('/auth/bnet');
    })

  auth.route('/logout').get((req, res) => {
    req.session.destroy(() => {
      res.send(false)
    })
  })

  auth.route('/session').get((req, res) => {  
    res.send({id: req.session.id, user: req.user || false})
  })

  app.use('/auth', auth)
}
