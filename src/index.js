const bodyParser = require('body-parser');
const moment = require('moment');

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

    this.options = {
      log: process.env.NODE_ENV !== 'test'
    };
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
        this.db.schema.createTable(tableName, (table) => {
          table.text('url');
          table.text('data');
          table.text('headers');
          table.text('queryString');
          table.integer('timestamp');
        })
          .then(resolve)
          .catch(reject);
      }));
    });

    return Promise.all(promises);
  }

  /**
   * Initialize the express app side of things
   */
  init() {
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());

    // data inspection routes
    httpMethods.forEach((method) => {
      const endpoint = method.toLowerCase();
      this.app.get(`/_/${endpoint}`, this.lookup(endpoint).bind(this));
    });

    // allow users to delete all messages
    this.app.delete('/_', (req, res) => {
      const promises = [];
      httpMethods.forEach((method) => {
        promises.push(this.db(`http_${method}`).delete());
      });
      Promise.all(promises)
        .then(() => {
          res.status(200).json({ status: 'success', message: 'All requests cleared'});
        });
    });

    httpMethods.forEach((method) => {
      this.app.delete(`/_/${method}`, (req, res) => {
        this.db(`http_${method}`).delete()
          .then(() => {
            res.status(200).json({ status: 'success', message: 'All requests cleared' });
          });
      });
    });

    this.app.get('/_/health-check', (req, res) => {
      res.status(200).json({ status: 'success', message: 'Hi' });
    });

    // catch "all" route (except, routes like /_)
    this.app.all(/^[^_]/, this.catchall.bind(this));
  }

  buildLookupQuery(endpoint, req) {
    return this.db(`http_${endpoint}`).select()
      .where(function() {
        if (req.query.path) {
          this.where('url', req.query.path);
        }

        if (req.query.before) {
          try {
            const d = moment(req.query.before);
            this.where('timestamp', '<', d.format('x'));
          }
          catch (err) {
            throw new Error(`Invalid date: ${req.query.before}`);
          }
        }

        if (req.query.after) {
          try {
            const d = moment(req.query.after);
            this.where('timestamp', '>', d.format('x'));
          }
          catch (err) {
            throw new Error(`Invalid date: ${req.query.after}`);
          }
        }
      });
  }

  /**
   * The lookup handler.
   *
   * @param {string} endpoint Endpoint param
   */
  lookup(endpoint) {
    return (req, res) => {
      this.buildLookupQuery(endpoint, req)
        .then((rows) => {

          const data = {
            status: 'success',
            message: 'ok',
            count: 0,
            items: []
          };
          rows.forEach((row) => {
            const item = Object.assign({}, row, { data: JSON.parse(row.data) });
            data.items.push(item);
            data.count += 1;
          });

          res.status(200).json(data);
        })
        .catch((err) => {
          res.status(500).json({ status: 'error', message: err.message });
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
    this.db(tableName).insert({ url: req.originalUrl, data, headers: req.headers, queryString: qs, timestamp: moment().format('x')})
      .then(() => {
        let doc = { status: 'success', message: 'ok' };
        if (this.options.log) {
          console.log(`${req.ip} ${new Date().toISOString()} ${req.method} ${req.originalUrl}`, { body: req.body, headers: req.headers });
        }
        doc = this.emit(`request.${req.method.toLowerCase()}`, req, res, doc);
        if (doc) {
          doc = this.emit('request', req, res, doc);
        }

        if (doc) {
          res.status(200).json(doc);
        }
      })
      .catch((err) => {
        return res.status(500).json({ status: 'error', message: String(err), error: err });
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
    });
  }

  /**
   * Stop the server.
   */
  async stop() {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        await self.db.destroy();
        self.server.close(() => {
          self.server.unref();
          resolve();
        });
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
        doc = returnValue;

        if (doc === false) {
          break;
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

  removeEventHandlers() {
    this._events = [];
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
