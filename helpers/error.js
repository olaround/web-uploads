module.exports = (function() {

	var helper = {};

	helper.sendError = function(req, res, code) {

		res.type('application/json');
	
		switch (code) {

			case 400:
				
				res.send(400, {
					error: "invalid_request", 
					error_description: "The received request was invalid. Either you are missing a required parameter or passed invalid data.", 
					error_code: 10
				});
				break;

			case 404:

				res.send(404, {
					error: "not_found", 
					error_description: "We couldn't find the content you requested. Make sure the identifier is correct.", 
					error_code: 11
				});
				break;

			default:
				res.send(500, {
					error: "unknown_exception", 
					error_description: "TAn unknown error occured. Please contact support if the problem persists.", 
					error_code: 0
				});
				break;
		}

		return;
	}

	return helper;
})();