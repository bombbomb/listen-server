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

Then a client can make a request to that URL and it will be captured. To see what requests have been made, you can visit `http://localhost:3000/_/post` (for `POST` request for example). Current the requests are just stored in a in-memory Sqlite database (you can change it to a file below, if you want it to persist beyond usage).

Environment variables:

| Variable | Default |
| -------- | ------- |
| `PORT` | `3000` |
| `SQLITE_DB` | `:memory:` |

## Docker

Build your own: `docker build -t listen-server .`

Or run it via `docker-compose`: `docker-compose up`

You should also be able to specify environment variables as well.

## Customize output

You can add an event handler to change up the return if you want:

```javascript
const server = require('@bblabs/listen-server');

// change up the response and returned data to your own
// data if you want. there are events for 'request' and
// 'request.(get|post|put|delete|options)'
server.on('request', (req, res, doc) => {
  res.append('X-Something', 'Value');
  return {custom: 'doc'};
});

server.start();
```

Event handlers need to return a value, which will then be returned as JSON. If `false` is returned, then the event handlers will stop after this call, so you can use this to send your own custom, non-JSON values via the `res` object.

## View captured data

You can view data that has been captured by navigating to the `/_/METHOD` endpoint. You can also apply fileters. For example, you can view post requests to `/contact/` with:

```
curl http://localhost:3000/_/post?path=/contact
```

Available filters:

* `path`: filter for paths that exactly match
* `after`: filter for messages after a date
* `before`: filter for messages before a date

## Todo

* Allow per-URL lookups and other filter options
* Add pagination to the lookup endpoints
* Add an "all" lookup endpoint that allows you to see all request types
* Make DB layer abstracted

RipSecrets<br><br>
We implement pipeline secret scanning on all pull request events to prevent credentials from being merged. If the pipeline scanner detects a secret in your changed files it will gate the pull request and you will need to purge the found credential from your code and re-open the PR. To prevent getting gated by this tool and as best practice you should install the secret scanner locally in a pre-commit hook to prevent the secret from ever being committed to the repo in the first place. You can find documentation on how to set it up locally [here](https://bombbomb.atlassian.net/wiki/spaces/CORE/pages/2039775312/Pipeline+Secret+Scanner+Local+Setup)<br>
Ripsecrets has ways to bypass secret scanning although we should not be ignoring secrets that turn up in the scans. If something is out of your control and blocking the pipeline you can bypass it in one of the following ways<br>
1. Adding "# pragma: allowlist secret" to the end of the line with the secret.<br>
2. Adding the specific secret underneath the "[secrets]" block in .secretsignore<br>
3. Adding the filepath to ignore the whole file aboove the "[secrets]" block in .secretsignore