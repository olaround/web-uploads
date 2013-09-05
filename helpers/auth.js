var request = require('request'),
	winston = require('winston'),
	config = require('../config.json'),
	ErrorHelper = require('./error');

module.exports = (function() {

	var Auth = function() {};

	var opts = {
		uri: config.apiUrl + 'accounts/verify_access',
		headers: {
			"x-olaround-debug-mode": "Header"
		}
	};

	var sendAuthRequest =  function(req, res, next, opts) {

		request(opts, function(err, result, body) {
			if (err || result.statusCode != 200) {

				if (err) 
					winston.error(err);
				
				res.type('application/json');
				res.send(result.statusCode, body);
				return new Error(body);

				return;
			
			} else {
				next();
			}
		});
	};

	var	helpers = {

		user: function(req, res, next) {

			if (req.headers.authorization) {

				opts.headers = {
					authorization: req.headers.authorization,
					"x-olaround-debug-mode": req.headers['x-olaround-debug-mode'] || "Header"
				};

				opts.qs = {
					roles: 'user',
					target_user_id: req.params.user
				};

				sendAuthRequest(req, res, next, opts);

			} else {

				ErrorHelper.sendError(req, res, 401);
				return;
			}
		},

		brand: function(req, res, next) {

			if (req.headers.authorization) {

				opts.headers = {
					authorization: req.headers.authorization,
					"x-olaround-debug-mode": req.headers['x-olaround-debug-mode'] || "Header"
				};

				opts.qs = {
					roles: 'admin,brand_manager',
					object_id: req.params.brand
				};

				sendAuthRequest(req, res, next, opts);

			} else {

				ErrorHelper.sendError(req, res, 401);
				return;
			}
		}
	};

	Auth.getAuthHelper = function(level) {
		return helpers.hasOwnProperty(level) > -1 ? helpers[level] : null;
	}

	return Auth;
}());