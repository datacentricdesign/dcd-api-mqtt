// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd-api-mqtt:mock]');
logger.level = process.env.LOG_LEVEL || 'INFO';

const MQTT = require('mqtt');

const DCDModel = require('dcd-model');
const Person = require('dcd-model/entities/Person');
const Thing = require('dcd-model/entities/Thing');
const Property = require('dcd-model/entities/Property');

// Initial setting, we set the username and pass once we created the Thing.
const settings = {
    host: process.env.MQTT_HOST || 'mqtt',
    port: process.env.MQTT_PORT !== undefined
        ? parseInt(process.env.MQTT_PORT) : 8883,
    client: {
        keepalive: 1000,
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        clientId: 'test-mock'
    }
};

const model = new DCDModel();

class Mock {

    constructor(settings, model) {
        this.port = settings.port;
        this.host = settings.host;
        this.settings = settings.client;
        this.model = model;
    }

    init() {
        return model.persons.create(new Person('testUser', 'testtest'))
            .then((createdPersonId) => {
                return model.things.create(createdPersonId,
                    new Thing('test', 'test thing', 'Smart phone'), true);
            })
            .then((createdThing) => {
                this.thing = createdThing;
                const property = new Property('test prop',
                    'test prop desc', 'ACCELEROMETER');
                property.entityId = createdThing.id;
                this.thing.properties = [property];
                return model.properties.create(property);
            })
            .then(() => {
                return Promise.resolve(this.thing);
            })
            .catch((error) => {
                return Promise.reject(error);
            });
    }

    connect(username, password) {
        const url = 'mqtt://' + this.host + ':' + this.port;
        this.settings.username = username;
        this.settings.password = password;

        logger.debug('user: ' + username);
        logger.debug('pass: ' + password);

        logger.debug('MQTT connect: ' + url);
        logger.debug('MQTT user: ' + this.settings.username);
        this.client = MQTT.connect(url, this.settings);
        this.client.on('connect', this.onMQTTConnect.bind(this));
        this.client.on('message', Mock.onMQTTMessage);
    }

    onMQTTConnect() {
        logger.info('Mock connected: ' + this.client.connected);
        // this.publishDum();

        logger.info('Subscriber connected: ' + this.client.connected);
        const topic = '/things/' + this.thing.id
            + '/properties/' + this.thing.properties[0].id;
        this.client.subscribe('/things/' + this.thing.id, (result) => {
            logger.debug('Result of subscription to ' + topic);
            logger.debug(result);
            this.publishDum();
        });
    }

    publishDum() {
        const topic = '/things/' + this.thing.id + '/properties/'
            + this.thing.properties[0].id;
        logger.debug('publish on: ' + topic);
        const updatedProperty = {
            id: this.thing.properties[0].id,
            values: [[Date.now(), Math.random(), Math.random(), Math.random()]]
        };
        this.client.publish(topic, JSON.stringify(updatedProperty));
        setTimeout(this.publishDum.bind(this), 2000);
    }

    static onMQTTMessage(topic, message) {
        logger.debug('received: ' + message);
    }
}

/**
 * Create a thing, then try to push data using oauth
 */
model.init().then(() => {
    const mock = new Mock(settings, model);
    mock.init()
        .then((thing) => {
            // We now have the username and password,
            // we complete setting and connect
            logger.debug('connecting to mqtt');
            // username: id of the thing, pass: generated jwt
            mock.connect(thing.id, thing.keys.jwt);
        })
        .catch((error) => {
            logger.error(error);
        });
});