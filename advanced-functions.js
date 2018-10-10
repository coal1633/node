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

router.get("/skills",function getAllSkills(req,res){
	const query="SELECT * FROM Skill"
	db.all(query, function(error,skills){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(skills)
		}
	})
})

router.get("/skills/:id",function getOneSkill(req,res){
	const id=parseInt(req.params.id)
	const query="SELECT * FROM Skill WHERE id=?"
	db.all(query,[id], function(error,skills){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(skills)
		}
	})
})

router.get("/users",function getAllUsers(req,res) {
	const query="SELECT * FROM User"
	db.all(query, function(error,users){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(users)
		}
	})
})

router.get("/users/:id",function getOneUser(req,res){
	const id=parseInt(req.params.id)
	const query="SELECT * FROM User WHERE id=?"
	db.all(query,[id], function(error,users){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(users)
		}
	})
})

router.get("/companies", function getAllCompanies(req,res) {
	const query="SELECT * FROM Company"
	db.all(query, function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
})

router.get("/companies/:id",function getOneCompany(req,res){
	const id=parseInt(req.params.id)
	const query="SELECT * FROM Company WHERE id=?"
	db.all(query,[id], function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
})

router.get("/application",function getAllApplications(req,res) {
	const query="SELECT * FROM Application"
	db.all(query, function(error,applications){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(applications)
		}
	})
})

router.get("/application/:id",function getOneApplication(req,res) {
	const id=parseInt(req.params.id)
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

