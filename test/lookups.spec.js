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
    const port = getRandomInt(8000, 8999);
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
  const promises = [];
  promises.push(server.db('http_post').delete());
  promises.push(server.db('http_get').delete());
  promises.push(server.db('http_put').delete());
  promises.push(server.db('http_delete').delete());
  promises.push(server.db('http_options').delete());

  server.removeEventHandlers();
  server.options.log = false;

  return Promise.all(promises);
});

afterAll(() => {
  server.stop();
});

test('can post to / and see it with /_/post', async (done) => {
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

  const options2 = {
    uri: `http://localhost:${server.port}/_/post`,
    resolveWithFullResponse: true,
    json: true
  };
  const response2 = await request(options2);
  expect(response2.statusCode).toBe(200);
  expect(response2.body.status).toBe('success');
  expect(response2.body.count).toBe(1);

  done();
});

test('can post to / with a querystring and see it with /_/post', async (done) => {
  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'POST',
    body: { data: 123 },
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe('success');

  const options2 = {
    uri: `http://localhost:${server.port}/_/post`,
    resolveWithFullResponse: true,
    json: true
  };
  const response2 = await request(options2);
  expect(response2.statusCode).toBe(200);
  expect(response2.body.status).toBe('success');
  expect(response2.body.count).toBe(1);
  expect(response2.body.items[0].url).toBe('/?q=123');
  expect(JSON.parse(response2.body.items[0].queryString)).toEqual({ q: '123' });

  done();
});

test('can filter posts by path on /_/post', async (done) => {
  const postPromises = [];
  [
    {
      uri: `http://localhost:${server.port}`,
      body: { data: 123 },
    },
    {
      uri: `http://localhost:${server.port}/different/path`,
      body: { data: 123 },
    },
  ].map((fixture) => {
    const options = {
      uri: fixture.uri,
      method: 'POST',
      body: fixture.body,
      json: true,
      resolveWithFullResponse: true,
    };
    postPromises.push(request(options));
  });

  Promise.all(postPromises)
    .then(async () => {
      const options = {
        uri: `http://localhost:${server.port}/_/post?path=/`,
        resolveWithFullResponse: true,
        json: true
      };
      const response = await request(options);
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.count).toBe(1);

      done();
    });
});

test('can get to / with a querystring and see it with /_/get', async (done) => {
  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe('success');

  const options2 = {
    uri: `http://localhost:${server.port}/_/get`,
    resolveWithFullResponse: true,
    json: true
  };
  const response2 = await request(options2);
  expect(response2.statusCode).toBe(200);
  expect(response2.body.status).toBe('success');
  expect(response2.body.count).toBe(1);
  expect(JSON.parse(response2.body.items[0].queryString)).toEqual({ q: '123' });

  done();
});

test('can delete messages at /_/get', async (done) => {
  // send a get request
  const options = {
    uri: `http://localhost:${server.port}/?q=123`,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
  };
  const response = await request(options);

  expect(response.statusCode).toBe(200);
  expect(response.body.status).toBe('success');

  // check that we have a message
  const options2 = {
    uri: `http://localhost:${server.port}/_/get`,
    resolveWithFullResponse: true,
    json: true
  };
  const response2 = await request(options2);
  expect(response2.statusCode).toBe(200);
  expect(response2.body.status).toBe('success');
  expect(response2.body.count).toBe(1);

  const options3 = {
    uri: `http://localhost:${server.port}/_/get`,
    method: 'DELETE',
    resolveWithFullResponse: true,
    json: true
  }
  const response3 = await request(options3);
  expect(response3.statusCode).toBe(200);
  expect(response3.body.status).toBe('success');

  // check that we have a message
  const options4 = {
    uri: `http://localhost:${server.port}/_/get`,
    resolveWithFullResponse: true,
    json: true
  };
  const response4 = await request(options4);
  expect(response4.statusCode).toBe(200);
  expect(response4.body.status).toBe('success');
  expect(response4.body.count).toBe(0);

  done();
});
