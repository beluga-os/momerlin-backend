require('dotenv').config();//instatiate environment variables

CONFIG = {} //Make this global to use all over the application

CONFIG.app          = process.env.APP   || 'development';
CONFIG.port         = process.env.PORT  || '3000';

CONFIG.db_dialect   = process.env.DB_DIALECT    || 'mongo';
CONFIG.db_host      = process.env.DB_HOST       || 'localhost';
CONFIG.db_port      = process.env.DB_PORT       || '27017';
CONFIG.db_name      = process.env.DB_NAME       || 'momerlin';
CONFIG.db_user      = process.env.DB_USER       || 'root';
CONFIG.db_password  = process.env.DB_PASSWORD   || '';

// CONFIG.db_uri  = process.env.MONGODB_URI   || 'mongodb+srv://root:root@cluster0-skis3.mongodb.net/test?retryWrites=true&w=majority';

CONFIG.db_uri  = process.env.MONGODB_URI   || 'localhost:27017/Momerlin';

CONFIG.email = process.env.EMAIL || "Your email goes here";

CONFIG.password = process.env.PASSWORD || "Your email's password goes here"

CONFIG.jwt_encryption= 'change this'
CONFIG.jwt_expiration= 100000