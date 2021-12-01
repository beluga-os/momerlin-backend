
const moment = require('moment');
const Challenges = require("../models/challenge.model")
const ChallengeTracker = require("../models/challengeTracker.model")
const Users = require("../models/user.model")
const { ReE, ReS, to } = require("../services/global.services")
const axios = require('axios');
const BigNumber = require('bignumber.js')

const ObjectId = require('mongoose').Types.ObjectId;
const { query } = require('express');
// Create challange

const createChallenge = async function (req, res) {

    let body = {
        mode: req.body.mode ? req.body.mode : "",
        type: req.body.type ? req.body.type : "",
        totalCompetitors: req.body.totalCompetitors ? req.body.totalCompetitors : "",
        streakDays: req.body.streakDays ? req.body.streakDays : "",
        totalKm: req.body.totalKm ? req.body.totalKm : "",
        createdBy: req.body.createdBy ? req.body.createdBy : "",
        competitors: [{ userId: req.body.createdBy, joinedAt: moment().utc().format() }],
        commissionEnabled: req.body?.percentage > 0 ? true : false,
        percentage: req.body.percentage ? (req.body.percentage / 100) : 0,
        startAt: moment().utc().format(),
        endAt: moment().utc().add(req.body.streakDays, 'days').format(),
        active: true,
        wage: req.body.wage ? req.body.wage : "",
        prize: parseInt(req.body.wage) * parseInt(req.body.totalCompetitors)
    }

    let err, challenge, user

    [err,user] = await to(Users.findById(req.body.createdBy))

    if(err){

    }

    else{

        if(user){

            let gwei = new BigNumber(body.wage).toString()

            if(Number(user.gwei) > Number(gwei)){

                [err, challenge] = await to(Challenges.create(body))

                if (err) {
                    return ReE(res, { message: "Error on create challenge", success: false, err }, 400)
                }
                else {

                    if (challenge !== null || challenge !== {}) {

                        user.gwei = new BigNumber(user.gwei).minus(new BigNumber(gwei)).toString()

                        // user.eth = new BigNumber(new BigNumber(String(parseInt(user.gwei)))).div(new BigNumber('1000000000000000000'), 10).toString(10)

                        try {
                            await user.save()
                            return ReS(res, { message: "Challenge created successfully", challenge: challenge, success: true }, 200)
                        } catch (error) {
                            return ReE(res, error, 400)
                        }
                    }
                    else {
                        return ReE(res, { message: "Unable to retrieve challenges please try again.", success: false }, 400)
                    }
                }
            }

            else{
                return ReE(res,{message:"You do not have enough gwei to create this challenge",success:false},400)
            }

        }

        else{
            return ReE(res,{message:"Invalid user",success:false},400)
        }
        
    }
    
}

module.exports.createChallenge = createChallenge

//   Get Challenges

const getChallenges = async function (req, res) {
    let err, challenges, options, query, page, limit

    page = req.query.page ? req.query.page : 1

    limit = req.query.limit ? req.query.limit : 10

    options = {
        page: page,
        limit: limit,
        sort: {
            createdAt: -1,
        },
        populate: ([{
            path: 'createdBy',
            select: ['fullName', '_id']
        },
        {
            path: 'competitors',
            select: ['fullName', '_id']
        }])
    }

    query = { active: true }

    try {
        challenges = await Challenges.paginate(query, options).then(function (docs, err) {

            if (err) ReE(res, { err }, 400)

            return ReS(res, { message: "Challenges are", success: true, challenges: docs }, 200)
        })

    } catch (error) {
        return ReE(res, { message: "Error on retrieving challenge", err, success: false }, 400)
    }

}

module.exports.getChallenges = getChallenges

//   My Challenges

const myChallenges = async function (req, res) {

    let err, challenges, options, query, page, limit, id

    id = req.query.id
    page = req.query.page ? req.query.page : 1

    limit = req.query.limit ? req.query.limit : 10

    options = {
        page: page,
        limit: limit,
        sort: {
            createdAt: -1,
        },
        populate: ([{
            path: 'createdBy',
            select: ['fullName', '_id']
        },
        {
            path: 'competitors',
            select: ['fullName', '_id']
        }])
    }

    query = { createdBy: id, active: true }

    try {
        challenges = await Challenges.paginate(query, options).then(function (docs, err) {

            if (err) ReE(res, { message: "error", success: false, err }, 400)

            return ReS(res, { message: "My Challenges are", success: true, challenges: docs }, 200)
        })

    } catch (error) {
        return ReE(res, { message: "Error on fetching my challenge", error }, 400)
    }

}

module.exports.myChallenges = myChallenges
//   Update Challenge

const updateChallenge = async function (req, res) {
    let err, challenge, id

    id = req.query.id
    [err, challenge] = await to(Challenges.findByIdAndUpdate(id, { $set: req.body }, { new: true }))

    if (err) {

        return ReE(res, { err, success: false }, 400)
    }

    else {

        return ReS(res, { message: "Challenge updated", challenge: challenge, success: true }, 200)
    }
}

module.exports.updateChallenge = updateChallenge

//   Delete Challenge

const deleteChallenge = async function (req, res) {
    let err, challenges, id, body
    id = req.query.id
    body = req.body
    [err, challenges] = await to(Challenges.findByIdAndUpdate(id, { $set: { active: false } }, { new: true }))

    if (err) {
        return ReE(res, { message: "Error on retrieving challenge", err, success: false }, 400)
    }

    else {
        return ReS(res, { message: "Challenge deleted", challenges: challenges, success: true }, 200)
    }
}

module.exports.deleteChallenge = deleteChallenge

// Join a challenge

const joinChallenge = async function (req, res) {

    let userId, challengeId

    userId = req.query.id
    challengeId = req.query.challenge

    let err, user

    [err, user] = await to(Users.findById(userId))

    if (err) {
        return ReE(res, err, 400)
    }

    else {
        if (user !== null && user !== {} && typeof user !== undefined) {
            let error, challenge

            [error, challenge] = await to(Challenges.findById(challengeId))

            if (error) {
                return ReE(res, error, 400)
            }

            else {

                if (challenge !== null && challenge !== {} && challenge.active === true) {

                    let isEnded = moment().diff(challenge.endAt, 'days')

                    if (Number(user.gwei) > Number(challenge.wage)) {

                        if (isEnded <= 0) {
                            if (challenge.competitors.length > challenge.totalCompetitors) {
                                return ReE(res, { message: "Total members limit reached please try another challenge.", success: false }, 400)
                            }
                            else {

                                let hasJoined

                                if (challenge.competitors.length > 0) {
                                    hasJoined = challenge.competitors.filter(data => data.userId.toString() === userId)
                                }

                                else {
                                    hasJoined = []
                                }

                                if (hasJoined.length < 1) {
                                    challenge.competitors.push({ userId: userId, joinedAt: moment().format() })
                                    try {
                                        await challenge.save()
                                    } catch (error) {
                                        return ReE(res, error, 400)
                                    }

                                    user.gwei = new BigNumber(user.gwei).minus(new BigNumber(challenge.wage)).toString()

                                    // user.eth = new BigNumber(new BigNumber(String(parseInt(user.gwei)))).div(new BigNumber('1000000000000000000'), 10).toString(10)

                                    try {
                                        await user.save()
                                    } catch (error) {
                                        return ReE(res, error, 400)
                                    }
                                    return ReS(res, { message: "You have joined this challenge", success: true, challenge: challenge }, 200)
                                }

                                else {
                                    return ReE(res, { message: "You have already joined in this challenge", success: false }, 400)
                                }
                            }
                        }

                        else {
                            return ReE(res, { message: "Challenge is completed.", success: false }, 400)
                        }
                    }

                    else{
                        return ReE(res, { message: "You don't have enough gwei to join challenge.", success: false }, 400)
                    }

                }

                else {
                    return ReE(res, { message: "Invalid challenge.", success: false }, 400)
                }
            }
        }
        else {
            return ReE(res, { message: "Invalid user.", success: false }, 400)
        }
    }
}

module.exports.joinChallenge = joinChallenge

// Get joined challenges

const joinedChallenges = async function (req, res) {
    let userId, body

    userId = req.params.id

    body = req.body

    let err, user

    [err, user] = await to(Users.findById(userId))

    if (err) {
        return ReE(res, err, 400)
    }

    else {
        if (user !== null && user !== {} && user !== undefined) {

            let error, options, page, limit, query

            limit = req.query.limit || 10

            page = req.query.page || 1

            options = {
                page: 1,
                limit: 50,
                sort: {
                    createdAt: -1,
                },
                populate: ([{
                    path: 'createdBy',
                    select: ['fullName', '_id']
                },
                {
                    path: 'competitors',
                    select: ['fullName', '_id']
                }])
            }


            query = [
                // Initial document match (matches competitors id)
                { $match: { 'competitors': { $elemMatch: { userId: ObjectId(userId) } } } },

                // Unwind the competitors array
                { $unwind: '$competitors' },

                {
                    $match: {
                        'competitors.userId': ObjectId(userId)
                    }
                },
                // Sort in descending order
                {
                    $sort: {
                        'competitors.joinedAt': -1
                    }
                }
            ]

            try {
                Challenges.aggregatePaginate(Challenges.aggregate(query), options, async function (err, results) {
                    if (err) {
                        return ReE(res, error, 400)
                    }
                    else {

                        if (results.docs.length > 0) {
                            results.docs.map(async (challenge) => {

                                try {

                                    await updateStreak(challenge, userId,body.token,body.distance?body.distance:false)

                                } catch (error) {
                                    return console.log("Error on update streak...",{ error })
                                    // return ReE(res, { error }, 400)
                                }
                            })
                        }

                        let options, query

                        options = {
                            page: page,
                            limit: limit,
                            sort: {
                                createdAt: -1,
                            },
                            populate: ([{ path: "competitor", select: '_id fullName imageUrl' },
                                'challenge'])
                        }
                    
                        query = { competitor: ObjectId(userId) }
                    
                        try {
                            record = await ChallengeTracker.paginate(query, options).then(function (docs, err) {
                    
                                if (err) return ReE(res,{ err },400)
                                
                                return ReS(res, { message: "The Challenger's activities are", success: true,challenges:docs}, 200)
                            })
                    
                        } catch (error) {
                            return ReE(res, { message: "Error on retrieving challenger tracking list", error, success: false },400)
                        }
                        
                        // return ReS(res, { message: "Challenges you have joined", success: true, challenges: results }, 200)
                    }
                })
            } catch (error) {
                return ReE(res, error, 400)
            }


        }
        else {
            return ReE(res, { message: "Invalid user..", success: false }, 400)
        }
    }
}

module.exports.joinedChallenges = joinedChallenges

// Get a api info

const getChallengeInfo = async function (req, res) {
    let challenge, err, isEnded

    [err, challenge] = await to(Challenges.findById(req.params.id))

    if (err) {
        return ReE(res, err, 400)
    }
    else {

        let error, leaders

        [error, leaders] = await to(ChallengeTracker.find({ challenge: ObjectId(req.params.id) }).sort({ prize:-1,updatedAt:-1,streakNo: -1,totalkm:-1 }).populate("competitor"))

        if (error) {
            return ReE(res, { error }, 400)
        }

        let users = []
        leaders.map((leader)=>{
            if(users.length < 1){
                return users.push(leader)
            }
            else{
                if(users.filter(user=>user.competitor._id === leader.competitor._id).length < 1){
                    return users.push(leader)
                }
            }
        })

        isEnded = moment().utc().diff(challenge.endAt, 'days') < 0

        // if(isEnded && challenge.winners.length < 1){
        //     try {
        //         let result
        //         result = await calculateWinner(req.params.id)
        //     } catch (error) {
        //         return ReE(res,{error},400)
        //     }
        // }
        let winners = leaders.filter((leader)=>leader.status === 'completed')

        return ReS(res, { message: "This challenge information is", challenge: challenge,winners:isEnded ? winners:[], leaders: users, success: true }, 200)
    }
}

module.exports.getChallengeInfo = getChallengeInfo


async function updateStreak(challenge, userId,token,km) {

    let err, activity

                // return console.log("checking token....",token,typeof token !== 'undefined');
    [err, activity] = await to(ChallengeTracker.findOne({ competitor: ObjectId(userId), challenge: ObjectId(challenge._id.toString()) }).sort({ updatedAt: -1 }))

    if (err) {
        return ReE(res, { message: "Error on checking challenger is active", success: false, err }, 400)
    }

    else {
        let err
        let challengeTracker

        if (activity && moment().utc().isSame(activity.updatedAt, "day")) {


            if (challenge.status !== 'completed' || moment().utc().diff(challenge.endAt, 'days') < 0) {


                let distance


                if (typeof token !== 'undefined') {
                    try {
                        distance = await getDistance(token, activity.updatedAt)
                    } catch (error) {
                        console.log("Error on get distance...", error);
                        throw Error({ error })
                    }
                }

                else{
                    distance = km
                }

                if (distance) {

                    let total_distance
                    total_distance = typeof token !== 'undefined' ? parseFloat(activity.totalkm) + distance : distance;
                    [err, challengeTracker] = await to(ChallengeTracker.findOneAndUpdate({ competitor: ObjectId(userId), challenge: ObjectId(challenge._id.toString()), updatedAt: new Date(activity.updatedAt) }, { $set: { totalkm: total_distance } }, { new: true }));

                    if (err) {
                        throw Error(err)
                    }

                    else {
                        return
                    }
                }
                else {
                    return
                }

            }
            else {
                throw Error({ message: "Challenge Completed Thank you for participating.", })
            }

        }

        else {

            let err, challengeTracker, body

            let distance

            if (typeof token !== 'undefined') {
                try {
                    distance = await getDistance(token, false)
                } catch (error) {
                    console.log("Checking error...", error);
                    throw Error({ error })
                }
            }

            else {

                distance = km
            }

            body = {
                "competitor": userId,
                "challenge": challenge._id,
                "startAt": moment().utc().format(),
                "endAt": moment(challenge.endAt).utc().format(),
                "totalkm": distance,
                "streakNo": challenge.totalKm < distance ? 1 : 0,
            }

            body.status = "inprogress"

            if (distance) {
                if (activity) {
                    let isEnded = moment().utc().diff(challenge.endAt, 'days') < 0
                    body.streakNo = (challenge.totalKm <= distance) ? activity.streakNo + 1 : body.streakNo
                    body.status = challenge.streakDays === body.streakNo ? "completed" :  (isEnded ? "ended" : "inprogress")
                }

                [err, challengeTracker] = await to(ChallengeTracker.create(body))

                if (err) {
                    throw Error({ message: "Error on tracking challenger" })
                }
                else {

                    if (challengeTracker !== null || challengeTracker !== {}) {
                        return
                    }
                    else {
                        throw Error({ message: "Unable to retrieve challenges please try again.", success: false })
                    }
                }
            }
            else {
                return
            }
        }
           
    }

}

async function getDistance(token,from) {

    let data, url, startdate, endDate, totalSteps = 0

    startdate = from ? moment(from).valueOf() : moment().subtract(1, "days").valueOf();
    endDate = moment().valueOf()

    url = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate'

    let body = {
        "aggregateBy": [{
            "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
        }],
        "bucketByTime": { "durationMillis": 86400000 }, // This is 24 hours    
        "startTimeMillis": startdate,   // Start time    
        "endTimeMillis": endDate  // End Time    
    }

    try {
        data = await axios({
            method: "POST",
            headers: {
                authorization: "Bearer " + token
            },
            "Content-Type": "application/json",
            url: url,
            data: body
        })
    } catch (error) {

        throw new Error(error)

        // return ReE(res,{error},400)
    }
    let result

    result = await data

    if (result.data.bucket.length > 0) {
        result.data.bucket.map(data => {
            if (data) {
                if (data.dataset.length > 0) {
                    data.dataset.map(item => {
                        if (item.point.length > 0) {
                            item.point.map(point => {
                                if (point.value.length > 0) {
                                    point.value.map(value => {
                                        totalSteps += value.intVal
                                    })
                                }
                            })
                        }
                    })
                }
            }
        })
    }

    let km

    console.log("Steps...",totalSteps,((totalSteps / 2000) * 1.61));

    km = (totalSteps / 2000) * 1.61

    return km
    // return ReS(res,{message:"Steps are..",success:true,totalSteps:totalSteps,km:km},200)

}

const getMyActivity = async function (req,res) {
    let id,startDate,lastDate

    let asset = {
        gold:{
            color:"#FF9BB3",
            image:"https://momerlin.s3.amazonaws.com/dev/images/spend_reports/gold.jpeg"
        },
        down:{
            color:"#EB9355",
            image:"https://momerlin.s3.amazonaws.com/dev/images/spend_reports/down.jpeg"
        }
    }
    id = req.params.id

    startDate = (req.query.startDate !== undefined && req.query.startDate !== null) ? moment(req.query.startDate).toISOString() : null;
  
    lastDate = (req.query.lastDate !== undefined && req.query.lastDate !== null) ? moment(req.query.lastDate).toISOString() : null;

    let query = (startDate !== null && to !== null) ? {competitor:ObjectId(id),createdAt: {$gte : new Date(startDate),$lte: new Date(lastDate)}} : {competitor:ObjectId(id)}

    console.log("Checking id...",id);

    let err,activities
    
    [err,activities] = await to(ChallengeTracker.find(query).sort({updatedAt:-1}).populate("challenge"))

    if(err) return ReE(res,{err},400)

    if(activities.length > 0){
        let result = [],challenges = []

        activities.map(data=>{

            if(data.challenge !== null){
                if (result.length < 1) {
                    challenges.push(data.challenge._id)
                    return result.push({
                        title: `${data.challenge.totalKm} km ${data.challenge.mode} ${data.challenge.type.toLowerCase()}`,
                        date: moment(data.endAt).toISOString(),
                        image: data.status === 'completed' ? asset.gold.image : asset.down.image,
                        color: data.status === 'completed' ? asset.gold.color : asset.down.color,
                        amount: data.status === 'completed' ? data.challenge.prize : data.challenge.wage
                    })
                }

                else {

                    if (!challenges.includes(data.challenge._id)) {
                        challenges.push(data.challenge._id)

                        if (moment().utc().diff(data.endAt, 'days') > 0) {
                            return result.push({
                                title: `${data.challenge.totalKm} km ${data.challenge.mode} ${data.challenge.type.toLowerCase()}`,
                                date: moment(data.endAt).toISOString(),
                                image: data.status === 'completed' ? asset.gold.image : asset.down.image,
                                color: data.status === 'completed' ? asset.gold.color : asset.down.color,
                                amount: data.status === 'completed' ? data.prize : data.challenge.wage
                            })
                        }

                        return
                    }

                    return
                }

            }
            
                return
        })
    return ReS(res,{message:"Activity result",success:true,activities:result},200)
    }

    else{
        return ReS(res,{message:"Activity result",success:true,activities:[]},200)
    }

}

module.exports.getMyActivity = getMyActivity


async function calculateWinner (id) {


    if (id) {
        let competitors, err
        [err, competitors] = await to(ChallengeTracker.find({ challenge: ObjectId(req.params.id), status: 'completed' })
            .populate([{ path: "competitor", select: '_id fullName imageUrl' },
                'challenge']))
        if (err) {
            throw Error({ err })
        }
        else {
            let prize, winners = []
            prize = parseInt((competitors[0].challenge.prize - (competitors[0].challenge.prize * parseInt(competitors[0].challenge.percentage))) / competitors.length)
            if (competitors.length > 0) {

                competitors.map(async (data, index) => {

                    let err,winner

                    [err,winner] = await to (ChallengeTracker.findOneAndUpdate({competitor:ObjectId(data.competitor._id)},{$set:{prize:prize}}, { new: true }))

                    if(err) throw Error({err})

                    winners.push(data.competitor._id)
                })
            }

            let err, challenge, body

            body = { "winners": winners }

            [err, challenge] = await to(Challenges.findByIdAndUpdate(req.query.id, { $set: body }, { new: true }))

            if (err) {
                throw Error({ err })
            }

            return { message: "Winners list is ", success: true, prize: prize, winners: winners }
        }
    }
}
