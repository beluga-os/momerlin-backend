
const moment = require('moment');
const { get } = require('mongoose');
const Challenges = require("../models/challenge.model") 
const {ReE, ReS, to} = require("../services/global.services")

  // Create challange
  
  const createChallenge = async function(req,res){
    
      let body = {
          id: uuidv4(),
          mode: req.competitorsbody.mode ? req.body.mode : "",
          type: req.body.type ? req.body.type : "",
          totalCompetitors: req.body.totalCompetitors ? req.body.totalCompetitors : "",
          streakDays: req.body.streakDays ? req.body.streakDays : "",
          totalKm: req.body.totalKm ? req.body.totalKm : "",
          createdBy: req.body.createdBy ? req.body.createdBy : "",
          competitors: req.body.competitors ? req.body.competitors : [],
          startAt: req.body.startAt ? req.body.startAt : "",
          endAt: req.body.endAt ? req.body.endAt : "",
          active: false,
          wage: req.body.wage ? req.body.wage : ""
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

    [err,challenges] = await to(Challenges.find())

    if(err){
        return ReE(res,{message:"Error on retrieving challenge",err,success:false},400)
    }

    else{
        return ReS(res,{message:"The Challenge list are",challenges:challenges,success:true},200)
    }
}

module.exports.getChallenges = getChallenges