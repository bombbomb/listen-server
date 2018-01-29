const request = require('request-promise-native');

const server = require('../src/index');

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

beforeAll(async () => {
  while (true) {
    let port = getRandomInt(8000, 8999);
    await server.start(port);
    break;
  }
});

afterEach(() => {
  server.db.run('DELETE FROM http_post');
  server.db.run('DELETE FROM http_get');
  server.db.run('DELETE FROM http_put');
  server.db.run('DELETE FROM http_delete');
  server.db.run('DELETE FROM http_options');
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

test('can post to / and see it with /_/posts', async (done) => {
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
  expect(JSON.parse(response2.body.items[0].queryString)).toEqual({q: '123'});

  done();
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
  expect(JSON.parse(response2.body.items[0].queryString)).toEqual({q: '123'});

  done();
});
