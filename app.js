var 
	express = require("express"),
	http = require("http"),
	path = require("path"),
	fs = require('fs'),
	util = require('util'),
	request = require('request'),
	winston = require("winston"),
	expressWinston = require("express-winston"),
	routes = require("./routes"),
	AuthHelper = require('./helpers/auth'),
	ErrorHelper = require('./helpers/error'),
	config = require('./config.json'),
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

	// Load the config
	app.use(function(req, res, next) {
		req.config = config;
		next();
		winston.warning("Current Count: %d", ++counter);
	});


	uploadMiddleware = [
		express.multipart({keepExtensions: true, uploadDir: app.get('tempDir')}),

		function(req, res, next) {
			if (typeof req.files.image == "undefined") {

				winston.error("No file attached for Picture Upload");
				console.log(util.inspect(req.files));
				
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
app.post('/v2/users/:user/picture', AuthHelper.getAuthHelper('user'), uploadMiddleware, routes.uploadUserPicture);

/*
 * Match: POST /brands/:brand/picture
*/
app.post('/v2/brands/:brand/picture', AuthHelper.getAuthHelper('brand'), uploadMiddleware, routes.uploadBrandPicture);

/*
 * Match: POST /brands/:brand/background_picture
*/
app.post('/v2/brands/:brand/background_picture', AuthHelper.getAuthHelper('brand'), uploadMiddleware, routes.uploadBrandBackground);

/*
 * Match: POST /rt/facebook/user
*/
app.post('/rt/facebook/user', function(req, res) {

	console.log(util.inspect(req));
});

/*
 * Match: GET /rt/facebook/user
*/
app.get('/rt/facebook/user', function(req, res) {

	console.log(util.inspect(req.query));

	if (req.query['hub.mode'] == "subscribe" && req.query['hub.verify_token'] == "thisisarandomtoken") {
		res.send(req.query['hub.challenge']);
	} else {
		res.send('Invalid Request');
	}
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

// Create temp directory
fs.mkdir(app.get('tempDir'), function(err) {

	if (err && err.code != 'EEXIST') {

		winston.error("We couldn't create the temporary directory: %s", app.get('tempDir'));
		console.log(util.inspect(err, {colors: true}));

	} else {

		winston.info("Created temporary directory: %s", app.get('tempDir'));

		setInterval(function() {
			fs.readdir(app.get('tempDir'), function(err, files) {

				if (err) {
					winston.error("Couldn't read files from the temporary directory: %s", app.get('tempDir'));
				} else {

					/*winston.info("Following files were found in the temporary directory: %s", app.get('tempDir'));
					console.log(util.inspect(files));*/

					files.forEach(function(file) {
						fs.stat(app.get('tempDir') + '/' + file, function(err, stats) {

							if (err) { 
								winston.error("Couldn't read stats for file: %s", app.get('tempDir') + '/' + file); 
								return;
							}

							if (stats.mtime < (new Date(Date.now() - 1000 * 60 * 5)).getTime()) {
								fs.unlink(app.get('tempDir') + '/' + file, function(err) {

									if (err) { winston.error("Couldn't delete file: %s", app.get('tempDir') + '/' + file); }
									else {
										winston.info("Deleted file: %s", app.get('tempDir') + '/' + file);
									}
								});
							}
						});
					});
				}
			});
		}, 10000);
	}
});