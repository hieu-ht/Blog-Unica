import { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT } from '../config/env-configs';
import * as mysql from 'mysql';

const dbConfig: mysql.ConnectionConfig = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  port: MYSQL_PORT,
};

export let mysqlDb = mysql.createConnection(dbConfig);

export const reconnect = () => {
  mysqlDb.destroy();
  mysqlDb = mysql.createConnection(dbConfig);
};
