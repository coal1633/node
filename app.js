const express = require('express')
const bodyParser = require('body-parser')
require('body-parser-xml')(bodyParser)
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

require('./database-structure')

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.xml({
  limit: '1MB',   // Reject payload bigger than 1 MB
  xmlParseOptions: {
    normalize: true,     // Trim whitespace inside text nodes
    normalizeTags: true, // Transform tags to lowercase
    explicitArray: false // Only put nodes in array if >1
  }
}))
app.use(bodyParser.urlencoded({extended: false}))
const jwtSecret = "dsjlksdjlkjfdsl"

function validateAdvert(ad,user_type){
	var err = []
	var valid=false

	if(ad.title.length<=0){
		err.push({'nameTooShort':'Please provide a shorter name'})
	}
	if( ad.title.length>20){
		err.push({'nameTooLong':'Please provide a longer name'})
	}
	if(ad.description.length<10){
		err.push({'descriptionTooShort': 'Please provide a shorter description'})
	}
	if(ad.description.length>1000){
		err.push({'descriptionTooLong': 'Please provide a longer description'})
	}
	if(user_type=="user"){
		err.push({'invalidCreator':'You are not allowed to access adverts'})
	}
 	if(err.length==0){
 		valid=true
 	}

 	return {valid,err}
}

function authorize(req,res,accountId){
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
	console.log(tokenAccountId, accountId)
	if(tokenAccountId != accountId){
		res.status(401).end()
		return
	}
	return {tokenAccountId, user_type}
}
	


//Retriving all adverts
app.get("/adverts", function(req, res){
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
app.get("/adverts/:id", function(req, res){
	const id = parseInt(req.params.id)
	const query1 = "SELECT * FROM Advert WHERE id=?"
 	db.get(query1,[id], function(error, adverts){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 		const query2= `SELECT skill_name FROM Skill 
			JOIN AdvertSkill ON Skill.id=AdvertSkill.skill_id
			WHERE advert_id=?`
		 	db.get(query2,[id], function(error, skills){
			 	if(error){
			 		res.status(404).end()
			 	}else{
			 	    res.status(200).json({adverts,skills})
			 	}
		 	})
	 	}
 	})
})

//Retriving specific adverts based on certain skill 
app.get("/advert-skills", function(req, res){
	const skill = req.query.skill.toLowerCase()
	const query = `
		SELECT * FROM Advert
		JOIN AdvertSkill ON Advert.id=AdvertSkill.advert_id
		JOIN Skill ON AdvertSkill.skill_id=Skill.id
		WHERE skill_name=?
	`
 	db.get(query,[skill], function(error, adverts){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 	    res.status(200).json(adverts)
	 	}
 	})
})



//Create an User Account
app.post("/user-accounts", function(req, res){
	const saltRounds = 10
	const username = req.body.username
	const password = req.body.password
	const theHash = bcrypt.hashSync(password, saltRounds)

	const query = `INSERT INTO User (username, hashedPassword) VALUES (?,?)`
	const values = [username, theHash]

	db.run(query, values, function(error){
		if(error){
			res.status(500).end()
		}else{
			res.setHeader("Location", "/users/"+this.lastID)
			res.status(201).end()
		}
	})

})

//Create an Company Account
app.post("/company-accounts", function(req, res){
	const saltRounds = 10
	const name = req.body.username
	const password = req.body.password
	const location = req.body.location.toLowerCase()
	const theHash = bcrypt.hashSync(password, saltRounds)

	const query = `
		INSERT INTO Company (name, hashedPassword, location)
		VALUES (?,?,?)
	`
	const values = [name, theHash, location]

	db.run(query, values, function(error){
		if(error){
			res.status(500).end()
			console.log(error, password)
		}else{
			res.setHeader("Location", "/company-accounts/"+this.lastID)
			res.status(201).end()
		}
	})

})

//Getting a token for logging in 
app.post("/token", function(req, res){
	
	const grant_type = req.body.grant_type
	const name = req.body.username
	const hashedPassword = req.body.password
	const user_type=req.body.user_type.toLowerCase()

    let query
    let values

	if(user_type=='company'){
		query = `SELECT * FROM Company WHERE name = ?`
		values = [name]
	}else if(user_type=='user'){
		query = `SELECT * FROM User WHERE username = ?`
		values = [name]
	}else{
		res.status(400).end()
	}	

	db.get(query, values, function(error, account){
		if(error){
			res.status(500).end()
		}else if(!account){
			res.status(400).json({error: "invalid_client"})
		}else{
			if(bcrypt.compareSync(hashedPassword,account.hashedPassword)){

				const accessToken = jwt.sign({accountId: account.id, userType: user_type}, jwtSecret)
				const idToken = jwt.sign({sub:account.id,preferred_username: name}, jwtSecret)

				res.status(200).json({
					access_token: accessToken,
					token_type: "Bearer",
					id_token:idToken	
				})

			}else{
				res.status(400).json({error: "invalid_client"})
			}
		}
	})

})


//Create an advert when you are logged in as a company
app.post("/adverts", function(req, res){
	const advert = req.body
	const accountData = authorize(req,res,advert.id);
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



//Retrive user skills 
app.get("/user-skills/:id", function(req, res){
	const id = parseInt(req.params.id)

	const query = `SELECT * FROM Skill 
	JOIN UserSkill ON Skill.id=UserSkill.skill_id
	WHERE user_id=?`

 	db.get(query,[id], function(error, skills){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 	    res.status(200).json(skills)
	 	}
 	})
})

//Retrive adverts based on the overlay between advert skill and user skill for the user that is logged in 
function getOccurrence(array, value) {
    return array.filter((v) => (v === value)).length;
}

app.get("/adverts-user", function(req, res){
	const accountData=authorize(req,res,req.query.id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	const query1 ="SELECT * UserSkill WHERE user_id="+tokenAccountId
	const query2 ="SELECT * AdvertSkill"
	const query3 ="SELECT * Advert"
	let order=[]
	let overlap=[]

	if(user_type=="user"){
		db.all(query1, function(error, userSkills){
	 		db.all(query2, function(error, advertSkills){
		 		db.all(query, function(error, adverts){
		 		for (let i = 0; i<=userSkills.length; i++) {
			 		for(let k=0; k<=advertSkills.length;k++){
			 			if (userSkills[i]==advertSkills[k]) {
			 				overlap.push(advertSkills[i].advert_id)
			 			}
			 		}
			 	}
			 	for (let i = 0; i<=adverts.length; i++) {
			 		let value=getOccurrence(overlap,adverts.id[i])
			 		order.push(value,advert_id[i])
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


//Create user-skill
app.post("/user-skills", function(req, res){
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type
 	
 	if(user_type="user"){
 		const query = "INSERT INTO UserSkill(user_id, skill_id) VALUES (?,?)"
 		const values=[tokenAccountId,req.body.skill_id]
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

//Create advert-skill
app.post("/advert-skills", function(req, res){
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type
 
 	if(user_type="company"){
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
})

//Create an application
app.post("/applications/:id", function(req, res){
	const advert_id=parseInt(req.params.id)
	const accountData=authorize(req,res,req.body.id);
	const company_id= req.body.company_id
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type
 	
 	if(user_type="user"){
 		const query = "INSERT INTO Application(user_id, company_id, advert_id) VALUES (?,?,?)"
 		const values=[tokenAccountId,company_id,advert_id]
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


//Update advert if you are logged in as the company that created it 
app.put("/adverts/:id", function(req, res){
	const id = req.params.id
	const advert = req.body
	const accountData=authorize(req,res,req.body.id);
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
	 		if(creator_id==tokenAccountId){
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

//Update company location or name 
app.put("/company-accounts/:id", function(req,res){
	const id = parseInt(req.params.id)

	const accountData=authorize(req,res,id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	let name=req.body.name
	let location=req.body.location

	let query="UPDATE Company SET"
	let values=[]

	if (name!='undefined' && location=='undefined'){
		query+= "name= ?"
		values.push(name.toLowerCase())
	}
	if(location!='undefined' && name=='undefined'){
		query+= "location= ?"
		values.push(location.toLowerCase())
	}
	if(name!='undefined' && location!='undefined'){
		query+="name= ?, location = ?"
		values.push(name.toLowerCase())
		values.push(location.toLowerCase())
	}

	query+= "WHERE id = ?"
	
	values.push(tokenAccountId)

	if(user_type="company"){
		db.run(query, values, function(error){
			if(error){
				res.status(500).end()
			}else{
				res.status(204).end()
			}
		})
	}else{
		res.status(401).end()
	}
})

//Update password 
app.put("/password", function(req,res){
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	const saltRounds=10
	const newPassword=req.body.password
	const theHash = bcrypt.hashSync(password, saltRounds)


	if(user_type=='company'){
		query = `UPDATE Company SET hashedPassword= ? WHERE id=?`
	}else if(user_type=='user'){
		query = `UPDATE User SET hashedPassword= ? WHERE id=?`
	}else{
		res.status(400).end()
	}	
	const values = [theHash,tokenAccountId]

	db.run(query, values, function(error){
		if(error){
			res.status(500).end()
		}else{
			res.status(204).end()
		}
	})

})

//Delete company account
app.delete("/company-accounts/:id", function(req,res){
	const id=parseInt(req.params.id)
	const accountData=authorize(req,res,id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	if(user_type=="company"){
		db.run("DELETE FROM Company WHERE id = ?", [tokenAccountId], function(error){
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
	
})

//Delete user account
app.delete("/user-accounts/:id", function(req,res){
	const id=parseInt(req.params.id)
	const accountData=authorize(req,res,id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	if(user_type=="user"){
		db.run("DELETE FROM User WHERE id = ?", [tokenAccountId], function(error){
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
})

//Delete advert if you are logged in as the company that created it
app.delete("/adverts/:id", function(req,res){
	const id=parseInt(req.params.id)
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	if(user_type=="company"){
		const query1='SELECT company_id form Advert WHERE id=?'
		db.get(query1,[id], function(error, creator_id){
			if(error){
				res.status(500).end()
			}else{
				if(creator_id==tokenAccountId){
					db.run("DELETE FROM Advert WHERE id = ?", [id], function(error){
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
		
	}else{
		res.status(401).end()
	}
})

//Delete user-skill
app.delete("/user-skills/:id", function(req,res){
	const skill_id=parseInt(req.params.id)
	const accountData=authorize(req,res,req.body.id);
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
					res.status(204).end()
				}
			}
		})
	}else{
		res.status(401).end()
	}
})

//Delete advert-skill
app.delete("/advert-skills/:id", function(req,res){
	const skill_id=parseInt(req.params.id)
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type
	const advert_id=req.body.advert_id

	if(user_type=="company"){
		db.run("DELETE FROM UserSkill WHERE advert_id = ? and skill_id=?", [advert_id,skill_id], function(error){
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
})
app.listen(3000)


//functions
//get all skillls available
//get all sectors
//get all users
//get all companies
//get all applications