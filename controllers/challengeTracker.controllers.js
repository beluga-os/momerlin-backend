
const moment = require('moment');
const Challenges = require("../models/challenge.model") 
const Users = require("../models/user.model") 
const ChallengeTracker = require("../models/challengeTracker.model") 
const {ReE, ReS, to} = require("../services/global.services")
  // Create challange
  
  const trackChallenger = async function(req,res){
    
      let body = req.body
  
      if(typeof body.challenge === 'undefined' || body.challenge === '' || body.challenge === null){
        return ReE(res,{message:"Please provide a valid challenge",success:false},400)
      }

      else if(typeof body.competitor === 'undefined' || body.competitor === '' || body.competitor === null){
        return ReE(res,{message:"Please provide a valid challenger",success:false},400)
      }

      else {

          let err, user

          [err,user] = await to(Users.findById(body.competitor))

          if(err){
            return ReE(res, { message: "Error on checking challenger is a valid user", success: false, err }, 400)
          }

          else{
              let err,challenger

              if(user){
                [err,challenger] = await to(ChallengeTracker.find({competitor:body.competitor}))

                if(err){
                    return ReE(res, { message: "Error on checking challenger is active", success: false, err }, 400)
                }

                else{
                    let err, challenge
                    let challengeTracker

                    if (challenger.length > 0) {
                       [err,challengeTracker] = await to(ChallengeTracker.findOneAndUpdate({competitor:body.competitor},body))

                       if(err){
                        return ReE(res, { message: "Error on updating challenger", success: false, err }, 400)
                       }

                       else{
                        return ReS(res, { message: "Challenger record updated successfully", challengeTracker: challengeTracker, success: true }, 200)
                       }
                    }

                    else{
                        [err, challenge] = await to(Challenges.findById(body.challenge))

                        if (err) {
                            return ReE(res, { message: "Error on checking challenge", success: false, err }, 400)
                        }

                        else {
                            let err,challengeTracker

                            if (challenge) {
                                [err, challengeTracker] = await to(ChallengeTracker.create(body))

                                if (err) {
                                    return ReE(res, { message: "Error on tracking challenger", success: false, err }, 400)
                                }
                                else {

                                    if (challengeTracker !== null || challengeTracker !== {}) {
                                        return ReS(res, { message: "Challenge tracked successfully", challengeTracker: challengeTracker, success: true }, 200)
                                    }
                                    else {
                                        return ReE(res, { message: "Unable to retrieve challenges please try again.", success: false }, 400)
                                    }
                                }
                            }

                            else {
                                return ReE(res, { message: "Challenge not found", success: false, err }, 400)
                            }
                        }
                    }
                }
              }

              else{
                return ReE(res, { message: "User not found", success: false, err }, 400)
              }
          }

      }
      
  }
  
  module.exports.trackChallenger = trackChallenger

//   Get records by Challenges

const getByChallenges = async function(req,res) {
    let err,challenges

    let challenge = req.query.id

    [err,challenges] = await to(ChallengeTracker.find({challenge:challenge})
    .populate({path:"competitor",select:'_id fullName'})
    .populate('challenge')
    )

    if(err){
        return ReE(res,{message:"Error on retrieving challenge",err,success:false},400)
    }

    else{
        return ReS(res,{message:"The Challenge list are",challenges:challenges,success:true},200)
    }
}

module.exports.getByChallenges = getByChallenges


//   Get records by Challengers

const getByChallenger = async function(req,res) {
    let err,challenger

    let id = req.query.id

    [err,challenger] = await to(ChallengeTracker.find({competitor:id})
    .populate({path:"competitor",select:'_id fullName'})
    .populate('challenge')
    )

    if(err){
        return ReE(res,{message:"Error on retrieving challenge",err,success:false},400)
    }

    else{
        return ReS(res,{message:"The Challenger tracking list are",challenger:challenger,success:true},200)
    }
}

module.exports.getByChallenger = getByChallenger

//   Get record of a Challenger on a particular challenge

const getChallenge = async function(req,res) {
    let err,record,challenger,challenge

    challenger = req.query.challenger

    challenge = req.params.id

    [err,record] = await to(ChallengeTracker.find({competitor:challenger,challenge:challenge})
    .populate({path:"competitor",select:'_id fullName'})
    .populate('challenge')
    )

    if(err){
        return ReE(res,{message:"Error on retrieving challenge",err,success:false},400)
    }

    else{
        return ReS(res,{message:"The Challenger tracking list are",record:record,success:true},200)
    }
}

module.exports.getChallenge = getChallenge

// Get tracking by id

const getTracking = async function(req,res){

    let err,id,record

    id = req.params.id

    [err,record] = await to(ChallengeTracker.findById(id))

    if(err){
        ReE(res,{message:"Error on tracking by id",success:false},400)
    }

    else{
        if(record){
            return ReS(res,{message:"Trak information is...",Track:record,success:true},200)
        }
        else{
            return ReE(res,{message:"Cannot find this record",success:false},400)
        }
    }

}

module.exports.getTracking = getTracking