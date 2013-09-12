var winston = require('winston'),
	util = require('util'),
	UploadHelper = require('../helpers/upload'),
	ErrorHelper = require('../helpers/error'),
	fs = require('fs');

module.exports.uploadUserPicture = function(req, res) {

	var opts = {

		config: req.config,
		headers: req.headers,
		uploadTarget: {

			file: {
				name: req.files.image.name,
				isFile: true,
				path: req.files.image.path
			},
			objectId: req.params.user,
			entity: req.config.entities.userPhotos,
			galleriesUrl: req.config.apiUrl + 'users/' + req.params.user + '/galleries',
			targetGallery: 'Profile Pictures'
		}
	};

	res.type('application/json');

	UploadHelper.upload(opts, function(err, result) {

		if (err) {

			if (err.statusCode && !err.body) {
											
				ErrorHelper.sendError(err.statusCode);

			} else if (err.statusCode && err.body) {

				res.type("application/json");
				res.send(err.statusCode, err.body);

			} else {

				res.send(err);
			}

			winston.error(err);

		} else {

			winston.info("Message successfuly sent for user: %s", req.params.user);
			console.log(util.inspect(result, {colors: true}));

			res.send(result);
		}
	});
};

module.exports.uploadBrandPicture = function(req, res) {

	var opts = {

		config: req.config,
		headers: req.headers,
		uploadTarget: {

			file: {
				name: req.files.image.name,
				isFile: true,
				path: req.files.image.path
			},
			objectId: req.params.brand,
			entity: req.config.entities.brandProfiles,
			galleriesUrl: req.config.apiUrl + 'brands/' + req.params.brand + '/galleries',
			targetGallery: 'Profile Pictures'
		}
	};

	res.type('application/json');

	UploadHelper.upload(opts, function(err, result) {

		if (err) {

			if (err.statusCode && !err.body) {
											
				ErrorHelper.sendError(err.statusCode);

			} else if (err.statusCode && err.body) {

				res.type("application/json");
				res.send(err.statusCode, err.body);

			} else {

				res.send(err);
			}

			winston.error(err);			

		} else {

			winston.info("Message successfuly sent for brand: %s", req.params.brand);
			console.log(util.inspect(result, {colors: true}));

			res.send(result);
		}
	});	
}

module.exports.uploadBrandBackground = function(req, res) {

	var opts = {

		config: req.config,
		headers: req.headers,
		uploadTarget: {

			file: {
				name: req.files.image.name,
				isFile: true,
				path: req.files.image.path
			},
			objectId: req.params.brand,
			entity: req.config.entities.brandBackgrounds,
			galleriesUrl: req.config.apiUrl + 'brands/' + req.params.brand + '/galleries',
			targetGallery: 'Backgrounds'
		}
	};

	res.type('application/json');

	UploadHelper.upload(opts, function(err, result) {

		if (err) {

			if (err.statusCode && !err.body) {
											
				ErrorHelper.sendError(err.statusCode);

			} else if (err.statusCode && err.body) {

				res.type("application/json");
				res.send(err.statusCode, err.body);

			} else {

				res.send(err);
			}

			winston.error(err);

		} else {

			winston.info("Message successfuly sent for brand: %s", req.params.brand);
			console.log(util.inspect(result, {colors: true}));

			res.send(result);
		}
	});	
}