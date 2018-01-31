# listen-server

[![Build Status](https://travis-ci.com/bombbomb/listen-server.svg?token=U5j8RScQzx1HwkBzxicx&branch=master)](https://travis-ci.com/bombbomb/listen-server)

A simple server that captures and allows you to inspect those via JSON.

This is intended to be a layer added into a local app stack where you might not really need another application running. Could also be useful in testing scenarios.

## Install

```
npm install --save @bblabs/listen-server
```

## Usage

```
# run on 3000
node run src/index.js

# run on 8080
PORT=8080 node run src/index.js
```

Then a client can make a request to that URL and it will be captured. To see what requests have been made, you can visit `http://localhost:3000/_/post` (for `POST` request for example).

Environment variables:

| Variable | Default |
| -------- | ------- |
| `PORT` | `3000` |
| `SQLITE_DB` | `:memory:` |

## Docker

Build your own: `docker build -t listen-server .`

Or run it via `docker-compose`: `docker-compose up`

You should also be able to specify

## Customize output

You can add an event handler to change up the return if you want:

```javascript
const server = require('listen-server');

// change up the response and returned data to your own
// data if you want. there are events for 'request' and
// 'request.(get|post|put|delete|options)'
server.on('request', (req, res, doc) => {
  res.append('X-Something', 'Value');
  return {custom: 'doc'};
});

server.start();
```

## Todo

* Allow per-URL lookups
* Add pagination to the lookup endpoints
* Add an "all" lookup endpoint
* Make DB layer abstracted
