
const moment = require('moment');
const Challenges = require("../models/challenge.model")
const Users = require("../models/user.model")
const ChallengeTracker = require("../models/challengeTracker.model")
const { ReE, ReS, to } = require("../services/global.services")
const ObjectId = require('mongoose').Types.ObjectId;
const axios = require('axios');

// Create challange

const trackChallenger = async function (req, res) {

    let body = req.body

    if (typeof body.challenge === 'undefined' || body.challenge === '' || body.challenge === null) {
        return ReE(res, { message: "Please provide a valid challenge", success: false }, 400)
    }

    else if (typeof body.competitor === 'undefined' || body.competitor === '' || body.competitor === null) {
        return ReE(res, { message: "Please provide a valid challenger", success: false }, 400)
    }

    else if (typeof body.token === 'undefined' || body.token === '' || body.token === null) {
        return ReE(res, { message: "Unauthorized user", success: false }, 401)
    }
    else {
        let distance
        try {
            distance = await getUserData(body.token)
        } catch (error) {
            return ReE(res, { error }, 400)
        }

        body.totalkm = distance
        let err, user

        [err, user] = await to(Users.findById(body.competitor))

        if (err) {
            return ReE(res, { message: "Error on checking challenger is a valid user", success: false, err }, 400)
        }

        else {
            let err, challenger

            if (user) {
                [err, challenger] = await to(ChallengeTracker.find({ competitor: body.competitor, challenge: body.challenge })
                    .populate("challenge"))

                if (err) {
                    return ReE(res, { message: "Error on checking challenger is active", success: false, err }, 400)
                }

                else {
                    let err, challenge
                    let challengeTracker

                    if (challenger.length > 0) {

                        if (challenger[0].challenge) {

                            body.streakNo = (challenger[0].challenge.totalKm <= distance) ? challenger[0].streakNo + 1 : 0

                            if ((parseInt(challenger[0].challenge.streakDays) >= parseInt(body.streakNo)) && challenger[0].status !== 'completed') {

                                body.status = parseInt(challenger[0].challenge.streakDays) === parseInt(body.streakNo) ? "completed" : "in progress"

                                console.log("Checking status....", body.status);

                                [err, challengeTracker] = await to(ChallengeTracker.findOneAndUpdate({ competitor: body.competitor, challenge: body.challenge }, body))

                                if (err) {
                                    return ReE(res, { message: "Error on updating challenger", success: false, err }, 400)
                                }

                                else {
                                    return ReS(res, { message: parseInt(challenger[0].challenge.streakDays) === parseInt(body.streakNo) ? "Challenge Completed Thank you for participating." : "Challenger record updated successfully", challengeTracker: challengeTracker, success: true }, 200)
                                }
                            }
                            else {
                                return ReS(res, { message: "Challenge Completed Thank you for participating.", success: false, err }, 200)
                            }
                        }

                        else {
                            return ReS(res, { message: "Invalid Challenge.", success: false, err }, 400)
                        }

                    }

                    else {
                        [err, challenge] = await to(Challenges.findById(body.challenge))

                        if (err) {
                            return ReE(res, { message: "Error on checking challenge", success: false, err }, 400)
                        }

                        else {
                            let err, challengeTracker

                            if (challenge) {
                                body.status = "in progress"

                                body.totalKm = distance

                                body.streakNo = (challenge.totalkm <= distance) ? 1 : 0

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

            else {
                return ReE(res, { message: "User not found", success: false, err }, 400)
            }
        }

    }

}

module.exports.trackChallenger = trackChallenger

//   Get records by Challenges

const getByChallenges = async function (req, res) {
    let err, challenges, options, query, page, limit

    let challenge = req.query.id

    challenger = req.query.challenger

    page = req.query.page ? req.query.page : 1

    limit = req.query.limit ? req.query.limit : 10

    options = {
        page: page,
        limit: limit,
        sort: {
            streakNo: -1,
        },
        populate: ([{ path: "competitor", select: '_id fullName' },
            'challenge'])
    }

    query = { challenge: ObjectId(challenge) }

    try {
        record = await ChallengeTracker.paginate(query, options).then(function (docs, err) {

            if (err) ReE(res, { err }, 400)

            return ReS(res, { message: "The Challenge tracking list are", success: true, challenges: docs }, 200)
        })

    } catch (error) {
        return ReE(res, { message: "Error on retrieving challenge tracking list", err, success: false }, 400)
    }


}

module.exports.getByChallenges = getByChallenges


//   Get records by Challengers

const getByChallenger = async function (req, res) {
    let err, challenger, options, query, page, limit

    let id = req.query.id

    challenger = req.query.challenger

    page = req.query.page ? req.query.page : 1

    limit = req.query.limit ? req.query.limit : 10

    options = {
        page: page,
        limit: limit,
        sort: {
            createdAt: -1,
        },
        populate: ([{ path: "competitor", select: '_id fullName' },
            'challenge'])
    }

    query = { competitor: ObjectId(id) }

    try {
        record = await ChallengeTracker.paginate(query, options).then(function (docs, err) {

            if (err) ReE(res, { err }, 400)

            return ReS(res, { message: "The Challenger tracking list are", success: true, challenges: docs }, 200)
        })

    } catch (error) {
        return ReE(res, { message: "Error on retrieving challenger tracking list", err, success: false }, 400)
    }

}

module.exports.getByChallenger = getByChallenger

//   Get record of a Challenger on a particular challenge

const getChallenge = async function (req, res) {
    let err, record, challenger, challenge, options, query, page, limit

    challenger = req.query.challenger

    challenge = req.params.id

    page = req.query.page ? req.query.page : 1

    limit = req.query.limit ? req.query.limit : 10

    options = {
        page: page,
        limit: limit,
        sort: {
            streakNo: -1,
        },
        populate: ([{ path: "competitor", select: '_id fullName' },
            'challenge'])
    }

    query = { competitor: ObjectId(challenger), challenge: ObjectId(challenge) }

    try {
        record = await ChallengeTracker.paginate(query, options).then(function (docs, err) {

            if (err) ReE(res, { err }, 400)

            return ReS(res, { message: "The Challenger tracking list of a challenge", success: true, challenges: docs }, 200)
        })

    } catch (error) {
        return ReE(res, { message: "Error on retrieving tracking list of challenge by user", err, success: false }, 400)
    }

}

module.exports.getChallenge = getChallenge

// Get tracking by id

const getTracking = async function (req, res) {

    let err, id, record

    id = req.params.id

    [err, record] = await to(ChallengeTracker.findById(id))

    if (err) {
        ReE(res, { message: "Error on tracking by id", success: false }, 400)
    }

    else {
        if (record) {
            return ReS(res, { message: "Trak information is...", Track: record, success: true }, 200)
        }
        else {
            return ReE(res, { message: "Cannot find this record", success: false }, 400)
        }
    }

}

module.exports.getTracking = getTracking

const getLeaders = async function (req, res) {

    let err, leaders

    [err, leaders] = await to(ChallengeTracker.find({}).limit(5).sort({ streakNo: -1,totalkm:-1 })
        .populate([{ path: "competitor", select: '_id fullName' },
            'challenge']))

    if (err) {
        return ReE(res, { err }, 400)
    }

    else {
        return ReS(res, { message: "The Leaderboard details are", success: true, leaders: leaders }, 200)
    }
}
module.exports.getLeaders = getLeaders


const getAllWinners = async function (req, res) {

    let err, leaders

    [err, leaders] = await to(ChallengeTracker.find({ status: 'completed' }).limit(10).sort({ prize:-1,streakNo: -1,totalkm:-1 })
        .populate([{ path: "competitor", select: '_id fullName' },
            'challenge']))

    if (err) {
        return ReE(res, { err }, 400)
    }

    else {
        return ReS(res, { message: "The Leaderboard details are", success: true, leaders: leaders }, 200)
    }
}
module.exports.getAllWinners = getAllWinners

const getChallengeWinner = async function (req, res) {
    let winners, err

    [err, winners] = await to(ChallengeTracker.find({ challenge: ObjectId(req.params.id), status: 'completed' }).limit(5)
        .populate([{ path: "competitor", select: '_id fullName' },
            'challenge']))

    if (err) {
        return ReE(res, { err }, 400)
    }

    else {
        console.log("Checking result", winners);
        return ReS(res, { message: "Winners list is ", success: true, winners: winners }, 200)
    }

}

module.exports.getChallengeWinner = getChallengeWinner

const calculateWinner = async function (req, res) {

    let id
    id = req.params.id

    if (id) {
        let competitors, err
        [err, competitors] = await to(ChallengeTracker.find({ challenge: ObjectId(req.params.id), status: 'completed' })
            .populate([{ path: "competitor", select: '_id fullName' },
                'challenge']))
        if (err) {
            return ReE(res, { err }, 400)
        }
        else {
            let prize, winners = []
            prize = parseInt((competitors[0].challenge.prize - (competitors[0].challenge.prize * parseInt(competitors[0].challenge.percentage))) / competitors.length)
            if (competitors.length > 0) {

                competitors.map((data, index) => {
                    winners.push(data.competitor._id)
                })
            }

            let err, challenge, body

            body = { "winners": winners }

            [err, challenge] = await to(Challenges.findByIdAndUpdate(req.query.id, { $set: body }, { new: true }))

            if (err) {
                return ReE(res, { err }, 400)
            }

            return ReS(res, { message: "Winners list is ", success: true, prize: prize, winners: competitors }, 200)
        }
    }
}

module.exports.calculateWinner = calculateWinner

// const getUserData = 
async function getUserData(token) {

    let data, url, startdate, endDate, totalSteps = 0

    startdate = moment().subtract(1, "days").valueOf();
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

    km = (totalSteps / 2000) * 1.61

    return km
    // return ReS(res,{message:"Steps are..",success:true,totalSteps:totalSteps,km:km},200)

}

// module.exports.getUserData = getUserData