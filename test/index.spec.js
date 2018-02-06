const request = require('request-promise-native');

const server = require('../src/index');

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

beforeAll(async () => {
  let attempts = 10;
  let started = false;
  while (attempts > 0) {
    let port = getRandomInt(8000, 8999);
    attempts -= 1;
    try {
      await server.start(port);
      started = true;
    }
    catch (err) {
      continue;
    }
    break;
  }

  if (!started) {
    throw new Error('Could not find an open port to run the server on');
  }
});

afterEach(() => {
  server.db.run('DELETE FROM http_post');
  server.db.run('DELETE FROM http_get');
  server.db.run('DELETE FROM http_put');
  server.db.run('DELETE FROM http_delete');
  server.db.run('DELETE FROM http_options');
  server.removeEventHandlers();
  server.options.log = false;
});

afterAll(() => {
  server.stop();
});

test('can post to /', async (done) => {
  const options = {
    uri: `http://localhost:${server.port}`,
    method: 'POST',
    body: { data: 123 },
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe('success');

  done();
});


test('events on request', async () => {
  const eventListener = (req, res, doc) => {
    return {something: 123};
  };
  const obj = {eventListener};

  const spy = jest.spyOn(obj, 'eventListener');

  server.on('request', obj.eventListener);

  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(spy).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(response.body.something).toBe(123);
});

test('multiple event handlers called', async (done) => {
  const listener = {
    eventListener: (req, res, doc) => {
      return doc
    },
    eventListener2: (req, res, doc) => {
      return doc
    },
  };

  const spy = jest.spyOn(listener, 'eventListener');
  const spy2 = jest.spyOn(listener, 'eventListener2');

  server.on('request', listener.eventListener);
  server.on('request', listener.eventListener2);

  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(spy).toHaveBeenCalled();
  expect(spy2).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  done();
});

test('events on request for specific method', async (done) => {
  const eventListener = () => {
    return { something: 123 };
  };
  const obj = {eventListener};

  const spy = jest.spyOn(obj, 'eventListener');

  server.on('request.get', obj.eventListener);

  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(spy).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(response.body.something).toBe(123);
  done();
});

test('not returning a doc in an event handler stops default behavior', async (done) => {
  const eventListener = (req, res) => {
    res.status(200).send('hi');
    return false;
  };

  const obj = { eventListener };

  const spy = jest.spyOn(obj, 'eventListener');

  server.on('request.get', obj.eventListener);

  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(spy).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe('hi');
  done();
});

test('not returning a doc stops subsequent event handlers', async (done) => {
  const listener = {
    eventListener: (req, res) => {
      res.status(200).send('hi');
      return false;
    },
    eventListener2: (req, res, doc) => {
      return doc;
    }
  };

  const spy = jest.spyOn(listener, 'eventListener');
  const spy2 = jest.spyOn(listener, 'eventListener2');

  server.on('request.get', listener.eventListener);
  server.on('request.get', listener.eventListener2);

  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(spy).toHaveBeenCalled();
  expect(spy2).not.toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe('hi');
  done();
});

test('Log to console only if option is on', async (done) => {
  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };

  const spy = jest.spyOn(console, 'log');

  await request(options);
  expect(spy).not.toHaveBeenCalled();

  server.options.log = true;
  await request(options);
  expect(spy).toHaveBeenCalled();

  done();
});
