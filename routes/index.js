var request = require('request'),
	winston = require('winston');

module.exports.uploadUserPicture = function(req, res) {

	request.get('http://api.olaround.me/v1/' + req.params.user + '/profile', function(err, result, body) {

		if (err) {
		
			winston.error(err);
			res.send(500, err);
		
		} else {

			winston.info(body);
			res.send(body);
		}
	});
};