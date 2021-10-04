const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2')
const Schema = mongoose.Schema;

const ChallengeSchema =new mongoose.Schema({
    mode: String,
    type: String,
    totalCompetitors: String,
    streakDays: String,
    totalKm: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    competitors: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
    startAt: String,
    endAt: String,
    active: {
        type:Boolean,
        default:false
    }
}, {timestamps: true});


ChallengeSchema.plugin(mongoosePaginate); 


const Users = module.exports = mongoose.model('challenges', ChallengeSchema);