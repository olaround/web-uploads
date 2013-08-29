var express = require("express"),
	routes = require("./routes"),
	http = require("http"),
	path = require("path"),
	winston = require("winston"),
	expressWinston = require("express-winston");

// Create the app
var app = express();

// Define the GLOBAL configuration
app.configure(function() {

	winston.setLevels(winston.config.syslog.levels);
	app.set('port', process.env.PORT || 3000);
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());

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

app.configure('development', function() {

	// Setup Winston to use Console...
	winston.remove(winston.transports.Console);
	winston.add(winston.transports.Console, { colorize: true, timestamp: true, level: 'crit' });

	winston.info('Using console logging...');

	app.use(express.errorHandler());
});

app.configure('production', function() {

	// Setup Winston to use File Logging
	winston.add(winston.transports.File, { filename: "./logs/node-execution-log.txt", colorize: true, timestamp: true, level: 'crit' });
	winston.remove(winston.transports.Console);
});

http.createServer(app).listen(app.get('port'), function(){
	winston.info("Express server listening on port %d", app.get('port'));
});