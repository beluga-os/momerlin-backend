// read env vars from .env file
require('dotenv').config();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const util = require('util');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');

const Influx = require('influx');
const APP_PORT = process.env.APP_PORT || 8000;
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

const influxClient = new Influx.InfluxDB({
  database: 'momerlin',
  host: 'localhost',
  port: 8086,
  username: process.env.UNAME,
  password: process.env.PASSWORD,
});

// PLAID_PRODUCTS is a comma-separated list of products to use when initializing
// Link. Note that this list must contain 'assets' in order for the app to be
// able to create and retrieve asset reports.
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || 'transactions').split(
  ',',
);

// PLAID_COUNTRY_CODES is a comma-separated list of countries for which users
// will be able to select institutions from.
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(
  ',',
);

// Parameters used for the OAuth redirect Link flow.
//
// Set PLAID_REDIRECT_URI to 'http://localhost:3000'
// The OAuth redirect flow requires an endpoint on the developer's website
// that the bank website should redirect to. You will need to configure
// this redirect URI for your client ID through the Plaid developer dashboard
// at https://dashboard.plaid.com/team/api.
const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || '';

// Parameter used for OAuth in Android. This should be the package name of your app,
// e.g. com.plaid.linksample
const PLAID_ANDROID_PACKAGE_NAME = process.env.PLAID_ANDROID_PACKAGE_NAME || '';

// We store the access_token in memory - in production, store it in a secure
// persistent data store
let ACCESS_TOKEN = null;
let PUBLIC_TOKEN = null;
let ITEM_ID = null;
// The payment_id is only relevant for the UK Payment Initiation product.
// We store the payment_id in memory - in production, store it in a secure
// persistent data store
let PAYMENT_ID = null;

// Initialize the Plaid client
// Find your API keys in the Dashboard (https://dashboard.plaid.com/account/keys)

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const client = new PlaidApi(configuration);

const app = express();
app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);
app.use(bodyParser.json());

app.use(cors());

app.post('/api/info', function (request, response, next) {
  response.json({
    item_id: ITEM_ID,
    access_token: ACCESS_TOKEN,
    products: PLAID_PRODUCTS,
  });
});

// Create a link token with configs which we can then use to initialize Plaid Link client-side.
// See https://plaid.com/docs/#create-link-token
app.post('/api/create_link_token', async function (request, response) {
  const configs = {
    user: {
      // This should correspond to a unique id for the current user.
      client_user_id: 'user-id',
    },
    client_name: 'Momerlin',
    products: PLAID_PRODUCTS,
    country_codes: PLAID_COUNTRY_CODES,
    language: 'en',
  };

  if (PLAID_REDIRECT_URI !== '') {
    configs.redirect_uri = PLAID_REDIRECT_URI;
  }

  if (PLAID_ANDROID_PACKAGE_NAME !== '') {
    configs.android_package_name = PLAID_ANDROID_PACKAGE_NAME;
  }
  try {
    const createTokenResponse = await client.linkTokenCreate(configs);
    prettyPrintResponse(createTokenResponse);
    response.json(createTokenResponse.data);
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Create a link token with configs which we can then use to initialize Plaid Link client-side.
// See https://plaid.com/docs/#payment-initiation-create-link-token-request
app.post(
  '/api/create_link_token_for_payment',
  async function (request, response, next) {
    try {
      const createRecipientResponse = await client.paymentInitiationRecipientCreate(
        {
          name: 'Harry Potter',
          iban: 'GB33BUKB20201555555555',
          address: {
            street: ['4 Privet Drive'],
            city: 'Little Whinging',
            postal_code: '11111',
            country: 'GB',
          },
        },
      );
      const recipientId = createRecipientResponse.data.recipient_id;
      prettyPrintResponse(createRecipientResponse);

      const createPaymentResponse = await client.paymentInitiationPaymentCreate(
        {
          recipient_id: recipientId,
          reference: 'paymentRef',
          amount: {
            value: 12.34,
            currency: 'GBP',
          },
        },
      );
      prettyPrintResponse(createPaymentResponse);
      const paymentId = createPaymentResponse.data.payment_id;
      PAYMENT_ID = paymentId;
      const configs = {
        user: {
          // This should correspond to a unique id for the current user.
          client_user_id: 'user-id',
        },
        client_name: 'Plaid Quickstart',
        products: PLAID_PRODUCTS,
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
        payment_initiation: {
          payment_id: paymentId,
        },
      };
      if (PLAID_REDIRECT_URI !== '') {
        configs.redirect_uri = PLAID_REDIRECT_URI;
      }
      const createTokenResponse = await client.linkTokenCreate(configs);
      prettyPrintResponse(createTokenResponse);
      response.json(createTokenResponse.data);
    } catch (error) {
      prettyPrintResponse(error.response);
      return response.json(formatError(error.response));
    }
  },
);

// Exchange token flow - exchange a Link public_token for
// an API access_token
// https://plaid.com/docs/#exchange-token-flow
app.post('/api/set_access_token', async function (request, response, next) {
  PUBLIC_TOKEN = request.body.public_token;
  try {
    const tokenResponse = await client.itemPublicTokenExchange({
      public_token: PUBLIC_TOKEN,
    });
    prettyPrintResponse(tokenResponse);
    ACCESS_TOKEN = tokenResponse.data.access_token;
    ITEM_ID = tokenResponse.data.item_id;
    response.json({
      access_token: ACCESS_TOKEN,
      item_id: ITEM_ID,
      error: null,
    });
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Retrieve ACH or ETF Auth data for an Item's accounts
// https://plaid.com/docs/#auth
app.get('/api/auth', async function (request, response, next) {
  try {
    const authResponse = await client.authGet({ access_token: ACCESS_TOKEN });
    prettyPrintResponse(authResponse);
    response.json(authResponse.data);
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Retrieve Transactions for an Item
// https://plaid.com/docs/#transactions
app.get('/api/transactions', async function (request, response, next) {
  // Pull transactions for the Item for the last 30 days
  const startDate = moment().subtract(90, 'days').format('YYYY-MM-DD');
  const endDate = moment().format('YYYY-MM-DD');
  const configs = {
    access_token: ACCESS_TOKEN,
    start_date: startDate,
    end_date: endDate
  };
  let paginatedResponse
  try {
    const result = await client.transactionsGet(configs);
    let transactions = result.data.transactions;
    const total_transactions = result.data.total_transactions;

    // Manipulate the offset parameter to paginate

    // transactions and retrieve all available data

    while (transactions.length < total_transactions) {
      const paginatedRequest = {
        access_token: ACCESS_TOKEN,
        start_date: startDate,
        end_date: endDate,
        options: {
          offset: transactions.length,
        },
      };
      paginatedResponse = await client.transactionsGet(paginatedRequest);
      transactions = transactions.concat(
        paginatedResponse.data.transactions,
      );
    }
    let recent
    try {
      recent = await influxClient.query(`select * from transactions order by time desc limit 1`)
    } catch (error) {
     console.log("Error while retrieving from db..",error); 
    }
    // Preparing rows to insert into influxDB
    let rows = []
    transactions.map((t) => {
      let sat = Math.ceil(t.amount) - t.amount
        let time = moment(t.date).utc().valueOf()
      if (t.merchant_name !== null && time > parseInt(recent[0].createdAt)) {
        rows.push({
          measurement: 'transactions',
          tags: {
            name: t.name.replace(/[^a-zA-Z- ]/g, ""),
            amount: t.amount,
            iso_currency_code: t.iso_currency_code,
            sats: sat,
            createdAt:moment(t.date).utc().valueOf()
          },
          fields: {
            merchant_name: t.merchant_name.replace(/[^a-zA-Z- ]/g, "")
          },
          timestamp: time,
        })
      }
    });

    // Inserting into influxDB
    try {
      await influxClient.writePoints(rows)
        .catch(err => {
          console.error(`Error saving data to InfluxDB! ${err.stack}`)
        });
    } catch (error) {
      console.log("Checking db error....",error.message);
    }
   
    response.json(result.data);
    // return console.log('Data stored successfully!');

  }

  catch (error) {
    // prettyPrintResponse(error.response);
    console.log("Get transaction error....", error.message);
    return response.json(formatError(error));
  }
});

// Retrieve Transactions from influxDB

app.get( '/api/momerlin/transactions',
async function(request,response,next){
  let limit = request.query.limit || 10
  try {
    const results = await influxClient.query(`
    select * from transactions order by time desc limit ${limit}
  `);
  
    return response.json(results)
  } catch (err) {
    console.log(`Error while processing ${err}`);
  }
})

// Retrieve Investment Transactions for an Item

// https://plaid.com/docs/#investments
app.get(
  '/api/investment_transactions',
  async function (request, response, next) {
    const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const endDate = moment().format('YYYY-MM-DD');
    const configs = {
      access_token: ACCESS_TOKEN,
      start_date: startDate,
      end_date: endDate,
    };
    try {
      const investmentTransactionsResponse = await client.investmentTransactionsGet(
        configs,
      );
      prettyPrintResponse(investmentTransactionsResponse);
      response.json({
        error: null,
        investment_transactions: investmentTransactionsResponse.data,
      });
    } catch (error) {
      prettyPrintResponse(error.response);
      return response.json(formatError(error.response));
    }
  },
);

// Retrieve Identity for an Item
// https://plaid.com/docs/#identity
app.get('/api/identity', async function (request, response, next) {
  try {
    const identityResponse = await client.identityGet({
      access_token: ACCESS_TOKEN,
    });
    prettyPrintResponse(identityResponse);
    response.json({ identity: identityResponse.data.accounts });
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Retrieve real-time Balances for each of an Item's accounts
// https://plaid.com/docs/#balance
app.get('/api/balance', async function (request, response, next) {
  try {
    const balanceResponse = await client.accountsBalanceGet({
      access_token: ACCESS_TOKEN,
    });
    prettyPrintResponse(balanceResponse);
    response.json(balanceResponse.data);
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Retrieve Holdings for an Item
// https://plaid.com/docs/#investments
app.get('/api/holdings', async function (request, response, next) {
  try {
    const holdingsResponse = await client.investmentsHoldingsGet({
      access_token: ACCESS_TOKEN,
    });
    prettyPrintResponse(holdingsResponse);
    response.json({ error: null, holdings: holdingsResponse.data });
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Retrieve information about an Item
// https://plaid.com/docs/#retrieve-item
app.get('/api/item', async function (request, response, next) {
  try {
    // Pull the Item - this includes information about available products,
    // billed products, webhook information, and more.
    const itemResponse = await client.itemGet({ access_token: ACCESS_TOKEN });
    // Also pull information about the institution
    const configs = {
      institution_id: itemResponse.data.item.institution_id,
      country_codes: ['US'],
    };
    const instResponse = await client.institutionsGetById(configs);
    prettyPrintResponse(itemResponse);
    response.json({
      item: itemResponse.data.item,
      institution: instResponse.data.institution,
    });
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Retrieve an Item's accounts
// https://plaid.com/docs/#accounts
app.get('/api/accounts', async function (request, response, next) {
  try {
    const accountsResponse = await client.accountsGet({
      access_token: ACCESS_TOKEN,
    });
    prettyPrintResponse(accountsResponse);
    response.json(accountsResponse.data);
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// Create and then retrieve an Asset Report for one or more Items. Note that an
// Asset Report can contain up to 100 items, but for simplicity we're only
// including one Item here.
// https://plaid.com/docs/#assets
app.get('/api/assets', async function (request, response, next) {
  // You can specify up to two years of transaction history for an Asset
  // Report.
  const daysRequested = 10;

  // The `options` object allows you to specify a webhook for Asset Report
  // generation, as well as information that you want included in the Asset
  // Report. All fields are optional.
  const options = {
    client_report_id: 'Custom Report ID #123',
    // webhook: 'https://your-domain.tld/plaid-webhook',
    user: {
      client_user_id: 'Custom User ID #456',
      first_name: 'Alice',
      middle_name: 'Bobcat',
      last_name: 'Cranberry',
      ssn: '123-45-6789',
      phone_number: '555-123-4567',
      email: 'alice@example.com',
    },
  };
  const configs = {
    access_tokens: [ACCESS_TOKEN],
    days_requested: daysRequested,
    options,
  };
  try {
    const assetReportCreateResponse = await client.assetReportCreate(configs);
    prettyPrintResponse(assetReportCreateResponse);
    const assetReportToken = assetReportCreateResponse.data.asset_report_token;
    const getResponse = await getAssetReportWithRetries(
      client,
      assetReportToken,
    );
    const pdfRequest = {
      asset_report_token: assetReportToken,
    };

    const pdfResponse = await client.assetReportPdfGet(pdfRequest, {
      responseType: 'arraybuffer',
    });
    prettyPrintResponse(getResponse);
    prettyPrintResponse(pdfResponse);
    response.json({
      json: getResponse.data.report,
      pdf: pdfResponse.data.toString('base64'),
    });
  } catch {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

// This functionality is only relevant for the UK Payment Initiation product.
// Retrieve Payment for a specified Payment ID
app.get('/api/payment', async function (request, response, next) {
  try {
    const paymentGetResponse = await client.paymentInitiationPaymentGet({
      payment_id: PAYMENT_ID,
    });
    prettyPrintResponse(paymentGetResponse);
    response.json({ error: null, payment: paymentGetResponse.data });
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
});

const server = app.listen(APP_PORT, function () {
  console.log('plaid-quickstart server listening on port ' + APP_PORT);
});

const prettyPrintResponse = (response) => {
  console.log(util.inspect(response.data, { colors: true, depth: 4 }));
};

// This is a helper function to poll for the completion of an Asset Report and
// then send it in the response to the client. Alternatively, you can provide a
// webhook in the `options` object in your `/asset_report/create` request to be
// notified when the Asset Report is finished being generated.

const getAssetReportWithRetries = (
  plaidClient,
  asset_report_token,
  ms = 1000,
  retriesLeft = 20,
) =>
  new Promise((resolve, reject) => {
    const request = {
      asset_report_token,
    };

    plaidClient
      .assetReportGet(request)
      .then((response) => {
        return resolve(response);
      })
      .catch(() => {
        setTimeout(() => {
          if (retriesLeft === 1) {
            return reject('Ran out of retries while polling for asset report');
          }
          getAssetReportWithRetries(
            plaidClient,
            asset_report_token,
            ms,
            retriesLeft - 1,
          ).then((response) => resolve(response));
        }, ms);
      });
  });

const formatError = (error) => {
  return {
    error: { ...error.data, status_code: error.status },
  };
};
