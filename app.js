'use strict'
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 8000;

const config = require('./config/config');

const models = require("./models");

app.use(cors());

const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");

app.use(express.static(path.join(__dirname, 'public')));

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Library API",
			version: "1.0.0",
			description: "A simple Express Library API",
		},
		servers: [
      {
        url:"http://52.66.200.27:8000/api"
      },
			{
				url: "http://localhost:8000/api",
			}
		],
	},
	apis: ["./routes/*.js"],
};

const specs = swaggerJsDoc(options);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    return res.json({
        message: "This is node.js role based authentication system"
    });
});


const momerlin = require('./routes/momerlin');

app.use('/api', momerlin);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));



const https = require('https')
const fs = require('fs')
if (fs.existsSync('/etc/letsencrypt/live/api.momerlin.com//privkey.pem')) {
    server = https.createServer({
        key: fs.readFileSync('/etc/letsencrypt/live/api.momerlin.com//privkey.pem', 'utf8'),
        cert: fs.readFileSync('/etc/letsencrypt/live/api.momerlin.com//fullchain.pem', 'utf8')
    }, app).listen(PORT, () => {
        console.log('Listening... ', PORT)
    })
}
else {
    app.listen(PORT, () => {
        console.log('Server started on port', PORT);
    });
}


// app.listen(PORT, () => {
//     console.log('Server started on port',PORT);
// });


// pe = require('parse-error');//parses error so you can read error message and handle them accordingly

// //This is here to handle all the uncaught promise rejections
// process.on('unhandledRejection', error => {
//     // throw error;
//     console.error('Uncaught Error', pe(error));
// });