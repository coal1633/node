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

router.use(function(req, res, next){
	let contentType = req.headers['content-type'];
	if(contentType=="application/xml"){
		req.body = req.body[Object.keys(req.body)[0]]
	}
	next()
})

router.use(function getAllSkills(){
	const query="SELECT * FROM Skill"
	db.all(query, function(error,skills){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(skills)
		}
	})
})

router.use(function getOneSkill(id){
	const query="SELECT * FROM Skill WHERE id=?"
	db.all(query,[id], function(error,skills){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(skills)
		}
	})
})

router.use(function getAllUsers() {
	const query="SELECT * FROM User"
	db.all(query, function(error,users){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(users)
		}
	})
})

router.use(function getOneUser(id){
	const query="SELECT * FROM User WHERE id=?"
	db.all(query,[id], function(error,users){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(users)
		}
	})
})

router.use(function getAllCompanies() {
	const query="SELECT * FROM Company"
	db.all(query, function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
})

router.use(function getOneCompany(id){
	const query="SELECT * FROM Company WHERE id=?"
	db.all(query,[id], function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
})

router.use(function getAllApplications() {
	const query="SELECT * FROM Application"
	db.all(query, function(error,applications){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(applications)
		}
	})
})

router.use(function getOneApplication() {
	const query="SELECT * FROM Application WHERE id=?"
	db.all(query,[id], function(error,applications){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(applications)
		}
	})
})

module.exports = router

