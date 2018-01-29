#

A simple server that captures and allows you to inspect those via JSON.

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

## Todo

* Allow per URL lookups
* Make DB layer abstracted
