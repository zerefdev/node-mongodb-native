'use strict';

const expect = require('chai').expect;
const mock = require('../tools/mock');
const { MongoClient } = require('../../src');

describe('Client (unit)', function () {
  let server, client;

  afterEach(async () => {
    await client.close();
    await mock.cleanup();
  });
  beforeEach(() => {
    return mock.createServer().then(_server => (server = _server));
  });

  it('should let wrapping libraries amend the client metadata', function () {
    let handshake;
    server.setMessageHandler(request => {
      const doc = request.document;
      if (doc.ismaster || doc.hello) {
        handshake = doc;
        request.reply(Object.assign({}, mock.DEFAULT_ISMASTER));
      } else if (doc.endSessions) {
        request.reply({ ok: 1 });
      }
    });

    client = new MongoClient(`mongodb://${server.uri()}/`, {
      driverInfo: {
        name: 'mongoose',
        version: '5.7.10',
        platform: 'llama edition'
      }
    });

    return client.connect().then(() => {
      expect(handshake).to.have.nested.property('client.driver');
      expect(handshake).nested.property('client.driver.name').to.equal('nodejs|mongoose');
      expect(handshake)
        .nested.property('client.driver.version')
        .to.match(/|5.7.10/);
      expect(handshake)
        .nested.property('client.platform')
        .to.match(/llama edition/);
    });
  });
});
