var request = require('request'),
	winston = require('winston'),
	util = require('util'),
	azure = require('azure'),
	fs = require('fs');

var buildRequestHeaders = function(headers) {

	return {
		authorization: headers.authorization,
		"x-olaround-debug-mode": headers['x-olaround-debug-mode'] || "Header"
	};
}

module.exports = (function() {

	var handler = {};

	var handleUpload = function(opts, callback) {

		var hash = require('crypto').createHash('md5').update(opts.uploadTarget.file.name).update(Date.now().toString()).digest('hex');
		var ext = (function(filename) { var i = filename.lastIndexOf('.'); return (i < 0) ? '' : filename.substr(i); })(opts.uploadTarget.file.name);
		var rawName = hash + ext;

		winston.info("New filename: %s", rawName);

		var messageData = { 

			entity: opts.uploadTarget.entity,
			originalImage: rawName,
			sourceUrl: "" 
		};

		var requestOpts = {
			uri: opts.uploadTarget.galleriesUrl,
			headers: buildRequestHeaders(opts.headers)
		};

		request.get(requestOpts, function(err, result, body) {

			body = JSON.parse(body);

			if (err || result.statusCode != 200 || typeof body.galleries == "undefined") {
			
				if (err) {
					winston.error(err);
				}

				console.log(util.inspect(result));
				console.log(util.inspect(body));

				callback({statusCode: result.statusCode, endpoint: opts.uploadTarget.galleriesUrl, body: body});
				return new Error(body);
			
			} else {

				for(var i = 0; i < body.galleries.length; i++) {
					if (body.galleries[i].title == opts.uploadTarget.targetGallery) {

						messageData.containerName = body.galleries[i].container_name;
						messageData.galleryId = body.galleries[i].id;
					}
				}

				if (typeof messageData.containerName == "undefined" || typeof messageData.galleryId == "undefined") {

					callback({statusCode: 404, endpoint: opts.uploadTarget.galleriesUrl});
					return new Error("We couldn't find the Profile Pictures gallery for %s: %s", opts.uploadTarget.entity, opts.uploadTarget.objectId);
				}

				var blobService = azure.createBlobService();
				var blobName = opts.config.entityPrefix[opts.uploadTarget.entity] + '_' + messageData.containerName + "/" + hash + "/raw" + ext;

				winston.info("New Blob Name: %s", blobName);

				console.log(util.inspect(opts.uploadTarget, {colors: true, depth: 5}));

				blobService.createBlockBlobFromFile('uploads', blobName, opts.uploadTarget.file.path, function(err) {

					if (err) {

						winston.error("Something went wrong while pushing the blob to Azure.");
						winston.error(err);

						callback(err);

					} else {

						messageData.sourceUrl = opts.config.cdnUrl + blobName;

						console.log(util.inspect(messageData, {colors: true}));

						requestOpts.uri = opts.config.apiUrl + "pictures/" + opts.uploadTarget.entity;
						requestOpts.form = {

							gallery_id: messageData.galleryId,
							container_name: messageData.containerName,
							original_image: messageData.originalImage,
							cdn_url: opts.config.cdnUrl,
							update_object: true,
							object_id: opts.uploadTarget.objectId
						};
						
						request.post(requestOpts, function(err, updateResult, updateBody) {

							updateBody = JSON.parse(updateBody);

							if (err || updateResult.statusCode != 200 || updateBody.update_object != true) {

								winston.error("Something went wrong while trying to add the picture record for %s", opts.uploadTarget.entity);

								if (err) {
									winston.error(err);
								}

								console.log(util.inspect(updateResult));
								console.log(util.inspect(updateBody));

								callback({statusCode: updateResult.statusCode, endpoint: requestOpts.uri, body: updateBody});
								return new Error(updateBody);

							} else {

								messageData.pictureId = updateBody.id;

								var sbService = azure.createServiceBusService();
								sbService.sendTopicMessage(

									opts.config.topicName,
									{
										body: JSON.stringify(messageData),
										customProperties: {
											entity: opts.uploadTarget.entity
										}
									},
									function(err, result) {

										if (err) {

											winston.error("Couldn't send message for uploaded picture.");
											winston.error(err);
											callback(err);

										} else {

											winston.info("Message sent for an uploaded picture.");

											// Delete the temp image
											if (opts.uploadTarget.file.isFile) {
												fs.unlink(opts.uploadTarget.file.path, function(err) {

													if (err) { winston.error("Couldn't delete file: %s", opts.uploadTarget.file.path); }
													else {
														winston.info("Uploaded and deleted local file: %s", opts.uploadTarget.file.path);
													}
												});
											}

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
	}

	handler.upload = handleUpload;

	return handler;
})();