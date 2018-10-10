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

module.exports = router

