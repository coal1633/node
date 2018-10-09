 var express = require('express')
 const jwt = require('jsonwebtoken')
 const jwtSecret = "dsjlksdjlkjfdsl"

module.exports = (function authorize(req,res,accountId){
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

