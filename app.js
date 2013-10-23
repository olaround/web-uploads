var 
	express = require("express"),
	http = require("http"),
	path = require("path"),
	fs = require('fs'),
	util = require('util'),
	request = require('request'),
	winston = require("winston"),
	orm = require('orm'),
	expressWinston = require("express-winston"),
	controllers = require("./controllers"),
	models = require('./models/model'),
	AuthHelper = require('./helpers/auth'),
	ErrorHelper = require('./helpers/error'),
	UploadHelper = require('./helpers/upload'),
	ServiceBusHelper = require('./helpers/serviceBus'),
	config = require('./config.json'),
	azure = require('azure'),
	counter = 0;

// Create the app
var app = express(), 
	uploadMiddleware = [];

// Define the GLOBAL configuration
app.configure(function() {

	winston.setLevels(winston.config.syslog.levels);
	app.set('port', process.env.PORT || 3000);
	app.set('tempDir', "./temp");
	app.use(express.logger('dev'));
	app.use(express.compress());
	app.use(express.methodOverride());

	app.use(function(req, res, next) {

		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,HEAD,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Olaround-Debug-Mode');
		res.header('Access-Control-Expose-Headers', 'X-Olaround-Debug-Mode, X-Olaround-Request-Start-Timestamp, X-Olaround-Request-End-Timestamp, X-Olaround-Request-Time, X-Olaround-Request-Method, X-Olaround-Request-Result, X-Olaround-Request-Endpoint');

		// intercept OPTIONS method
		if ('OPTIONS' == req.method) {
			res.send(200);
		}
		else {
			next();
		}
	});

	app.use(express.json());
	app.use(express.urlencoded());

	// Load the config
	app.use(function(req, res, next) {
		req.config = config;
		next();
		winston.warning("Current Count: %d", ++counter);
	});

	orm.settings.set('connection.reconnect', true);
	orm.settings.set('connection.pool', true);

	app.use(orm.express(process.env.MYSQL_CONN_STR, models));

	// Overload the res.send() function to handle custom logic
	app.use(function(req, res, next) {

		res._baseSend = res.send;
		var newSend = function(status, body) {

			res.set({
				'X-Olaround-Debug-Mode': 'Header',
				'X-Olaround-Served-With': 'node.js/uploads'
			});

			if (typeof body == "undefined") {
				res._baseSend(status);
			} else {
				res._baseSend(status, body);
			}
		}

		res.send = newSend;

		next();
	});


	uploadMiddleware = [
		express.multipart({keepExtensions: true, uploadDir: app.get('tempDir')}),

		function(req, res, next) {
			if (typeof req.files.image == "undefined") {

				winston.error("No file attached for Picture Upload");
				console.log(util.inspect(req.files, {colors: true, depth: 5}));
				
				ErrorHelper.sendError(req, res, 400);
				return new Error(req.files);

			} else {
				next();
			}
		}
	];

	// express-winston logger makes sense BEFORE the router.
	app.use(expressWinston.logger({
		transports: [
			new winston.transports.Console({
				json: true,
				colorize: true
			})
		]
	}));

	app.use(app.router);

	// express-winston errorLogger makes sense AFTER the router.
	app.use(expressWinston.errorLogger({
		transports: [
			new winston.transports.Console({
				json: true,
				colorize: true
			})
		]
	}));
});

// Define the DEVELOPMENT configuration
app.configure('development', function() {

	// Setup Winston to use Console...
	winston.remove(winston.transports.Console);
	winston.add(winston.transports.Console, { colorize: true, timestamp: true, level: 'crit' });

	winston.info('Using console logging...');

	app.use(express.errorHandler());
});

// Define the PRODUCTION configuration
app.configure('production', function() {

	fs.mkdir('./logs', function(err) {

		if (err && err.code != 'EEXIST') {

			winston.error("We couldn't create the logs directory: %s", './logs');
			console.log(util.inspect(err, {colors: true}));

		} else {

			// Setup Winston to use File Logging
			winston.add(winston.transports.File, { filename: "./logs/node-execution-log.txt", timestamp: true, level: 'crit' });
			winston.remove(winston.transports.Console);
			winston.add(winston.transports.Console, { colorize: true, timestamp: true, level: 'crit' });

			winston.info('Using console logging...');
		}
	});

	app.use(express.errorHandler());
});

// Setup application routing

/*
 * Match: GET /
*/
app.all('/', function(req, res) {
	res.redirect('http://olaround.me');
});

/*
 * Match: POST /users/:user/picture
*/
app.post('/v2/users/:user/picture', AuthHelper.getAuthHelper('user'), uploadMiddleware, controllers.Uploads.uploadUserPicture);

/*
 * Match: POST /brands/:brand/picture
*/
app.post('/v2/brands/:brand/picture', AuthHelper.getAuthHelper('brand'), uploadMiddleware, controllers.Uploads.uploadBrandPicture);

/*
 * Match: POST /brands/:brand/background_picture
*/
app.post('/v2/brands/:brand/background_picture', AuthHelper.getAuthHelper('brand'), uploadMiddleware, controllers.Uploads.uploadBrandBackground);

/*
 * Match: POST /rt/facebook/user
*/
app.post('/rt/facebook/user', controllers.Realtime.userUpdated);

// /*
//  * Match: POST /rt/facebook/user
// */
// app.post('/rt/facebook_test/user', controllers.Realtime.userUpdated);

/*
 * Match: GET /rt/facebook/user
*/
app.get('/rt/facebook/user', function(req, res) {

	//console.log(util.inspect(req.query));

	if (req.query['hub.mode'] == "subscribe" && req.query['hub.verify_token'] == "thisisarandomtoken") {
		res.send(req.query['hub.challenge']);
	} else {
		res.send('Invalid Request');
	}
});

app.post('/rt/test', function(req, res) {

	res.send({
		result: true,
		date: (new Date()).toString()
	});
});


// Start the Server
http.createServer(app).listen(app.get('port'), function(){
	winston.info("Express server listening on port %d", app.get('port'));
});


/*
 * Cleanup the Temporary Directory
 * ===============================
 *
 * Loop through all the files in the ./temp directory and delete the ones older than 30 minutes.
 *
*/

UploadHelper.cleanup(app.get('tempDir'), 1000 * 60 * 30);

/*
 * Reset and Requeue Dead-lettered Messages
 * ========================================
 *
 * Check all Dead-lettered messages in Subscription Topics and Processed Queue and requeue them for processing again.
 *
*/

setTimeout(function() { ServiceBusHelper.handleDeadLetterQueue(config.processedQueue, 1000 * 5, 1000 * 60 * 10) }, 10000);
setTimeout(function() { ServiceBusHelper.handleDeadLetterTopic(config.topicName, "ignored", 1000 * 5, 1000 * 60 * 10) }, 10000);


/*
 * Pull all the images for reigstered users
 * ========================================
 *
 * Update all user profile pictures from Facebook once before finally migrating from Rackspace.
 * 
 * Note: This code was removed from the live version. The code is still available at tag 'olrd-pending-users'.
 *
*/