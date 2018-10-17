var express = require('express')
var router = express.Router()
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("database.db")
const bodyParser = require('body-parser')

var authorize = require('./authorize.js');

router.use(bodyParser.json())
router.use(bodyParser.xml({
  limit: '1MB',   
  xmlParseOptions: {
    normalize: true,     
    normalizeTags: true, 
    explicitArray: false 
  }
}))


//Retrive all skills of an advert 
router.get("/advert-skills/:id", function(req, res){
	const advert_id = parseInt(req.params.id)

	const query = `SELECT * FROM Skill 
	JOIN AdvertSkill ON Skill.id=AdvertSkill.skill_id
	WHERE advert_id=?`

 	db.all(query,[advert_id], function(error, skills){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 	    res.status(200).json(skills)
	 	}
 	})
})


//Create advert-skill
router.post("/advert-skills", function(req, res){
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
	if(accountData){
		const user_type=accountData.user_type
 
	 	if(user_type=="company"){
	 		const query = "INSERT INTO AdvertSkill(advert_id, skill_id) VALUES (?,?)"
	 		const values=[req.body.advert_id,req.body.skill_id]
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
	}

})

//Delete advert-skill
router.delete("/advert-skills", function(req,res){
	const skill_id=req.body.skill_id
	const accountData=authorize(req,res,req.body.company_id);
	if(accountData){
		const tokenAccountId = accountData.tokenAccountId
		const user_type=accountData.user_type
		const advert_id=req.body.advert_id

		const query="DELETE FROM AdvertSkill WHERE advert_id =? and skill_id=?"
		if(user_type=="company"){
			db.run(query, [advert_id,skill_id], function(error){
				if(error){
					res.status(500).end()
				}else{
					const numberOfDeletetRows = this.changes
					if(numberOfDeletetRows == 0){
						res.status(404).end()
					}else{
						res.status(204).end()
					}
				}
			})
		}else{
			res.status(401).end()
		}
	}
	
})

module.exports = router