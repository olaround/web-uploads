var util = require('util'),
	fs = require('fs');

module.exports = (function() {

	var mime = {};

	var mimeMap = {
		'.jpg': 'image/jpeg',
		'.gif': 'image/gif',
		'.png': 'image/png'
	};

	function dumpObject(obj, depth) {
		console.log(util.inspect(obj, {colors: 'true', depth: depth || 5}));
	}

	mime.getMimeTypeFromStream = function(stream, cb) {

		if (!stream.readable) {

			cb(new Error("The stream isn't readable."));
			return;
		}

		var count = 0;

		var dataListner = function(buffer) {

			if (count > 0) return;

			var type = null,
				magicBytes = buffer.toString('hex', 0, 3).toLowerCase();

			switch (magicBytes) {

				case '474946':

					type = { 
						type: mimeMap['.gif'],
						ext: '.gif'
					};

					break;

				case 'ffd8ff':

					type = { 
						type: mimeMap['.jpg'],
						ext: '.jpg'
					};

					break;

				case '89504e':

					type = { 
						type: mimeMap['.png'],
						ext: '.png'
					};

					break;

				default:

					type = undefined;
					break;
			}

			count++;
			stream.removeListener('data', dataListner);
			
			if (typeof type == 'undefined') {

				var error = new Error("unknown_type");
				error.description = "Either the stream doesn't contain a known mime type or the start was already emitted.";
				error.magicBytes = magicBytes;
				cb(error);

			} else {
				cb(null, type);
			}
		};

		stream.on('data', dataListner);
	};

	mime.getMimeTypeFromFile = function(filename, cb) {

		fs.exists(filename, function(exists) {

			if (!exists) {

				cb(new Error("The file doesn't exist."));
				return;

			} else {
				mime.getMimeTypeFromStream(fs.createReadStream(filename), cb);
			}
		});
	};

	mime.getExtFromContentType = function(contentType) {
		for(var ext in mimeMap) {
			if (mimeMap[ext] == contentType.toLowerCase()) {
				return ext;
			}
		}
	}

	return mime;

})();