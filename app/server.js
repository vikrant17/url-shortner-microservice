// server.js
// where your node app starts

// init project
var express = require('express');
var mongodb = require('mongodb');
var url = require('url');
var path = require('path');
var autoIncrement = require('mongodb-autoincrement');


var MongoClient = mongodb.MongoClient;
var app = express();

if (!process.env.DISABLE_XORIGIN) {
  app.use(function(req, res, next) {
    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin || '*';
    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
         console.log(origin);
         res.setHeader('Access-Control-Allow-Origin', origin);
         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });
}

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})


var username = process.env.USERNAME;
var password = process.env.PASSWORD;

var dbUrl = `mongodb://${username}:${password}@ds145299.mlab.com:45299/vicky`;

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


app.get("/new/*", function (request, response) {
  var endPath = request.url.substring(5, request.url.length);

  var validUrl = /^(?:(http[s]?):\/\/)(?:www.)?([\w-]+)\.([a-zA-Z]+)(\/[#\w\-!:=?/]+)?$/igm; // url validator
  if (!validUrl.test(endPath)) {
    return response.end(endPath + " not a valid url");
  }
  MongoClient.connect(dbUrl, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    console.log('Connection established to', dbUrl);
    var index;
    // do some work here with the database.
    autoIncrement.getNextSequence(db, 'urls', function (err, autoIndex) {
        index = autoIndex;
        var collection = db.collection('urls');
        collection.insert({
            _id: autoIndex,
            original_url: endPath
        });
      response.end(JSON.stringify({original_url: endPath, short_url: 'https://url-shortner-microservice.glitch.me/'+index}));
      db.close(); //close connection
    });
    
  }
});
});

app.get("/*", function (request, response) {
  var endPath = path.basename(url.parse(request.url).pathname);
  
  MongoClient.connect(dbUrl, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', dbUrl);
      // do some work here with the database.
      var urls = db.collection('urls');
      var redirectUrl = urls.find({"_id": parseInt(endPath)}).toArray((err, docs) => {
        if (docs.length === 0) 
          return response.end('No such short url')
        if (err) {
          return response.end(err)
        }
        else {
        response.redirect(docs[0].original_url);
        }
      });
    }
    db.close(); //close connection
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

