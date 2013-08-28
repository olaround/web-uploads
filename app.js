var express = require("express"),
	routes = require("./routes"),
	http = require("http"),
	path = require("path");

var app = express();

app.configure(function() {

	app.set('port', process.env.PORT || 3000);
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(app.router);
});