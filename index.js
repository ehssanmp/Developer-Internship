const express = require('express')
const pg = require('pg');
const TokenBuckets=require("./TokenBucket");
const app = express()

// configs come from standard PostgreSQL env vars
// https://www.postgresql.org/docs/9.6/static/libpq-envars.html
const pool = new pg.Pool()
function MiddleWare(req,res,next){
  const TodayTime=new Date();
  //if the user already exists, load their ip and timestamp make a new bucket
  //if the user exceed the limit send status 429 deny the request
  //other wise let the user procceed
  if(TokenBuckets.Bucket.has(req.ip)){
    const tokenBuckets=new TokenBuckets(TokenBuckets.TimeStamp.get(req.ip)+30000,TodayTime,req.ip,TokenBuckets.Bucket.get(req.ip));
    if(tokenBuckets.TakeToken()===false){
      res.status(429).send("Client rate limit exceeded");
    }
    else{
      TokenBuckets.Bucket.set(req.ip,tokenBuckets.getToken())
      next();
    }
  }
  //if the user does not exist, create a bucket for them 
  else{
    const tokenBuckets=new TokenBuckets(TodayTime.getTime()+30000,TodayTime.getTime(),req.ip,5);
    TokenBuckets.Bucket.set(req.ip,5);
    TokenBuckets.TimeStamp.set(req.ip,TodayTime.getTime());
    tokenBuckets.TakeToken()
    TokenBuckets.Bucket.set(req.ip,tokenBuckets.getToken());
    next();
  }
}

const queryHandler = (req, res, next) => {
  pool.query(req.sqlQuery).then((r) => {
    return res.json(r.rows || [])
  }).catch(next)
}

app.get('/',MiddleWare, (req, res) => {
  res.send('Welcome to EQ Works 😎')
})

app.get('/events/hourly',MiddleWare, (req, res, next) => {
  req.sqlQuery = `
    SELECT date, hour, events
    FROM public.hourly_events
    ORDER BY date, hour
    LIMIT 168;
  `
  return next()
}, queryHandler)

app.get('/events/daily',MiddleWare, (req, res, next) => {
  req.sqlQuery = `
    SELECT date, SUM(events) AS events
    FROM public.hourly_events
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

app.get('/stats/hourly',MiddleWare, (req, res, next) => {
  req.sqlQuery = `
    SELECT date, hour, impressions, clicks, revenue
    FROM public.hourly_stats
    ORDER BY date, hour
    LIMIT 168;
  `
  return next()
}, queryHandler)

app.get('/stats/daily',MiddleWare, (req, res, next) => {
  req.sqlQuery = `
    SELECT date,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(revenue) AS revenue
    FROM public.hourly_stats
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

app.get('/poi',MiddleWare, (req, res, next) => {
  req.sqlQuery = `
    SELECT *
    FROM public.poi;
  `
  return next()
}, queryHandler)

app.listen(process.env.PORT || 5555, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log(`Running on ${process.env.PORT || 5555}`)
  }
})

// last resorts
process.on('uncaughtException', (err) => {
  console.log(`Caught exception: ${err}`)
  process.exit(1)
})
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit(1)
})
