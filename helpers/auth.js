var request = require('request'),
	winston = require('winston');

module.exports = (function() {

	var Auth = function() {};

	var	helpers = {

		user: function(req, res, next) {

			if (req.headers.authorization) {

				var opts = {
					uri: 'https://api.olaround.me/v2/accounts/verify_access',
					headers: {
						authorization: req.headers.authorization,
						"x-olaround-debug-mode": req.headers['x-olaround-debug-mode'] || "Header"
					},
					qs: {
						roles: 'user',
						target_user_id: req.params.user
					}
				};

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
			} else {

				res.type('application/json');
				res.send(401, {error: 'invalid_grant', error_description: 'Invalid authorization credentials supplied.'});
				return;
			}
		}
	};

	Auth.getAuthHelper = function(level) {
		return helpers.hasOwnProperty(level) > -1 ? helpers[level] : null;
	}

	return Auth;
}());