'use strict';

// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd-api-mqtt:index]');
logger.level = process.env.LOG_LEVEL || 'INFO';

const MQTTServer = require('./MQTTServer');
const MQTTClient = require('./MQTTClient');

const DCDModel = require('dcd-model');
const model = new DCDModel();

const settings = {
    host: process.env.MQTT_HOST || 'mqtt',
    port: process.env.MQTT_PORT !== undefined
      ? parseInt(process.env.MQTT_PORT) : 1883,
    client: {
        keepalive: 1000,
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        clientId: process.env.MQTT_CLIENT_ID || 'dcd-mqtt',
        username: process.env.MQTT_CLIENT_USER,
        password: process.env.MQTT_CLIENT_PASS
    },
    logger: {
        name: "dcd-api-mqtt",
        level: "debug",
    },
    allowNonSecure: true,
    secure : {
        port: 8883,
        keyPath: process.env.KEY_PATH || "/etc/certs/dcd-hub.key",
        certPath: process.env.CERT_PATH || "/etc/certs/dcd-hub.pem",
    },
    http: {
        port: 3000,
        bundle: true,
        static: './static'
    }
};

const onReady = () => {
    logger.info('Mosca server is up and running');
    model.init()
        .then(() => {
            const mqttClient = new MQTTClient(settings, model);
            mqttClient.connect();
        });
};

const onConnected = (client) => {
    logger.info('New connection: ', client.id);
};

const mqttServer = new MQTTServer(settings, onReady, onConnected, model);
mqttServer.start();
