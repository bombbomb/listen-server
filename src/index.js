const bodyParser = require('body-parser');
const httpMethods = ['POST', 'GET', 'PUT', 'OPTIONS', 'DELETE'];

class Server {
  constructor() {
    this.app = require('express')();
    this.server = null;
    this.init();
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
        this.db.run(`CREATE TABLE ${tableName} (url TEXT, data TEXT, headers TEXT, queryString TEXT)`, (err) => {
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
      this.app.get(`/_/${endpoint}`, (req, res) => {
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
      });
    });

    // catch "all" route
    this.app.all(/^[^_]/, async (req, res) => {
      if (httpMethods.indexOf(req.method) < 0) {
        return res.status(200).json({ status: 'success', message: 'Invalid HTTP method, ignoring' });
      }

      const tableName = this.getTableName(req.method);
      const data = (req.body) ? JSON.stringify(req.body) : {};
      const qs = (req.query) ? JSON.stringify(req.query) : {};
      this.db.run(`INSERT INTO ${tableName} VALUES(?, ?, ?, ?)`, [req.originalUrl, data, req.headers, qs], (err) => {
        if (err) {
          return res.status(500).json({ status: 'error', message: String(err), error: err });
        }
        res.status(200).json({ status: 'success', message: 'ok' });
      });
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
}

module.exports = new Server();

if (!process.env.NODE_ENV || process.env.NODE_ENV != 'test') {
  module.exports.start(3000)
    .then(() => {
      console.log('running');
    })
    .catch((err) => {
      console.error(err);
    });
}
