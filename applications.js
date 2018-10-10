var express = require('express')
var router = express.Router()
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("database.db")
const bodyParser = require('body-parser')

router.use(bodyParser.json())
router.use(bodyParser.xml({
  limit: '1MB',   
  xmlParseOptions: {
    normalize: true,     
    normalizeTags: true, 
    explicitArray: false 
  }
}))

var authorize = require('./authorize.js')

router.use(function(req, res, next){
	let contentType = req.headers['content-type'];
	if(contentType=="application/xml"){
		req.body = req.body[Object.keys(req.body)[0]]
	}
	next()
})

//Create an application
router.post("/applications/:id", function(req, res){
	const advert_id=parseInt(req.params.id)
	const accountData=authorize(req,res,req.body.id);
	const company_id= req.body.company_id
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type
 	
 	if(user_type=="user"){
 		const query = "INSERT INTO Application(user_id, advert_id) VALUES (?,?,?)"
 		const values=[tokenAccountId,advert_id]
 		db.run(query,values,function(error){
			if (error) {
				res.status(500).end()
			}else{
				res.status(201).end()
			}
		})
 	}else{
		res.status(401).end()
	}
})

module.exports = router