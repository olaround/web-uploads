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

			var type = null;

			switch (buffer.toString('hex', 0, 4).toLowerCase()) {

				case '47494638':

					type = { 
						type: mimeMap['.gif'],
						ext: '.gif'
					};

					break;

				case 'ffd8ffe0':

					type = { 
						type: mimeMap['.jpg'],
						ext: '.jpg'
					};

					break;

				case '89504e47':

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

				cb(new Error({
					error: 'unknown_type',
					errorDescription: "Either the stream doesn't contain a known mime type or the start was already emitted."
				}));

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