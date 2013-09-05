var request = require('request'),
	winston = require('winston'),
	util = require('util'),
	azure = require('azure');

var sendErrorResponse = function(req, res, code) {

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
};

var buildAzureSourceUrl = function(blobName) {
	return "http://olrd.blob.core.windows.net/uploads/" + blobName;
};

var handleUpload = function(req, res, callback) {

	var hash = require('crypto').createHash('md5').update(req.uploadTarget.file.name).update(Date.now().toString()).digest('hex');
	var ext = (function(filename) { var i = filename.lastIndexOf('.'); return (i < 0) ? '' : filename.substr(i); })(req.uploadTarget.file.name);
	var rawName = hash + ext;

	winston.info("New filename: %s", rawName);

	var messageData = { 

		entity: req.uploadTarget.entity,
		originalImage: rawName,
		sourceUrl: "" 
	};

	var opts = {
		uri: 'https://api.olaround.me/v2/users/' + req.params.user + '/galleries',
		headers: {
			authorization: req.headers.authorization,
			"x-olaround-debug-mode": req.headers['x-olaround-debug-mode'] || "Header"
		}
	};

	request.get(opts, function(err, result, body) {

		body = JSON.parse(body);

		if (err || result.statusCode != 200 || typeof body.galleries == "undefined") {
		
			if (err) {
				winston.error(err);
			}

			console.log(util.inspect(result));
			console.log(util.inspect(body));
			
			res.type('application/json');
			res.send(result.statusCode, body);
			return new Error(body);
		
		} else {

			for(var i = 0; i < body.galleries.length; i++) {
				if (body.galleries[i].title == "Profile Pictures") {

					messageData.containerName = body.galleries[i].container_name;
					messageData.galleryId = body.galleries[i].id;
				}
			}

			if (typeof messageData.containerName == "undefined" || typeof messageData.galleryId == "undefined") {

				sendErrorResponse(req, res, 404);
				return new Error("We couldn't find the Profile Pictures gallery for user: %s", req.params.user);
			}

			var blobService = azure.createBlobService();
			var blobName = "upp_" + messageData.containerName + "/" + hash + "/raw" + ext;

			winston.info("New Blob Name: %s", blobName);

			blobService.createBlockBlobFromFile('uploads', blobName, req.uploadTarget.file.path, function(err) {

				if (err) {

					winston.error("Something went wrong while pushing the blob to Azure.");
					winston.error(err);

					callback(err);

				} else {

					messageData.sourceUrl = buildAzureSourceUrl(blobName);

					console.log(util.inspect(messageData), {colors: true});

					opts.uri = "https://api.olaround.me/v2/pictures/" + req.uploadTarget.entity;
					opts.form = {

						gallery_id: messageData.galleryId,
						container_name: messageData.containerName,
						original_image: messageData.originalImage,
						cdn_url: buildAzureSourceUrl(''),
						update_object: true,
						object_id: req.params.user
					};
					
					request.post(opts, function(err, updateResult, updateBody) {

						updateBody = JSON.parse(updateBody);

						if (err || updateResult.statusCode != 200 || updateBody.update_object != true) {

							winston.error("Something went wrong while trying to add the picture record for %s", req.uploadTarget.entity);

							if (err) {
								winston.error(err);
							}

							console.log(util.inspect(updateResult));
							console.log(util.inspect(updateBody));
							
							res.type('application/json');
							res.send(updateResult.statusCode, updateBody);
							return new Error(updateBody);

						} else {

							messageData.pictureId = updateBody.id;

							var sbService = azure.createServiceBusService();
							sbService.sendTopicMessage(

								'olrd-picsys',
								{
									body: JSON.stringify(messageData),
									customProperties: {
										entity: req.uploadTarget.entity
									}
								},
								function(err, result) {

									if (err) {

										winston.error("Couldn't send message for uploaded picture.");
										winston.error(err);
										callback(err);

									} else {

										winston.log("Message sent for an uploaded picture.");

										// Delete the temp image

										callback(null, messageData);
									}
								}
							);
						}

					});
				}
			});
		}
	});
};

module.exports.uploadUserPicture = function(req, res) {

	if (typeof req.files.image == "undefined") {

		winston.error("No file attached for User Picture");
		console.log(util.inspect(req.files));
		
		sendErrorResponse(req, res, 400);
		return new Error(req.files);
	}

	req.uploadTarget = {

		file: req.files.image,
		objectId: req.params.user,
		entity: "user_profile"
	};

	res.type('application/json');

	handleUpload(req, res, function(err, result) {

		if (err) {

			winston.error(err);
			res.send(err);

		} else {

			winston.info("Message successfuly sent for user: %s", req.params.user);
			console.log(util.inspect(result), {colors: true});

			res.send(result);

			/*var opts = {
				uri: 'http://api.olaround.me/v1/' + req.params.user + '/profile',
				headers: {
					authorization: req.headers.authorization,
					"x-olaround-debug-mode": req.headers['x-olaround-debug-mode'] || "Header"
				}
			};

			request.get(opts, function(err, result, body) {

				if (err) {
				
					winston.error(err);
					res.send(500, err);
				
				} else {

					winston.info(body);
					res.send(body);
				}
			});*/
		}
	});
};