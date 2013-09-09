var request = require('request'),
	winston = require('winston'),
	util = require('util'),
	azure = require('azure'),
	fs = require('fs');

module.exports.userUpdated = function(req, res) {

	console.log(util.inspect(req.body, {colors: true, depth: 5}));
}