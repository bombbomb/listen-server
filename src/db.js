const connection = process.env.SQLITE_DB ? { filename: process.env.SQLITE_DB } : ':memory:';

const knex = require('knex')({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection
});

module.exports = knex;
