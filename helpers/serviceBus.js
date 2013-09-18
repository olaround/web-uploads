var azure = require('azure'),
	winston = require('winston'),
	util = require('util');

module.exports = (function() {
	
	var sbService = azure.createServiceBusService();

	var queueRetryTimer = null, 
		queueSuccessTimer = null,
		queueTimerFunction = null,

		topicRetryTimer = null, 
		topicSuccessTimer = null,		
		topicTimerFunction = null;

	queueTimerFunction = function(queue, successInterval, retryInterval) {

		var queueFunction = function() {

			sbService.receiveQueueMessage(queue + '/$DeadLetterQueue', { isPeekLock: true }, function (err, lockedMessage) {
					
				if (err) {

					if (err == "No messages to receive") {
						winston.notice("[QUEUE] %s from Dead-lettered queue.", err);
					}

					queueRetryTimer = setTimeout(queueFunction, retryInterval);

				} else {

					queueSuccessTimer = null;

					// Message received and locked
					winston.info("[QUEUE] Dead-lettered queue message found. Requeuing...");

					var queueMessage = {
						body: lockedMessage.body,
						customProperties: {
							deadLetterCount: typeof lockedMessage.customProperties.deadLetterCount != 'undefined' ? parseInt(lockedMessage.customProperties.deadLetterCount) + 1 : 1
						}
					};

					sbService.sendQueueMessage(queue, queueMessage, function(err) {

						if (err) {

							winston.error("[QUEUE] Couldn't requeue the Dead-lettered queue message...");
							console.log(util.inspect(err, {colors: true, depth: 5}));

						} else {

							sbService.deleteMessage(lockedMessage, function (err) {
				
								if (err) {
									
									winston.error("[QUEUE] Couldn't delete requeued message from Dead-lettered queue.")
									console.log(util.inspect(err, {colors: true, depth: 5}));
								
								} else {
									
									winston.info("[QUEUE] Deleted requeued message from Dead-lettered queue.");
								}
							});
						}
					});

					queueSuccessTimer = setTimeout(queueFunction, successInterval);
				}
			});
		};

		queueFunction();
	};

	topicTimerFunction = function(topic, subscription, successInterval, retryInterval) {

		var topicFunction = function() {

			sbService.receiveSubscriptionMessage(topic, subscription + '/$DeadLetterQueue', { isPeekLock: true }, function (err, lockedMessage) {
					
				if (err) {

					if (err == "No messages to receive") {
						winston.notice("[TOPIC] %s from Dead-lettered topic.", err);
					}

					topicRetryTimer = setTimeout(topicFunction, retryInterval);

				} else {

					topicSuccessTimer = null;
					var topicMessage = {
						body: lockedMessage.body,
						customProperties: {
							entity: lockedMessage.customProperties.entity,
							deadLetterCount: typeof lockedMessage.customProperties.deadLetterCount != 'undefined' ? parseInt(lockedMessage.customProperties.deadLetterCount) + 1 : 1
						}
					};

					// Message received and locked
					winston.info("[TOPIC] Dead-lettered topic message found. Requeuing...");

					sbService.sendTopicMessage(topic, topicMessage, function(err) {

						if (err) {

							winston.error("[TOPIC] Couldn't requeue the Dead-lettered topic message...");
							console.log(util.inspect(err, {colors: true, depth: 5}));

						} else {

							sbService.deleteMessage(lockedMessage, function (err) {
				
								if (err) {
									
									winston.error("[TOPIC] Couldn't delete requeued message from Dead-lettered topic.")
									console.log(util.inspect(err, {colors: true, depth: 5}));
								
								} else {
									
									winston.info("[TOPIC] Deleted requeued message from Dead-lettered topic.");
								}
							});
						}
					});

					topicSuccessTimer = setTimeout(topicFunction, successInterval);
				}
			});
		};

		topicFunction();
	};

	return {
		handleDeadLetterQueue: queueTimerFunction,
		handleDeadLetterTopic: topicTimerFunction
	};

})();