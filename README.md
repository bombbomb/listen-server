#

A simple server that captures and allows you to inspect those via JSON.

This is intended to be a layer added into a local app stack where you might not really need another application running.

## Install

```
npm install --save just-serve
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

Build your own: `docker build -t just-serve .`

Or run it via `docker-compose`: `docker-compose up`

## Customize output

You can add an event handler to change up the return if you want:

```javascript
const server = require('just-serve');

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
