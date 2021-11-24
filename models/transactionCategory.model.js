const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { to, TE } = require('../services/global.services')
const mongoosePaginate = require('mongoose-paginate-v2')
const Schema = mongoose.Schema;

const TransactionCategorySchema = new mongoose.Schema({
    displayName: {
        type:String
    },
    name: {
        type:String
    },
    color: {
        type:String
    },
    image: {
        type:String
    },
    active:{
        type:Boolean,
        default:true
    }
}, { timestamps: true });


TransactionCategorySchema.plugin(mongoosePaginate);

TransactionCategorySchema.pre('save', async function (next) {

        return next();
})

const TransactionCategories = module.exports = mongoose.model('transactionCategories', TransactionCategorySchema);