const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2')
const Schema = mongoose.Schema;
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

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
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        joinedAt: {
            type: Date
        }
    }],
    startAt: Date,
    endAt: Date,
    wage: String,
    prize:Number,
    winners:[{
        type:Schema.Types.ObjectId,
        ref:'users'
}],
    active: {
        type:Boolean,
        default:false
    }
}, {timestamps: true});


ChallengeSchema.plugin(mongoosePaginate); 

ChallengeSchema.plugin(aggregatePaginate);

const Challenges = module.exports = mongoose.model('challenges', ChallengeSchema);