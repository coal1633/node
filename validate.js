var express = require('express')
var router = express.Router()

router.use(function validateAdvert(ad,user_type){
	var err = []
	var valid=false

	if(ad.title.length<=0){
		err.push({'titleTooShort':'Please provide a longer title'})
	}
	if( ad.title.length>20){
		err.push({'titleTooLong':'Please provide a shorter title'})
	}
	if(ad.description.length<10){
		err.push({'descriptionTooShort': 'Please provide a shorter description'})
	}
	if(ad.description.length>1000){
		err.push({'descriptionTooLong': 'Please provide a longer description'})
	}
	if(ad.sector.length<1){
		err.push({'sectorTooShort': 'Please provide a shorter sector'})
	}
	if(ad.sector.length>100){
		err.push({'sectorTooLong': 'Please provide a longer sector'})
	}
	if(user_type=="user"){
		err.push({'invalidCreator':'You are not allowed to access adverts'})
	}
 	if(err.length==0){
 		valid=true
 	}
 	return {valid,err}
})

router.use(function authorize(req,res,accountId){
	const authorizationHeader = req.get("Authorization")
	const accessToken = authorizationHeader.substr(7)
	let user_type=null
	let tokenAccountId = null
	try{
		const payload = jwt.verify(accessToken, jwtSecret)
		tokenAccountId = payload.accountId
		user_type = payload.userType
	}catch(error){
		res.status(402).end()
		return
	}
	if(tokenAccountId != accountId){
		res.status(401).end()
		return
	}
	return {tokenAccountId, user_type}
})

module.exports = router

