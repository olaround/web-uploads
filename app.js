var 
	express = require("express"),
	http = require("http"),
	path = require("path"),
	orm = require("orm"),
	request = require('request'),
	winston = require("winston"),
	expressWinston = require("express-winston"),
	model = require('./models/model'),
	routes = require("./routes"),
	AuthHelper = require('./helpers/auth');

// Create the app
var app = express(), 
	uploadMiddleware = authMiddleware = [];

// Define the GLOBAL configuration
app.configure(function() {

	winston.setLevels(winston.config.syslog.levels);
	app.set('port', process.env.PORT || 3000);
	app.set('tempDir', "./temp");
	app.use(express.logger('dev'));
	app.use(express.compress());
	app.use(express.methodOverride());

	app.use(orm.express(process.env.MYSQL_CONN_STR, model));

	uploadMiddleware = [
		express.multipart({keepExtensions: true, uploadDir: app.get('tempDir')})
	];

	authMiddleware = [
		
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

	// Setup Winston to use File Logging
	winston.add(winston.transports.File, { filename: "./logs/node-execution-log.txt", colorize: true, timestamp: true, level: 'crit' });
	winston.remove(winston.transports.Console);
});

// Setup application routing

/*
 * Match: GET /
*/
app.all('/', function(req, res) {
	res.redirect('http://olaround.me');
});


app.get('/users/:userId', function(req, res) {

	var query = parseInt(req.params.userId) == NaN ? {username: req.params.userId} : {id: req.params.userId};
	winston.info("User id a is a %s with value: %d", parseInt(req.params.userId) == NaN ? "string" : "number", query);

	req.models.user.get(req.params.userId, function(err, user) {
		if (err) { winston.error(err); }
		else {
			console.log(user);
		}
	});
});


/*
 * Match: POST /users/:user/picture
*/
app.post('/users/:user/picture', AuthHelper.getAuthHelper('user'), uploadMiddleware, routes.uploadUserPicture);


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
var fs = require('fs')
	util = require('util');

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