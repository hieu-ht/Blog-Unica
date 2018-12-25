import * as dotEnvSafe from 'dotenv-safe';
import * as path from 'path';

// check process.env and load environment variables
(() => {
  if (process.env.NODE_ENV === 'production'
    || process.env.NODE_ENV === 'debug'
    || process.env.NODE_ENV === 'dev') {
    return;
  }
  // declare path of env file
  const envPath = path.join(__dirname, '../.env');

  // import .env variables from file .env.example by dotEnvSafe package
  dotEnvSafe.load({
    allowEmptyValues: true,
    path: envPath,
    sample: path.join(__dirname, '../.env.example'),
  });
})();

// import after import .env.example
import { SERVER_PORT, SECRET_KEY,
  MYSQL_DATABASE, MYSQL_HOST, MYSQL_PASSWORD, MYSQL_PORT, MYSQL_USER,
   BCRYPT_SALT } from './custom_modules/config/env-configs';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as session from 'express-session';
import * as http from 'http';
import * as cors from 'cors';
import * as morgan from 'morgan';
import * as socketio from 'socket.io';
import socketControl from './custom_modules/common/socketcontroller';

import { mysqlDb, reconnect } from './custom_modules/common/mysql';
import * as mysql from 'mysql';
import logger from './custom_modules/helpers/log/logger';
import ExceptionCode from './custom_modules/exceptions/ExceptionCode';
import Exception from './custom_modules/exceptions/Exception';
import router from './routes/routes';
import ERROR from './custom_modules/exceptions/ExceptionCode';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session config
app.set('trust proxy', 1);
app.use(session({
  secret:  SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  // allow write session without https
  cookie: { secure: false },
}));

app.set('views', 'views');
app.set('view engine', 'ejs');

app.use('/static', express.static('public'));

if (process.env.NODE_ENV !== 'test') {

  mysqlDb.connect((error) => {
    if (error) {
      logger.error(`Failed to connect mysql`);
      console.log(error);
    } else {
      logger.info(`Mysql connected`);
    }
  });
}

app.use(morgan('dev'));

app.use(async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Mysql Database state: ${mysqlDb.state}`);
  logger.info(`Mysql Database state: `);
  console.log(mysqlDb.config);
  if (mysqlDb.state  === 'disconnected' || mysqlDb.state === 'protocol_error') {
    logger.error(`Failed to connect mysql`);

    reconnect();

    // Reconnect if we can
    mysqlDb.connect((error) => {
      if (error) {
        logger.error(`Failed to connect mysql`);
        console.log(error);

        return next(new Exception('server error', 500));
      } else {
        logger.info(`Mysql connected`);
      }
    });
  }
  next();
});

app.use(router);

// Hanlde all error thrown from controller or other middlewares
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.code) {
    res.json({
      error_code: error.code,
      message: error.message,
    });
  } else {
    // res.json({
    //   error_code: ExceptionCode.SYSTEM_ERROR,
    //   message: 'server error!',
    // });
    res.json({
      error: error.toString(),
    });
  }
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.json({
    error_code: ExceptionCode.REQUEST_NOT_FOUND,
    message: 'request not found!',
  });
});

const port = SERVER_PORT;

server.listen(port, () => {
  logger.info(`Server is running at: http://localhost:${port}`);
  logger.info(`ENV: ${process.env.NODE_ENV}`);

  logger.info(`Server port: ${SERVER_PORT}`);
  logger.info(`Mysql host: ${MYSQL_HOST}`);
  logger.info(`Mysql port: ${MYSQL_PORT}`);
  logger.info(`Mysql user: ${MYSQL_USER}`);
  logger.info(`Mysql password: ${MYSQL_PASSWORD}`);
  logger.info(`Mysql database: ${MYSQL_DATABASE}`);
  logger.info(`Bcrypt salt: ${BCRYPT_SALT}`);
  logger.info(`Secret key: ${SECRET_KEY}`);
});

const io = socketio(server);
socketControl(io);

export default server;
