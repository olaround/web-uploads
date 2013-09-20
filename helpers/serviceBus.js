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
							deadlettercount: typeof lockedMessage.customProperties.deadlettercount != 'undefined' ? parseInt(lockedMessage.customProperties.deadlettercount) + 1 : 1
						}
					};

					sbService.sendQueueMessage(queue, queueMessage, function(err) {

						queueMessage = null;

						if (err) {

							winston.error("[QUEUE] Couldn't requeue the Dead-lettered queue message...");
							console.log(util.inspect(err, {colors: true, depth: 5}));

						} else {

							sbService.deleteMessage(lockedMessage, function (err) {

								lockedMessage = null;
				
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

		var deleteDeadLetteredMessage = function(message) {

			sbService.deleteMessage(message, function (err) {
	
				if (err) {
					
					winston.error("[TOPIC] Couldn't delete requeued message from Dead-lettered topic.")
					console.log(util.inspect(err, {colors: true, depth: 5}));
				
				} else {
					
					winston.info("[TOPIC] Deleted requeued message from Dead-lettered topic.");
				}
			});
		};

		var topicFunction = function() {

			sbService.receiveSubscriptionMessage(topic, subscription + '/$DeadLetterQueue', { isPeekLock: true }, function (err, lockedMessage) {
					
				if (err) {

					if (err == "No messages to receive") {
						winston.notice("[TOPIC] %s from Dead-lettered topic.", err);
					}

					topicRetryTimer = setTimeout(topicFunction, retryInterval);

				} else {

					topicSuccessTimer = null;

					if (lockedMessage.customProperties.deadlettercount) {
						deadlettercount = lockedMessage.customProperties.deadlettercount + 1;
					} else {
						deadlettercount = 1;
					}

					if (deadlettercount > 10) {

						winston.warning('[TOPIC] Dead letter count exceded for message with Picture ID: %d', JSON.parse(lockedMessage.body).pictureId);
						deleteDeadLetteredMessage(lockedMessage);

					} else {

						var topicMessage = {
							body: lockedMessage.body,
							customProperties: {
								entity: lockedMessage.customProperties.entity,
								deadlettercount: deadlettercount
							}
						};

						/*console.log(util.inspect(lockedMessage, {colors: true, depth: 5}));
						console.log(util.inspect(topicMessage, {colors: true, depth: 5}));*/

						// Message received and locked
						winston.info("[TOPIC] Dead-lettered topic message found. Requeuing...");

						sbService.sendTopicMessage(topic, topicMessage, function(err) {

							topicMessage = null;

							if (err) {

								winston.error("[TOPIC] Couldn't requeue the Dead-lettered topic message...");
								console.log(util.inspect(err, {colors: true, depth: 5}));

							} else {

								deleteDeadLetteredMessage(lockedMessage);
							}
						});
					}

					topicSuccessTimer = setTimeout(topicFunction, successInterval);
					return;
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