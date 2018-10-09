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

router.get("/adverts", function(req, res){
	let query =""
	let values = []
	let title = req.query.title
	let sector = req.query.sector
	let location  = req.query.location
	let type = req.query.type
	let contentType = req.headers['content-type'];
		if(title){
			query+=" title = ? AND"
			values.push(title.toLowerCase())
		}
		if(sector){
			query+=" sector=? AND"
			values.push(sector.toLowerCase())
		}
		if(location){
			query+=" location =? AND"
			values.push(location.toLowerCase())
		}
		if(type){
			query+=" type=? AND"
			values.push(type.toLowerCase())
		}
		if(values!=""){
			query = "SELECT * FROM Advert WHERE" + query
			query = query.slice(0,-3)
		}else{
			query ="SELECT * FROM Advert"
	}

 	db.all(query,values, function(error, posts){
	 	if(error){
	 		res.status(500).end()
	 	}else{
	 		if(posts!=""){
	 			res.status(200).json(posts)
	 		}else{
	 			res.status(200).json({'noEntriesFound':'There are no adverts that fulfil the criteria'})
	 		}
	 	}
 	})
})

//Retriving a specific advert based on id, including skills
router.get("/adverts/:id", function(req, res){
	const id = parseInt(req.params.id)
	const query1 = "SELECT * FROM Advert WHERE id=?"
 	db.get(query1,[id], function(error, adverts){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 		const query2= `SELECT skill_name FROM Skill 
			JOIN AdvertSkill ON Skill.id=AdvertSkill.skill_id
			WHERE advert_id=?`
		 	db.all(query2,[id], function(error, skills){
			 	if(error){
			 		res.status(404).end()
			 	}else{
			 	    res.status(200).json({adverts,skills})
			 	}
		 	})
	 	}
 	})
})

//Create an advert when you are logged in as a company
router.post("/adverts", function(req, res){
	const advert = req.body
	const accountData = authorize(req,res,advert.company_id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	const validData = validateAdvert(advert,user_type)
	const valid=validData.valid
	const err=validData.err

 	if(valid){
 		const query = "INSERT INTO Advert(company_id, title, sector, type, description, location) VALUES (?,?,?,?,?,?)"
 		const values=[tokenAccountId, advert.title.toLowerCase(), advert.sector.toLowerCase(), advert.type.toLowerCase(), advert.description, advert.location.toLowerCase()]
 		db.run(query,values,function(error){
			if (error) {
				res.status(500).end()
			}else{
				const id = this.lastID
				res.setHeader("Location", "/adverts/"+id)
				res.status(201).end()
			}
		})
 	}else{
 		res.status(400).json(err)
 	}

})

//Retrive adverts based on the overlay between advert skill and user skill for the user that is logged in 
function getOccurrence(array, value) {
    return array.filter((v) => (v === value)).length;
}

router.get("/adverts-user/:id", function(req, res){
	const user_id=parseInt(req.params.id)
	const accountData=authorize(req,res,user_id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	const query1 ="SELECT skill_id FROM UserSkill WHERE user_id="+tokenAccountId
	const query2 ="SELECT skill_id,advert_id FROM AdvertSkill"
	const query3 ="SELECT * FROM Advert"
	let order=[]
	let overlap=[]

	if(user_type=="user"){
		db.all(query1, function(error, userSkills){
	 		db.all(query2, function(error, advertSkills){
		 		db.all(query3, function(error, adverts){
		 		for (let i = 0; i<userSkills.length; i++) {
			 		for(let k=0; k<advertSkills.length;k++){
			 			if (userSkills[i].skill_id==advertSkills[k].skill_id) {
			 				overlap.push(advertSkills[k].advert_id)
			 			}
					 }
				}
			 	for (let i = 0; i<adverts.length; i++) {
					 let value=getOccurrence(overlap,adverts[i].id)
			 		 order.push({"value":value,"advert_id":adverts[i].id})
				}
			 	order.sort(function(a, b){return b.value - a.value}); 
			 	res.status(200).json(order)
			 	}) 
		 	})
	 	})
	}else{
		res.status(401).end()
	}
})

//Update advert if you are logged in as the company that created it 
router.put("/adverts/:id", function(req, res){
	const id = req.params.id
	const advert = req.body
	const company_id=req.body.company_id
	const accountData=authorize(req,res,company_id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	const validData = validateAdvert(advert,user_type)
	const valid=validData.valid
	const err=validData.err
	
	const query1 = "SELECT company_id FROM Advert WHERE id=?"
 	db.get(query1,[id], function(error, creator_id){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 		if(creator_id.company_id==tokenAccountId){
	 			const query2 = `
					UPDATE Advert SET title=?, sector=? , type=? , description=? , location= ?
					WHERE id = ?`
				const values = [advert.title.toLowerCase(), advert.sector.toLowerCase(), advert.type.toLowerCase(), advert.description, advert.location.toLowerCase(), id]
	 			if(valid){
					db.run(query2, values, function(error){
						if(error){
							res.status(500).end()
						}else{
							res.status(200).end()
						}
					})
				}else{
					res.status(400).json(err)
				}
	 		}else{
	 			res.status(401).end()
	 		}
	 	}
 	})

	
})

//Delete advert if you are logged in as the company that created it
router.delete("/adverts/:id", function(req,res){
	const id=parseInt(req.params.id)
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	if(user_type=="company"){
		const query1='SELECT company_id from Advert WHERE id=?'
		db.get(query1,[id], function(error, creator_id){
			if(error){
				res.status(500).end()
			}else{
				if(creator_id.company_id==tokenAccountId){
					db.run("DELETE FROM Advert WHERE id = ?", [id], function(error){
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
			}
		})
		
	}else{
		res.status(401).end()
	}
})

module.exports = router