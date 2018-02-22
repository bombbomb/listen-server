function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

test('Server starts and stops', async () => {
  const server = require('../src/index');
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

  expect(server.server).toBeDefined();
  expect(server.server.listening).toBeTruthy();

  await server.stop();
  expect(server.server.listening).toBeFalsy();
});
