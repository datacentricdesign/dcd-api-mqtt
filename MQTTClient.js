
// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd-api-mqtt:client]');
logger.level = process.env.LOG_LEVEL || 'INFO';

const MQTT = require('mqtt');

/**
 * This class set up an MQTT client as DCD MQTT API,
 * listening to /things#
 */
class MQTTClient {

    constructor(settings, model) {
        this.port = settings.port;
        this.host = settings.host;
        this.settings = settings.client;
        this.model = model;
    }

    connect() {
        const url = 'mqtt://' + this.host + ':' + this.port;
        logger.debug('MQTT connect: ' + url);
        this.client = MQTT.connect(url, this.settings);
        this.client.on('connect', onMQTTConnect.bind(this));
        this.client.on('message', onMQTTMessage.bind(this));
    }
}

module.exports = MQTTClient;

/**
 *
 */
function onMQTTConnect() {
    logger.info('Subscriber connected: ' + this.client.connected);
    this.client.subscribe('/things/#', (result) => {
        logger.debug('result subscribe');
        logger.debug(result);
    });
}

/**
 *
 * @param topic
 * @param message
 */
function onMQTTMessage(topic, message) {
    logger.debug('received: ' + message);
    let jsonMessage;
    try {
        jsonMessage = JSON.parse(message);
    } catch(error) {
        return logger.error(error.message);
    }

    const topicArray = topic.split('/');
    if (topicArray.length === 5 && topicArray[1] === 'things' && topicArray[3] === 'properties') {
        if (jsonMessage.id === topicArray[4]) {
            logger.debug('update property');
            this.model.properties.updateValues(jsonMessage)
                .catch( (error) => logger.error(error));
        }
    }
}
