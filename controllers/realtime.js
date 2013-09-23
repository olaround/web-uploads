var request = require('request'),
	winston = require('winston'),
	util = require('util'),
	azure = require('azure'),
	ErrorHelper = require('../helpers/error'),
	UploadHelper = require('../helpers/upload'),
	MimeHelper = require('../helpers/mime'),
	fs = require('fs');

module.exports.userUpdated = function(req, res, cb) {

	if (typeof req.body == "undefined" || !req.body || req.body.object != "user" || typeof req.body.entry == "undefined") {

		ErrorHelper.sendError(req, res, 400);
		return;
	}

	req.headers['x-olaround-bypass-timer'] = Math.floor(Date.now() / 1000);

	console.log(util.inspect(req.body, {colors: true, depth: 5}));

	var processedEntries = 0, entryLength = 0;
	
	var handleCallback = function() {
		if (typeof cb != 'undefined' && typeof cb == 'function') {
			if (++processedEntries >= entryLength) {
				cb(true);
			}
		}
	};

	req.body.entry.forEach(function(fbUser, index) {
		req.models.User.find({fb_user_id: fbUser.uid}, function(err, user) {

			if (err) {

				winston.error("Something went wrong while trying to read user from the database...");
				winston.error(err);

			} else if (user.length < 1) {

				winston.error("We couldn't find the user being requested: %d", fbUser.uid);

			} else {

				fbUser.changed_fields.forEach(function(field) {

					switch (field) {

						case "picture" :

							entryLength++;
							var fbImageUrl = 'https://graph.facebook.com/' + fbUser.uid + '/picture?width=512';
					
							request.head(fbImageUrl, function(err, result) {
		
								if (err || result.statusCode != 200) {
						
									if (err) {
										winston.error(err);
									}
		
									console.log(util.inspect(result));

									handleCallback();
									
									// Can't respond with JSON since this isn't a regular API call
									return new Error(result);
		
								} else {
									
									var tempName = 'fb_user_' + fbUser.uid + '_picture' + MimeHelper.getExtFromContentType(result.headers['content-type']);
									var tempPath = "temp/" + tempName;
									var image = request.get(fbImageUrl);

									image.on('end', function() {
		
										MimeHelper.getMimeTypeFromFile(tempPath, function(err, type) {

											if (err) {

												winston.error("Couldn't infer the filetype from the input stream for user: %s", fbUser.uid);
												winston.error(err);
												console.log(util.inspect(err, {colors: true, depth: 5}));

												handleCallback();

											} else {

												var opts = {
				
													config: req.config,
													headers: req.headers,
													uploadTarget: {
					
														file: {
															name: tempName,
															isFile: true,
															path: tempPath
														},
														objectId: user[0].id,
														entity: req.config.entities.userPhotos,
														galleriesUrl: req.config.apiUrl + 'users/' + user[0].id + '/galleries',
														targetGallery: 'Profile Pictures'
													}
												};
					
												UploadHelper.upload(opts, function(err, result) {
					
													if (err) {
					
														// Can't respond with JSON since this isn't a regular API call
														winston.error(err);

														handleCallback();
					
													} else {
					
														winston.info("Message successfuly sent for user: %s", user[0].id);
														console.log(util.inspect(result, {colors: true}));

														handleCallback();
													}
												});
											}
										});

									});

									image.pipe(fs.createWriteStream(tempPath));
								}
							});

							break;

						case "friends" :

							winston.warning("We don't support Realtime Friends Updates yet...");
							break;
					}
				});

				winston.info("Load user ID: %d, name: %s %s, Facebook ID: %d", user[0].id, user[0].first_name, user[0].last_name, user[0].fb_user_id);
			}
		});
	});

	res.type("application/json");
	res.send({result: true, status: "pending"});
}