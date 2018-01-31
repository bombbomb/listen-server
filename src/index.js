const bodyParser = require('body-parser');
const httpMethods = ['POST', 'GET', 'PUT', 'OPTIONS', 'DELETE'];

/**
 * Wrap up an express server that will accept requests.
 *
 * This builds a simple express server that will accept HTTP requests,
 * log them into a Sqlite database.
 */
class Server {
  constructor() {
    this.app = require('express')();
    this.server = null;
    this.init();
    this._events = {};
  }

  /**
   * Get the normalized data table name
   * @param {string} method The request method
   */
  getTableName(method) {
    return `http_${method.toLowerCase()}`;
  }

  /**
   * Initialize the database.
   */
  async initDb() {
    const promises = [];
    // db initalization
    httpMethods.forEach((method) => {
      const tableName = this.getTableName(method);
      promises.push(new Promise((resolve, reject) => {
        this.db.run(`CREATE TABLE ${tableName} (url TEXT, data TEXT, headers TEXT, queryString TEXT, requestTime INT)`, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      }));
    });

    return Promise.all(promises);
  }

  /**
   * Initialize the express app side of things
   */
  init() {
    this.app.use(bodyParser.json());

    // data inspection routes
    httpMethods.forEach((method) => {
      const endpoint = method.toLowerCase();
      this.app.get(`/_/${endpoint}`, this.lookup(endpoint).bind(this));
    });

    this.app.get('/_/health-check', (req, res) => {
      res.status(200).json({ status: 'success', message: 'Hi' });
    });

    // catch "all" route
    this.app.all(/^[^_]/, this.catchall.bind(this));
  }

  /**
   * The lookup handler.
   *
   * @param {string} endpoint Endpoint param
   */
  lookup(endpoint) {
    return (req, res) => {
      const items = [];
      this.db.each(`SELECT * FROM http_${endpoint}`, (err, row) => {
        if (err) {
          res.status(500).json({ status: 'error', message: err });
        }

        const item = Object.assign({}, row, { data: JSON.parse(row.data) });
        items.push(item);
      }, () => {
        res.status(200).json({
          status: 'success',
          message: 'ok',
          count: items.length,
          items
        });
      });
    };
  }

  /**
   * The "catchall" method handler.
   *
   * Handles all HTTP requests for anything besides /_ lookup endpoints.
   *
   * @param {object} req The HTTP request object
   * @param {object} res The HTTP response object
   */
  async catchall(req, res) {
    if (httpMethods.indexOf(req.method) < 0) {
      return res.status(200).json({ status: 'success', message: 'Invalid HTTP method, ignoring' });
    }

    const tableName = this.getTableName(req.method);
    const data = (req.body) ? JSON.stringify(req.body) : {};
    const qs = (req.query) ? JSON.stringify(req.query) : {};
    this.db.run(`INSERT INTO ${tableName} VALUES(?, ?, ?, ?, ?)`, [req.originalUrl, data, req.headers, qs, new Date()], (err) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: String(err), error: err });
      }

      let doc = { status: 'success', message: 'ok' };
      if (process.env.NODE_ENV !== 'test') {
        console.log(`${req.method} ${req.originalUrl}`);
      }
      doc = this.emit(`request.${req.method.toLowerCase()}`, req, res, doc);
      doc = this.emit('request', req, res, doc);

      res.status(200).json(doc);
    });
  }

  /**
   * Start the server.
   *
   * @param {number} port The server number to start (or start on port number 3000)
   */
  async start(port = 3000) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      self.db = require('./db');
      await self.initDb();

      self.port = process.env.PORT || port;
      const server = self.app.listen(self.port, (err) => {
        if (err) {
          console.error(err, err.stack);
          reject(err);
          return;
        }
        console.log(`Listening on ${server.address().port}`);
        resolve(server);
        self.server = server;
      });
    })
  }

  /**
   * Stop the server.
   */
  async stop() {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        await self.server.close();
        await self.db.close();
        resolve();
      }
      catch (err) {
        reject(err);
      }
    });
  }

  emit(eventName, req, res, doc) {
    if (typeof this._events[eventName] !== 'undefined') {
      for (let i = 0, len = this._events[eventName].length; i < len; i += 1) {
        const returnValue = this._events[eventName][i].call(this, req, res, doc);
        if (returnValue) {
          doc = returnValue;
        }
      }
    }
    return doc;
  }

  on(eventName, callback) {
    if (typeof this._events[eventName] === 'undefined') {
      this._events[eventName] = [];
    }

    this._events[eventName].push(callback);
  }
}

module.exports = new Server();

if (require.main === module) {
  module.exports.start(3000)
    .then(() => {
      console.log('running');
    })
    .catch((err) => {
      console.error(err);
    });
}
