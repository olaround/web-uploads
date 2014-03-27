var orm = require('orm');

module.exports = (function() {

	return {
		define: function (db, models, next) {

			models.User = db.define("users", {

				id									: {type: 'number', size: 8, required: true, unique: true},
				username							: {type: 'text', size: 256},
				passwd								: {type: 'text', size: 256},
				auth_pin							: {type: 'text', size: 4},
				email								: {type: 'text', size: 256},
				phone								: {type: 'text', size: 20},
				secret_answer						: {type: 'text', size: 512},
				is_approved							: {type: 'boolean'},
				is_online							: {type: 'boolean'},
				is_verified							: {type: 'boolean'},
				last_active							: {type: 'date', time: true},
				last_login							: {type: 'date', time: true},
				last_password_changed				: {type: 'date', time: true},
				invalid_login_attempts				: {type: 'boolean'},
				invalid_login_window_start			: {type: 'date', time: true},
				invalid_secret_answer_attempts		: {type: 'boolean'},
				invalid_secret_answer_window_start	: {type: 'date', time: true},
				question_id							: {type: 'number', size: 8},
				profile_level_id					: {type: 'number', size: 8},
				country								: {type: 'text', size: 256},
				first_name							: {type: 'text', size: 100},
				middle_name							: {type: 'text', size: 100},
				last_name							: {type: 'text', size: 100},
				gender								: ['male','female','unspecified'],
				biography							: {type: 'text'},
				date_of_birth						: {type: 'date', time: true},
				address								: {type: 'text'},
				city								: {type: 'text', size: 256},
				state								: {type: 'text', size: 256},
				zip_code							: {type: 'text', size: 20},
				exp									: {type: 'number', size: 8},
				fb_user_id							: {type: 'number', size: 8},
				facebook_access_token				: {type: 'text', size: 512},
				facebook_authentication_time		: {type: 'date', time: true},
				facebook_token_expiry				: {type: 'date', time: true},
				twitter_user_id						: {type: 'number', size: 8},
				twitter_screen_name					: {type: 'text', size: 100},
				twitter_oauth_token					: {type: 'text', size: 512},
				twitter_oauth_token_secret			: {type: 'text', size: 512},
				twitter_authentication_time			: {type: 'date', time: true},
				foursquare_oauth_token				: {type: 'text', size: 512},
				foursquare_authentication_time		: {type: 'date', time: true},
				display_picture_id					: {type: 'number', size: 8},
				timezone							: {type: 'number', rational: true},
				is_active							: {type: 'boolean'},
				profile_lup_dtid					: {type: 'date', time: true},
				dtid								: {type: 'date', time: true},
				lup_dtid							: {type: 'date', time: true}
			});

			models.Picture = db.define('pictures_new', {

				id				: {type: 'number', size: 8, required: true, unique: true},
				gallery_id		: {type: 'number', size: 8, required: true, unique: true},
				container_name	: {type: 'text', size: 255},
				original_image	: {type: 'text', size: 512},
				cdn_url			: {type: 'text', size: 512},
				entity			: {type: 'text', size: 100},
				status			: ['pending','processing','processed','deleted','cached'],
				lock_id			: {type: 'number', size: 4},
				dtid			: {type: 'date', time: true},
				lup_dtid		: {type: 'date', time: true}
			});

			models.Brand = db.define('brands', {

				id						: {type: 'number', size: 8, required: true, unique: true},
				name					: {type: 'text', size: 200},
				picture_id				: {type: 'number', size: 8, required: true, unique: true},
				brand_slug				: {type: 'text', size: 200},
				background_picture_id	: {type: 'number', size: 8, required: true, unique: true},
				description				: {type: 'text'},
				website					: {type: 'text', size: 255},
				facebook				: {type: 'text', size: 255},
				twitter					: {type: 'text', size: 100},
				google					: {type: 'text', size: 255},
				email					: {type: 'text', size: 255},
				phone					: {type: 'text', size: 20},
				country					: {type: 'text', size: 100},
				listing_caption			: {type: 'text', size: 64},
				listing_layout			: ['menu','gallery'],
				is_premium				: {type: 'boolean'},
				is_verified				: {type: 'boolean'},
				brand_type				: {type: 'text', size: 25},
				global_deals			: {type: 'boolean'},
				global_kicks			: {type: 'boolean'},
				global_categories		: {type: 'boolean'},
				primary_category_id		: {type: 'number', size: 8, required: true, unique: true},
				currency				: {type: 'text', size: 3},
				is_active				: {type: 'boolean'},
				dtid					: {type: 'date', time: true},
				lup_dtid				: {type: 'date', time: true}
			});

			models.Activity = db.define('activities', {

				id			: {type: 'number', size: 8, required: true, unique: true},
				user_id		: {type: 'number', size: 8},
				brand_id	: {type: 'number', size: 8},
				store_id	: {type: 'number', size: 8},
				type		: ['checkin','verified_checkin','rewards','join','promotion','verfied_checkin','brandcast','photo'],
				data		: {type: 'text', required: true},
				object_id	: {type: 'number', size: 8, required: true},
				is_active	: {type: 'boolean', required: true},
				dtid		: {type: 'date', time: true, required: true},
				lup_dtid	: {type: 'date', time: true, required: true}

			});

			next();
		}
	};
}());