 var express = require('express')
 const jwt = require('jsonwebtoken')
 const jwtSecret = "dsjlksdjlkjfdsl"

// const bodyParser = require('body-parser')
// router.use(bodyParser.json())
// router.use(bodyParser.xml({
//   limit: '1MB',   
//   xmlParseOptions: {
//     normalize: true,     
//     normalizeTags: true, 
//     explicitArray: false 
//   }
// }))

// router.use(function(req, res, next){
// 	let contentType = req.headers['content-type'];
// 	if(contentType=="application/xml"){
// 		req.body = req.body[Object.keys(req.body)[0]]
// 	}
// 	next()
// })



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
		console.log(tokenAccountId, accountId)
		res.status(401).end()
		return
	}
	return {tokenAccountId, user_type}
})
