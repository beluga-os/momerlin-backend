

require('dotenv').config();

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const util = require('util');
const moment = require('moment');
const Users = require("../models/user.model")
const TransactionCategories = require("../models/transactionCategory.model")
const Influx = require('influx');
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'development';
const BigNumber = require('bignumber.js')
const { ReE, ReS, to } = require("../services/global.services");

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


// To Get a information of plaid link

const getApiInfo = async function (req, res) {
  return res.json({
    item_id: ITEM_ID,
    access_token: ACCESS_TOKEN,
    products: PLAID_PRODUCTS,
  });
}

module.exports.getApiInfo = getApiInfo


// Create a link token with configs which we can then use to initialize Plaid Link client-side.

const createLinkToken = async function (request, response) {
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
    // prettyPrintResponse(createTokenResponse);
    response.json(createTokenResponse.data);
  } catch (error) {
    console.log("CHECKING ERROR....", error, process.env.PLAID_CLIENT_ID);
    // prettyPrintResponse(error.response);
    return response.json(error.response);
  }
}

module.exports.createLinkToken = createLinkToken


// Create a link token with configs which we can then use to initialize Plaid Link client-side.

const createPaymentLinkToken = async function (request, response, next) {
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
}

module.exports.createPaymentLinkToken = createPaymentLinkToken

// Exchange token flow - exchange a Link public_token for
// an API access_token

const setAccessToken = async function (request, response, next) {
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
}

module.exports.setAccessToken = setAccessToken

// Retrieve ACH or ETF Auth data for an Item's accounts

const getAuth = async function (request, response, next) {
  try {
    const authResponse = await client.authGet({ access_token: ACCESS_TOKEN });
    prettyPrintResponse(authResponse);
    response.json(authResponse.data);
  } catch (error) {
    prettyPrintResponse(error.response);
    return response.json(formatError(error.response));
  }
}

module.exports.getAuth = getAuth

// Retrieve Transactions for an Item

const getTransactions = async function (request, response, next) {
  // Pull transactions for the Item for the last 30 days
  const address = request.query.address
  const startDate = moment().subtract(90, 'days').format('YYYY-MM-DD');
  const endDate = moment().format('YYYY-MM-DD');
  const configs = {
    access_token: ACCESS_TOKEN,
    start_date: startDate,
    end_date: endDate
  };

  let gwei = 0, eth = 0

  console.log("Checking address...", address);
  try {
    let result

    result = await client.transactionsGet(configs);

    let transactions
    transactions = result.data.transactions;

    let recent = []
    try {
      recent = await influxClient.query(`select * from transactions
        where address = ${Influx.escape.stringLit(request.query.address)}
        order by time desc`)
    } catch (error) {
      console.log("Error while retrieving from db..", error);
    }
    // Preparing rows to insert into influxDB
    let rows = []

    transactions.map((t) => {

      let sat = (Math.ceil(t.amount) - t.amount) * 100

      let time = moment(t.date).utc().valueOf()

      gwei = new BigNumber(String(parseInt(sat))).plus(new BigNumber(gwei)).toString()

      // eth = new BigNumber(new BigNumber(String(parseInt(sat * 100)))).div(new BigNumber('1000000000000000000'), 10).plus(new BigNumber(eth)).toString(10)

      if (t.merchant_name !== null) {
        recent.length < 1 ? rows.push({
          measurement: 'transactions',
          tags: {
            name: t.name.replace(/[^a-zA-Z- ]/g, ""),
            amount: t.amount,
            address: request.query.address,
            category:t.category[0].toString(),
            iso_currency_code: t.iso_currency_code,
            createdAt: moment(t.date).utc().valueOf()
          },
          fields: {
            sats: sat,
            merchant_name: t.merchant_name.replace(/[^a-zA-Z- ]/g, "")
          },
          timestamp: time * 1000,
        }) :
          (recent.length > 0 && time > parseInt(recent[0].createdAt)) &&
          rows.push({
            measurement: 'transactions',
            tags: {
              name: t.name.replace(/[^a-zA-Z- ]/g, ""),
              amount: t.amount,
              address: address,
              category:t.category[0].toString(),
              iso_currency_code: t.iso_currency_code,
              createdAt: moment(t.date).utc().valueOf()
            },
            fields: {
              sats: sat,
              merchant_name: t.merchant_name.replace(/[^a-zA-Z- ]/g, "")
            },
            timestamp: time * 1000,
          })
      }
    });

    // Inserting into influxDB
    try {
      await influxClient.writePoints(rows)
        .catch(err => {
          console.error(`Error saving data to InfluxDB! ${err}`)
        });
    } catch (error) {
      console.log("Checking db error....", error);
    }



    let err, user

    [err, user] = await to(Users.findOne({ ethAddress: address }))

    if (err) {
      return ReE(response, { err }, 400)
    }

    else {
      if (user) {
        user.gwei = new BigNumber(user.gwei).plus(new BigNumber(gwei)).toString()
        // user.eth = new BigNumber(user.eth).plus(new BigNumber(eth)).toString(10)

        let err, updateUser

        [err, updateUser] = await to(user.save())

        if (err) {
          return ReE(response, { err }, 400)
        }

        return ReS(response, { message: "Points added.", success: true, user: user }, 200)
      }

      else {
        console.log("Transactions..",transactions);
        return ReE(response, { message: "Could not find the user.", success: false }, 400)
      }
    }


  }

  catch (error) {
    prettyPrintResponse(error.response);
    // console.log("Get transaction error....", error);
    return response.json(formatError(error));
  }
}

module.exports.getTransactions = getTransactions

// Retrieve Transactions from influxDB

const getUsers = async function (req, res) {

  let err, users

  [err, users] = await to(Users.find());

  if (err) {
    return ReE(res, { err }, 400)
  }
  else {
    if (users.length > 0) {
      return ReS(res, { message: "Users are:", success: true, users: users }, 200)
    }
    else {
      return ReE(res, { message: "No records found...", success: false }, 400)
    }
  }
}

module.exports.getUsers = getUsers

// Create user

const createUser = async function (req, res) {

  const reqUser = req.body

  var password = Math.random().toString(36).slice(-8);//securePin.generatePinSync(6);

  reqUser.password = password

  if (typeof reqUser.ethAddress === 'undefined' || reqUser.ethAddress === '') {
    return ReE(res, { message: 'Please enter ethAddress', "success": false, user: '' }, 400)
  }

  if (typeof reqUser.fullName === 'undefined' || reqUser.fullName === '') {
    return ReE(res, { message: 'Please enter nickname', "success": false, user: '' }, 400)
  }

  else {

    [err, user] = await to(Users.create(reqUser));
    if (err) {
      return ReE(res, { err }, 400)
    } else {
      if (user != null) {
        return ReS(res, { message: 'User has been registered', "success": true, user: user, otp: password, "token": user.getJWT() }, 200)
      }
      else {
        return ReE(res, { message: "Sorry unable to create this User request. Try after sometime." }, 400)
      }
    }
  }

}

module.exports.createUser = createUser

// Get a api info

const getUser = async function (req, res) {
  let user, err


  [err, user] = await to(Users.findOne({ ethAddress: req.query.id }))

  if (err) {
    return ReE(res, err, 400)
  }
  else {
    return ReS(res, { message: "This user information is", user: user, success: true }, 200)
  }
}

module.exports.getUser = getUser

// Check available nickName

const checkUserName = async function (req, res) {
  let user, err

  [err, user] = await to(Users.find({ fullName: new RegExp( `^${req.params.name}` ,'i') }))
  if (err) {
    return ReE(res, err, 400)
  }
  else {
    return ReS(res, { message: "User availability is", available: user.length > 0, success: true }, 200)
  }
}

module.exports.checkUserName = checkUserName

//   Update Challenge

const updateUser = async function (req, res) {
  let err, user

  [err, user] = await to(Users.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }))

  if (err) {

    return ReE(res, { err, success: false }, 400)
  }

  else {

    return ReS(res, { message: "user updated", user: user, success: true }, 200)
  }
}

module.exports.updateUser = updateUser

//   Delete Challenge

const deleteUser = async function (req, res) {
  let err, user, id, body
  id = req.query.id
  body = req.body
  [err, user] = await to(Users.findByIdAndUpdate(id, { $set: { active: false } }, { new: true }))

  if (err) {
    return ReE(res, { message: "Error on retrieving user", err, success: false }, 400)
  }

  else {
    return ReS(res, { message: "User deleted", user: user, success: true }, 200)
  }
}

module.exports.deleteUser = deleteUser

// Retrieve transactions from influxdb

const getMomerlinTransactions = async function (request, response) {

  let address, limit, offset

  address = request.query.address ? request.query.address : ''

  limit = request.query.limit || 10

  offset = request.query.page ? (request.query.page > 1 ? ((request.query.page - 1) * limit) : 0) : 0

  try {
    let query

    query = `select * from transactions
      where address = ${Influx.escape.stringLit(address)}
      order by time desc
      limit ${limit}
      offset ${offset}`

    await influxClient.query(query).then(result => {
      return ReS(response, { message: "Transactions list is", success: true, transactions: result }, 200)
    }).catch(err => {
      response.status(500).send(err.stack)
    })

  } catch (err) {
    console.log(`Error while processing ${err}`);
  }
}

module.exports.getMomerlinTransactions = getMomerlinTransactions

// Retrieve expenses

const getExpenses = async function (request, response) {

  let address, limit, offset

  address = request.query.address ? request.query.address : ''

  limit = request.query.limit || 10

  offset = request.query.page ? (request.query.page > 1 ? ((request.query.page - 1) * limit) : 0) : 0

  try {
    let query

    query = `select * from transactions
      where address = ${Influx.escape.stringLit(address)}
      group by category
      order by time desc
      limit ${limit}
      offset ${offset}`

    await influxClient.query(query).then(result => {
      return ReS(response, { message: "Expenses are", success: true, transactions: result }, 200)
    }).catch(err => {
      response.status(500).send(err.stack)
    })

  } catch (err) {
    console.log(`Error while processing ${err}`);
  }
}

module.exports.getExpenses = getExpenses

// Retrieve Investment Transactions for an Item

const getInvestmentTransactions = async function (request, response, next) {
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
}

module.exports.getInvestmentTransactions = getInvestmentTransactions

// Retrieve Identity for an Item

const getIdentity = async function (request, response, next) {
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
}

module.exports.getIdentity = getIdentity

// Retrieve real-time Balances for each of an Item's accounts

const getBalance = async function (request, response, next) {
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
}

module.exports.getBalance = getBalance

// Retrieve Holdings for an Item

const getHoldings = async function (request, response, next) {
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
}

module.exports.getHoldings = getHoldings

// Retrieve information about an Item

const getItem = async function (request, response, next) {
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
}

module.exports.getItem = getItem

// Retrieve an Item's accounts

const getItemAccount = async function (request, response, next) {
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
}

module.exports.getItemAccount = getItemAccount

// Create and then retrieve an Asset Report for one or more Items. Note that an
// Asset Report can contain up to 100 items, but for simplicity we're only
// including one Item here.

const getItemAssets = async function (request, response, next) {
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
}

module.exports.getItemAssets = getItemAssets

// This functionality is only relevant for the UK Payment Initiation product.
// Retrieve Payment for a specified Payment ID

const getPayment = async function (request, response, next) {
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
}

module.exports.getPayment = getPayment

const addCategory = async function (req,res) {
  
  let err,body,category

  body = req.body

  console.log("Checking body...",body);
  
  [err,category] = await to (TransactionCategories.create(body))

  if(err){
    return ReE(res,{err},400)
  }

  else{
    return ReS(res,{message:"Category is created.",success:true,category:category},200)
  }
}

module.exports.addCategory = addCategory

const deActivateCategory = async function (req,res) {
  
  let err,category,id

  id = req.params.id

  console.log("Checking id...",id);

  [err, category] = await to(TransactionCategories.findByIdAndUpdate(id, { $set: { active: false } }, { new: true }))

  if(err){
    return ReE(res,{err},400)
  }

  else{
    return ReS(res,{message:"Category removed successfully",success:true},200)
  }
}

module.exports.deActivateCategory = deActivateCategory

const getTransactionsByCategory = async function (req,res) {
  
  let categoryName,query,address

  categoryName = req.params.category
  address = req.query.address

  query = `SELECT * FROM transactions 
  where address = ${Influx.escape.stringLit(address)} and category = ${Influx.escape.stringLit(categoryName)}`

  try {
    await influxClient.query(query).then(async (result) => {
      let err,category

      [err,category] = await to (TransactionCategories.findOne({name:categoryName}))
      if(err){
        return ReE(res,{err},400)
      }

      if(result.length > 0){

        await result.map((transaction,index)=>{
          result[index].category = category
        })
      }
      return ReS(res,{message:`Transactions of ${categoryName} category is..`,success:true,transactions:result},200)
      
    })
  } catch (error) {
    return ReE(res,{error},400)
  }
  
}

module.exports.getTransactionsByCategory = getTransactionsByCategory

const mySpendings = async function (req, res) {

  let address,total,categories,startDate,endDate,spendings = [],categoryWiseQuery,totalQuery

  address = req.params.address

  startDate = (req.query.startDate !== undefined && req.query.startDate !== null) ? moment(req.query.startDate).valueOf() * 1000 : null;
  
  endDate = (req.query.endDate !== undefined && req.query.endDate !== null) ? moment(req.query.endDate).valueOf() * 1000 : null;

  totalQuery =  (startDate !== null && endDate !== null) ? `SELECT sum("sats") AS "amount",count("merchant_name") as "total_transactions" FROM transactions where address = ${Influx.escape.stringLit(address)} and time >= ${startDate} and time <= ${endDate} GROUP BY category` : `SELECT sum("sats") AS "amount",count("merchant_name") as "total_transactions" FROM transactions where address = ${Influx.escape.stringLit(address)}`
  
  categoryWiseQuery = (startDate !== null && endDate !== null) ? `SELECT sum("sats") AS "amount",count("merchant_name") as "total_transactions" FROM "transactions" WHERE address = ${Influx.escape.stringLit(address)} and time >= ${startDate} and time <= ${endDate} GROUP BY category` : `SELECT sum("sats") AS "amount",count("merchant_name") as "total_transactions" FROM "transactions" WHERE address = ${Influx.escape.stringLit(address)} GROUP BY category`

  console.log("Checking address..",address,startDate,endDate,req.query);

  try {
    await influxClient.query(totalQuery).then(async (result) => {
      total = result
      
      if (result.length > 0) {
        total_transactions = total[0].total_transactions

        try {
          await influxClient.query(categoryWiseQuery).then(async result => {
            categories = result
            let count = categories.length - 1;
            if (categories && categories.length > 0) {
              await categories.map(async (data) => {

                let err, category

                console.log("Checking params...", data.category);
                [err, category] = await to(TransactionCategories.findOne({ name: data.category, active: true }))

                if (err) {
                  return console.log("Error while matching category", err);
                }

                else {

                  if (category !== null && category !== {}) {

                    if (count === spendings.length) {
                      spendings.push({
                        category: category,
                        transactionsCount: data.total_transactions,
                        percentage: (parseFloat(data.total_transactions) / parseFloat(total_transactions)) * 100,
                        amount: data.amount
                      })

                      return ReS(res, { message: "Spending reports are...", success: true, spendings: spendings }, 200)
                    }
                    else {

                      spendings.push({
                        category: category,
                        transactionsCount: data.total_transactions,
                        percentage: (parseFloat(data.total_transactions) / parseFloat(total_transactions)) * 100,
                        amount: data.amount
                      })
                    }
                  }

                  else {
                    let err, body, newCategory

                    body = {
                      displayName: data.category,
                      name: data.category,
                      color: "#FF9BB3",
                      image: data.category[0]
                    }

                    [err, newCategory] = await to(TransactionCategories.create(body))

                    if (err) {
                      throw Error({ err })
                    }

                    else {
                      return spendings.push({
                        category: newCategory,
                        transactionsCount: data.total_transactions,
                        percentage: (parseFloat(data.amount) / parseFloat(total[0].amount)) * 100,
                        amount: data.amount
                      })
                    }
                  }
                }
              })

            }

            else {
              return ReE(res, { message: "Transactions not found for this category.Please connect your bank and try again.", success: false }, 400)
            }

          })
        } catch (error) {
          console.log(`Error while processing ${error}`);
        }
      }

      else {
        return ReE(res, { message: "Transactions not found for this user.Please connect your bank and try again.", success: false }, 400)
      }
    }).catch(err => {
      console.log("Checking issue...",err);
      return ReE(res, { err }, 400)
    })

  } catch (err) {
    return ReE(res, { err }, 400)
  }

}

module.exports.mySpendings = mySpendings

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
