var request = require('request'),
	winston = require('winston'),
	util = require('util'),
	azure = require('azure'),
	fs = require('fs');

var buildRequestHeaders = function(req, res) {

	return {
		authorization: req.headers.authorization,
		"x-olaround-debug-mode": req.headers['x-olaround-debug-mode'] || "Header"
	};
}

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
		uri: req.uploadTarget.galleriesUrl,
		headers: buildRequestHeaders(req, res)
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
				if (body.galleries[i].title == req.uploadTarget.targetGallery) {

					messageData.containerName = body.galleries[i].container_name;
					messageData.galleryId = body.galleries[i].id;
				}
			}

			if (typeof messageData.containerName == "undefined" || typeof messageData.galleryId == "undefined") {

				sendErrorResponse(req, res, 404);
				return new Error("We couldn't find the Profile Pictures gallery for %s: %s", req.uploadTarget.entity, req.uploadTarget.objectId);
			}

			var blobService = azure.createBlobService();
			var blobName = req.config.entityPrefix[req.uploadTarget.entity] + '_' + messageData.containerName + "/" + hash + "/raw" + ext;

			winston.info("New Blob Name: %s", blobName);

			blobService.createBlockBlobFromFile('uploads', blobName, req.uploadTarget.file.path, function(err) {

				if (err) {

					winston.error("Something went wrong while pushing the blob to Azure.");
					winston.error(err);

					callback(err);

				} else {

					messageData.sourceUrl = req.config.cdnUrl + blobName;

					console.log(util.inspect(messageData), {colors: true});

					opts.uri = req.config.apiUrl + "pictures/" + req.uploadTarget.entity;
					opts.form = {

						gallery_id: messageData.galleryId,
						container_name: messageData.containerName,
						original_image: messageData.originalImage,
						cdn_url: req.config.cdnUrl,
						update_object: true,
						object_id: req.uploadTarget.objectId
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

								req.config.topicName,
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
										fs.unlink(req.files.image.path, function(err) {

											if (err) { winston.error("Couldn't delete file: %s", req.files.image.path); }
											else {
												winston.info("Uploaded and deleted local file: %s", req.files.image.path);
											}
										});

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

	req.uploadTarget = {

		file: req.files.image,
		objectId: req.params.user,
		entity: req.config.entities.userPhotos,
		galleriesUrl: req.config.apiUrl + 'users/' + req.params.user + '/galleries',
		targetGallery: 'Profile Pictures'
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
		}
	});
};

module.exports.uploadBrandPicture = function(req, res) {

	req.uploadTarget = {

		file: req.files.image,
		objectId: req.params.brand,
		entity: req.config.entities.brandProfiles,
		galleriesUrl: req.config.apiUrl + 'brands/' + req.params.brand + '/galleries',
		targetGallery: 'Profile Pictures'
	};

	res.type('application/json');

	handleUpload(req, res, function(err, result) {

		if (err) {

			winston.error(err);
			res.send(err);

		} else {

			winston.info("Message successfuly sent for brand: %s", req.params.brand);
			console.log(util.inspect(result), {colors: true});

			res.send(result);
		}
	});	
}

module.exports.uploadBrandBackground = function(req, res) {

	req.uploadTarget = {

		file: req.files.image,
		objectId: req.params.brand,
		entity: req.config.entities.brandBackgrounds,
		galleriesUrl: req.config.apiUrl + 'brands/' + req.params.brand + '/galleries',
		targetGallery: 'Backgrounds'
	};

	res.type('application/json');

	handleUpload(req, res, function(err, result) {

		if (err) {

			winston.error(err);
			res.send(err);

		} else {

			winston.info("Message successfuly sent for brand: %s", req.params.brand);
			console.log(util.inspect(result), {colors: true});

			res.send(result);
		}
	});	
}