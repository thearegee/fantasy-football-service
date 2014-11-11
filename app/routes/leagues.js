'use strict';
var config  = require('../../config/config'),
	leaguesMiddleware = require(config.ROOT +'/app/middleware/leagues'),
	leaguesController = require(config.ROOT +'/app/controllers/leagues');



// route for survice
var routes = {
	init: function (server) {

		server.get('/fantasy/league/:leagueId/overview', 
			leaguesMiddleware.setDefaults,
			leaguesController.leaguesController.overview
			);

	}
};

module.exports = {
	routes:routes
};