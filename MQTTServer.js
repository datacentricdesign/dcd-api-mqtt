'use strict';

const mosca = require('mosca');

// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd-api-mqtt:server]');
logger.level = process.env.LOG_LEVEL || 'INFO';

class MQTTServer {

  /**
   *
   * @param settings
   * @param onReady
   * @param onConnected
   * @param auth
   */
  constructor(settings, onReady, onConnected, auth) {
    this.settings = settings;
    this.onReady = onReady;
    this.onConnected = onConnected;
    this.auth = auth;
  }

  /**
   *
   */
  start() {
    this.server = new mosca.Server(this.settings);

    this.server.authenticate = this.authenticateWithCredentials.bind(this);
    this.server.authorizePublish = this.authorizePublish.bind(this);
    this.server.authorizeSubscribe = this.authorizeSubscribe.bind(this);

    this.server.on('ready', this.onReady);
    this.server.on('clientConnected', this.onConnected);
    this.server.on('subscribed', () => {
      logger.debug('subscribed');
    });
  }

  authorizeSubscribe(client, topic, callback) {
    logger.debug('Authorising to subscribe on ' + topic);
    if (client.user.subject === this.settings.client.username) {
      return callback(null, true);
    }

    const resource = 'dcd:'
      + topic.substr(1).split('/').join(':').replace('#', '<.*>');

    const acp = {
      action: 'dcd:actions:read',
      resource: resource,
      subject: 'dcd:things:' + client.user.subject
    };
    this.auth.wardenSubject(acp)
      .then(() => {
        logger.debug('authorised to subscribe on ' + topic);
        callback(null, true);
      })
      .catch(() => {
        const message = 'Subscription denied to ' + topic;
        callback(new Error(message), false);
      });
  }

  authorizePublish(client, topic, payload, callback) {
    logger.debug('Authorising to publish on ' + topic);
    if (client.user.subject === this.settings.client.username) {
      return callback(null, true);
    }

    const resource = 'dcd:' + topic.substr(1).split('/').join(':');
    const acp = {
      action: 'dcd:actions:update',
      resource: resource,
      subject: 'dcd:things:' + client.user.subject
    };

    console.log(acp);
    this.auth.wardenSubject(acp)
      .then(() => {
        logger.debug('authorised to publish on ' + topic);
        callback(null, true);
      })
      .catch(() => {
        const message = 'NOT authorised to publish on ' + topic;
        callback(new Error(message), false);
      });
  }

  authenticateWithCredentials(client, username, password, callback) {
    logger.debug('authenticate with credentials: ' + username);
    if (username === this.settings.client.username) {
      logger.debug('DCD client mqtt');
      client.user = {};
      client.user.subject = username;
      client.user.token = password;
      return callback(null, true);
    } else {
      logger.debug('NOT DCD client mqtt');
    }

    this.auth.checkJWTAuth(password, username)
      .then(() => {
        client.user = {};
        client.user.subject = username;
        client.user.token = password;
        callback(null, true);
      })
      .catch((error) => {
        logger.error(error);
        callback(error, false);
      });
  }
}

module.exports = MQTTServer;