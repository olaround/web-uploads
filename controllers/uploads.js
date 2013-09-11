var winston = require('winston'),
	util = require('util'),
	UploadHelper = require('../helpers/upload'),
	fs = require('fs');

module.exports.uploadUserPicture = function(req, res) {

	req.uploadTarget = {

		file: {
			name: req.files.image.name,
			isFile: true,
			file: req.files.image,
			stream: fs.createReadStream(req.files.image.path),
			size: req.files.image.size
		},
		objectId: req.params.user,
		entity: req.config.entities.userPhotos,
		galleriesUrl: req.config.apiUrl + 'users/' + req.params.user + '/galleries',
		targetGallery: 'Profile Pictures'
	};

	res.type('application/json');

	UploadHelper.upload(req, res, function(err, result) {

		if (err) {

			winston.error(err);
			res.send(err);

		} else {

			winston.info("Message successfuly sent for user: %s", req.params.user);
			console.log(util.inspect(result, {colors: true}));

			res.send(result);
		}
	});
};

module.exports.uploadBrandPicture = function(req, res) {

	req.uploadTarget = {

		file: {
			name: req.files.image.name,
			isFile: true,
			file: req.files.image,
			stream: fs.createReadStream(req.files.image.path),
			size: req.files.image.size
		},
		objectId: req.params.brand,
		entity: req.config.entities.brandProfiles,
		galleriesUrl: req.config.apiUrl + 'brands/' + req.params.brand + '/galleries',
		targetGallery: 'Profile Pictures'
	};

	res.type('application/json');

	UploadHelper.upload(req, res, function(err, result) {

		if (err) {

			winston.error(err);
			res.send(err);

		} else {

			winston.info("Message successfuly sent for brand: %s", req.params.brand);
			console.log(util.inspect(result, {colors: true}));

			res.send(result);
		}
	});	
}

module.exports.uploadBrandBackground = function(req, res) {

	req.uploadTarget = {

		file: {
			name: req.files.image.name,
			isFile: true,
			file: req.files.image,
			stream: fs.createReadStream(req.files.image.path),
			size: req.files.image.size
		},
		objectId: req.params.brand,
		entity: req.config.entities.brandBackgrounds,
		galleriesUrl: req.config.apiUrl + 'brands/' + req.params.brand + '/galleries',
		targetGallery: 'Backgrounds'
	};

	res.type('application/json');

	UploadHelper.upload(req, res, function(err, result) {

		if (err) {

			winston.error(err);
			res.send(err);

		} else {

			winston.info("Message successfuly sent for brand: %s", req.params.brand);
			console.log(util.inspect(result, {colors: true}));

			res.send(result);
		}
	});	
}