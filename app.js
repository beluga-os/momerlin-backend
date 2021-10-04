'use strict'
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3007;


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
        url:"http://52.66.200.27:3007/app"
      },
			{
				url: "http://localhost:3007/app",
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

app.use('/app', momerlin);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

app.listen(PORT, () => {
    console.log('Server started on port',PORT);
});


// pe = require('parse-error');//parses error so you can read error message and handle them accordingly

// //This is here to handle all the uncaught promise rejections
// process.on('unhandledRejection', error => {
//     // throw error;
//     console.error('Uncaught Error', pe(error));
// });