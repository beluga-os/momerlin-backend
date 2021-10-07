const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2')
const Schema = mongoose.Schema;

const ChallengeTrackerSchema =new mongoose.Schema({
    competitor: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    challenge:{
        type: Schema.Types.ObjectId,
        ref: 'challenges'
    },
    startAt: String,
    endAt: String,
    totalkm:String,
    kmreached:String,
}, {timestamps: true});


ChallengeTrackerSchema.plugin(mongoosePaginate); 


const ChallengeTracker = module.exports = mongoose.model('challengeTracker', ChallengeTrackerSchema);