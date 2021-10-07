
const moment = require('moment');
const Challenges = require("../models/challenge.model") 
const Users = require("../models/user.model") 
const {ReE, ReS, to} = require("../services/global.services")

const ObjectId = require('mongoose').Types.ObjectId;
  // Create challange
  
  const createChallenge = async function(req,res){
    
      let body = {
          mode: req.body.mode ? req.body.mode : "",
          type: req.body.type ? req.body.type : "",
          totalCompetitors: req.body.totalCompetitors ? req.body.totalCompetitors : "",
          streakDays: req.body.streakDays ? req.body.streakDays : "",
          totalKm: req.body.totalKm ? req.body.totalKm : "",
          createdBy: req.body.createdBy ? req.body.createdBy : "",
          competitors: req.body.competitors ? req.body.competitors : [],
          startAt: req.body.startAt ? req.body.startAt : "",
          endAt: req.body.endAt ? req.body.endAt : "",
          active: true,
          wage: req.body.wage ? req.body.wage : "",
          total_amount: parseInt(req.body.wage) * parseInt(req.body.totalCompetitors)
      }
  
      let err,challenge

      [err,challenge] = await to (Challenges.create(body))

      if(err){
          return ReE(res,{message:"Error on create challenge",success:false,err},400) 
      }
      else{

      if(challenge !== null || challenge !== {}){
          return ReS(res,{message:"Challenge created successfully",challenge:challenge,success:true},200)
      }
      else{
          return ReE(res,{message:"Unable to retrieve challenges please try again.",success:false},400)
      }
      }
  }
  
  module.exports.createChallenge = createChallenge

//   Get Challenges

const getChallenges = async function(req,res) {
    let err,challenges

    [err,challenges] = await to(Challenges.find({active:true}).populate({path:"createdBy",select:'_id fullName'}))

    if(err){
        return ReE(res,{message:"Error on retrieving challenge",err,success:false},400)
    }

    else{
        return ReS(res,{message:"The Challenge list are",challenges:challenges,success:true},200)
    }
}

module.exports.getChallenges = getChallenges

//   Update Challenge

const updateChallenge = async function(req,res) {
    let err,challenge,id

    id = req.query.id
    [err,challenge] = await to(Challenges.findByIdAndUpdate(id,{$set:req.body},{new:true}))

    if(err){

        return ReE(res,{err,success:false},400)
    }

    else{

        return ReS(res,{message:"Challenge updated",challenge:challenge,success:true},200)
    }
}

module.exports.updateChallenge = updateChallenge

//   Delete Challenge

const deleteChallenge = async function(req,res) {
    let err,challenges,id,body
    id = req.query.id
    body = req.body
    [err,challenges] = await to(Challenges.findByIdAndUpdate(id,{$set:{active:false}},{new:true}))

    if(err){
        return ReE(res,{message:"Error on retrieving challenge",err,success:false},400)
    }

    else{
        return ReS(res,{message:"Challenge deleted",challenges:challenges,success:true},200)
    }
}

module.exports.deleteChallenge = deleteChallenge

// Join a challenge

const joinChallenge = async function (req,res){
    let userId,challengeId

    userId = req.query.id
    challengeId = req.query.challenge

    let err,user

    [err,user] = await to (Users.findById(userId))

    if(err){
        return ReE(res,err,400)
    }

    else{
        if(user !== null && user !== {} && user !== undefined){
            let error,challenge

            [error,challenge] = await to (Challenges.findById(challengeId))

            if(error){
                return ReE(res,error,400)
            }

            else{
                if(challenge !== null && challenge !== {} && challenge.active === true){

                    if (challenge.competitors.length > challenge.totalCompetitors) {
                        return ReE(res, { message: "Total members limit reached please try another challenge.", success: false }, 400)
                    }
                    else {
                        if (challenge.competitors.includes(userId)) {
                            return ReE(res, { message: "You have already joined in this challenge", success: false }, 400)
                        }
                        else {
                            challenge.competitors.push(userId)
                            try {
                                await challenge.save()
                            } catch (error) {
                                return ReE(res, error, 400)
                            }

                            return ReS(res, { message: "You have joined this challenge", success: true, challenge: challenge }, 200)
                        }
                    }
                }

                else{
                    return ReE(res,{message:"Invalid challenge..",success:false},400)
                }
            }
        }
        else{
            return ReE(res,{message:"Invalid user..",success:false},400)
        }
    }
}

module.exports.joinChallenge = joinChallenge

// Get a api info

const getChallengeInfo = async function (req,res) {
    let challenge,err


    [err,challenge] = await to(Challenges.findById(req.query.id))

    if(err){
        return ReE(res,err,400)
    }
    else{
        return ReS(res,{message:"This challenge information is",challenge:challenge,success:true},200)
    }
}

module.exports.getChallengeInfo = getChallengeInfo