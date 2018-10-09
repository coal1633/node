var express = require('express')
var router = express.Router()
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("database.db")

//Retrive user skills 
router.get("/user-skills/:id", function(req, res){
	const user_id = parseInt(req.params.id)

	const query = `SELECT * FROM Skill 
	JOIN UserSkill ON Skill.id=UserSkill.skill_id
	WHERE user_id=?`

 	db.all(query,[user_id], function(error, skills){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 	    res.status(200).json(skills)
	 	}
 	})
})

//Create user-skills
router.post("/user-skills", function(req, res){
	const user_id=req.body.id
	const accountData=authorize(req,res,user_id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type
 	
 	if(user_type=="user"){
 		const query = "INSERT INTO UserSkill(user_id, skill_id) VALUES (?,?)"
 		const values = [tokenAccountId, req.body.skill_id]
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

//Delete user-skills
router.delete("/user-skills", function(req,res){
	const skill_id=req.body.skill_id
	const accountData=authorize(req,res,req.body.user_id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	if(user_type=="user"){
		db.run("DELETE FROM UserSkill WHERE user_id = ? and skill_id=?", [tokenAccountId,skill_id], function(error){
			if(error){
				res.status(500).end()
			}else{
				const numberOfDeletetRows = this.changes
				if(numberOfDeletetRows == 0){
					res.status(404).end()
				}else{
					res.status(200).end()
				}
			}
		})
	}else{
		res.status(401).end()
	}
})

module.exports = router