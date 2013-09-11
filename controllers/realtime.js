var request = require('request'),
	winston = require('winston'),
	util = require('util'),
	azure = require('azure'),
	ErrorHelper = require('../helpers/error'),
	UploadHelper = require('../helpers/upload'),
	mime = require('mime'),
	fs = require('fs');

module.exports.userUpdated = function(req, res) {

	if (typeof req.body == "undefined" || !req.body || req.body.object != "user" || typeof req.body.entry == "undefined") {
		ErrorHelper.sendError(req, res, 400);
	}

	req.body.entry.forEach(function(user, index) {

		
	});
}