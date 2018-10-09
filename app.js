const express = require('express')
const bodyParser = require('body-parser')
require('body-parser-xml')(bodyParser)
const jwt = require('jsonwebtoken')
const https = require('https')
const bcrypt = require('bcryptjs')
require('./database-structure')


const app = express()

const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("database.db")

app.use(bodyParser.json())

app.use(bodyParser.xml({
  limit: '1MB',   
  xmlParseOptions: {
    normalize: true,     
    normalizeTags: true, 
    explicitArray: false 
  }
}))

app.use(function(req, res, next){
	let contentType = req.headers['content-type'];
	if(contentType=="application/xml"){
		req.body = req.body[Object.keys(req.body)[0]]
	}
	next()
})

app.use(bodyParser.urlencoded({extended: false}))
const jwtSecret = "dsjlksdjlkjfdsl"



function validateAdvert(ad,user_type){
	var err = []
	var valid=false

	if(ad.title.length<=0){
		err.push({'titleTooShort':'Please provide a shorter title'})
	}
	if( ad.title.length>20){
		err.push({'titleTooLong':'Please provide a longer title'})
	}
	if(ad.description.length<10){
		err.push({'descriptionTooShort': 'Please provide a shorter description'})
	}
	if(ad.description.length>1000){
		err.push({'descriptionTooLong': 'Please provide a longer description'})
	}
	if(ad.sector.length<1){
		err.push({'sectorTooShort': 'Please provide a shorter sector'})
	}
	if(ad.sector.length>100){
		err.push({'sectorTooLong': 'Please provide a longer sector'})
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

	if(tokenAccountId != accountId){
		res.status(401).end()
		return
	}
	return {tokenAccountId, user_type}
}
	




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

//Retriving specific adverts based on certain skill 
app.get("/advert-skills", function(req, res){
	const skill = req.query.skill.toLowerCase()
	const query = `
		SELECT * FROM Advert
		JOIN AdvertSkill ON Advert.id=AdvertSkill.advert_id
		JOIN Skill ON AdvertSkill.skill_id=Skill.id
		WHERE skill_name=?
	`
 	db.all(query,[skill], function(error, adverts){
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
	let valid = true

	if(name.length<5){
		res.status(400).json({"usernameTooShort":"Please provide a longer username"})
		valid=false
	}
	if(name.length>50){
		res.status(400).json({"usernameTooLong":"Please provide a shorter username"})
		valid=false
	}


	const query = `INSERT INTO User (username, hashedPassword) VALUES (?,?)`
	const values = [username, theHash]
	if(valid){
		db.run(query, values, function(error){
			if(error){
				res.status(500).end()
			}else{
				res.setHeader("Location", "/users/"+this.lastID)
				res.status(201).end()
			}
		})
	}


})

//Create an Company Account
app.post("/company-accounts", function(req, res){
	const saltRounds = 10
	const name = req.body.username
	const password = req.body.password
	const location = req.body.location.toLowerCase()
	const theHash = bcrypt.hashSync(password, saltRounds)
	let valid = true

	if(name.length<5){
		res.status(400).json({"usernameTooShort":"Please provide a longer username"})
		valid=false
	}
	if(name.length>50){
		res.status(400).json({"usernameTooLong":"Please provide a shorter username"})
		valid=false
	}

	const query = `
		INSERT INTO Company (name, hashedPassword, location)
		VALUES (?,?,?)
	`
	const values = [name, theHash, location]

	if(valid){
		db.run(query, values, function(error){
		if(error){
			res.status(500).end()
		}else{
			res.setHeader("Location", "/company-accounts/"+this.lastID)
			res.status(201).end()
		}
	})
	}
	

})

//Getting a token for logging in 
app.post("/token", function(req, res){
	
	const grant_type = req.body.grant_type.trim()
	const name = req.body.username
	const hashedPassword = req.body.password
	const googleId=req.body.google_id
	const user_type=req.body.user_type

    let query
    let values

	if(grant_type=="password"){

		if(user_type=='company'){
			query = `SELECT * FROM Company WHERE name = ?`
			values = [name]
		}else if(user_type=='user'){
			query = `SELECT * FROM User WHERE username = ?`
			values = [name]
		}else{
			res.status(400).json({error: "invalid_request"})
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
	}else if(grant_type=="authorization_code"){
		const yourCode = req.body.code
		const client_id = "447167448806-fg9acf7ibl8fndhovnhljgultltbj617.apps.googleusercontent.com"
		const client_secret = "Cv7kE4o34_ZCdGH42P0jB0s2"
		const redirect_uri = "http://luntern-node.com/redirect-by-google" 
		const url= "code="+yourCode+"&client_id="+client_id+"&client_secret="+client_secret+"&redirect_uri="+redirect_uri+"&grant_type=authorization_code"
		
		let post_options = {
		    host: 'www.googleapis.com',
		    path: '/oauth2/v4/token',
		    method: 'POST',
		    headers: {
		        'Content-Type': 'application/x-www-form-urlencoded'
			},
		};
		let arr=[]
		let id_token
		let sub
		let post_req = https.request(post_options, function(response) {
		    response.on('data', function (answer) {
				arr.push(answer)
			});
			response.on("end",function(){
				var arrayString=Buffer.concat(arr)
				var data = arrayString.toString('utf8')
				var body = JSON.parse(data)
				id_token = body.id_token

				var decoded = jwt.decode(id_token);
				// get the decoded payload and header
				var decoded = jwt.decode(id_token, {complete: true});
				sub = decoded.payload.sub


				const query = `SELECT * FROM User WHERE google_id = ?`
				db.get(query, sub, function(error,account){
					if(error){
						res.status(500).end()
					}else if(!account){
						res.status(400).json({error: "invalid_client"})
					}else{
						if(sub==account.google_id){
							const accessToken = jwt.sign({accountId: account.id, userType: "user"}, jwtSecret)
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
		});
		
		post_req.write(url)
		
		post_req.on("error", (e)=>{
			console.log(e)
		})
		post_req.end()
	}


	

})


//Create an advert when you are logged in as a company
app.post("/adverts", function(req, res){
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


//Retrive user skills 
app.get("/user-skills/:id", function(req, res){
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

//Retrive user skills 
app.get("/advert-skills/:id", function(req, res){
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



//Retrive adverts based on the overlay between advert skill and user skill for the user that is logged in 
function getOccurrence(array, value) {
    return array.filter((v) => (v === value)).length;
}

app.get("/adverts-user/:id", function(req, res){
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

//Create user-skill
app.post("/user-skills", function(req, res){
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


//Create advert-skill
app.post("/advert-skills", function(req, res){
	const accountData=authorize(req,res,req.body.id);
	const tokenAccountId = accountData.tokenAccountId
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
})

//Create an application
app.post("/applications/:id", function(req, res){
	const advert_id=parseInt(req.params.id)
	const accountData=authorize(req,res,req.body.id);
	const company_id= req.body.company_id
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type
 	
 	if(user_type=="user"){
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


//Update company location or name 
app.put("/company-accounts/:id", function(req,res){
	const id = parseInt(req.params.id)

	const accountData=authorize(req,res,id);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	let name=req.body.name
	let location=req.body.location

	let query="UPDATE Company SET "
	let values=[]

	if (name && !location){
		query+= "name= ?"
		values.push(name.toLowerCase())
	}
	if(location && !name){
		query+= "location= ?"
		values.push(location.toLowerCase())
	}
	if(name && location){
		query+="name= ?, location = ?"
		values.push(name.toLowerCase())
		values.push(location.toLowerCase())
	}

	query+= "WHERE id = ?"
	
	values.push(tokenAccountId)

	if(user_type=="company"){
		db.run(query, values, function(error){
			if(error){
				res.status(500).end()
			}else{
				res.status(202).end()
			}
		})
	}else{
		res.status(401).end()
	}
})

//Update password 
app.put("/password/:id", function(req,res){
	const accountId=parseInt(req.params.id)
	const accountData=authorize(req,res,accountId);
	const tokenAccountId = accountData.tokenAccountId
	const user_type=accountData.user_type

	const saltRounds=10
	const newPassword=req.body.password
	const theHash = bcrypt.hashSync(newPassword, saltRounds)


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
			res.status(202).end()
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
					res.status(200).end()
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
					res.status(200).end()
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

//Delete user-skill
app.delete("/user-skills", function(req,res){
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


//Delete advert-skill
app.delete("/advert-skills", function(req,res){
	const skill_id=req.body.skill_id
	const accountData=authorize(req,res,req.body.company_id);
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
					res.status(200).end()
				}
			}
		})
	}else{
		res.status(401).end()
	}
})


// POST /oauth2/v4/token HTTP/1.1
// Host: www.googleapis.com
// Content-Type: application/x-www-form-urlencoded
app.post("/oauth2/v4/token", function(req, res){

		const yourCode = req.body.code
		const client_id = "447167448806-fg9acf7ibl8fndhovnhljgultltbj617.apps.googleusercontent.com"
		const client_secret = "Cv7kE4o34_ZCdGH42P0jB0s2"
		const redirect_uri = "http://luntern-node.com/redirect-by-google" 
		const url= "code="+yourCode+"&client_id="+client_id+"&client_secret="+client_secret+"&redirect_uri="+redirect_uri+"&grant_type=authorization_code"
		
		let post_options = {
		    host: 'www.googleapis.com',
		    path: '/oauth2/v4/token',
		    method: 'POST',
		    headers: {
		        'Content-Type': 'application/x-www-form-urlencoded'
			},
		};
		let arr=[]
		let id_token
		let sub
		let post_req = https.request(post_options, function(response) {
		    response.on('data', function (answer) {
				arr.push(answer)
			});
			response.on("end",function(){
				var arrayString=Buffer.concat(arr)
				var data = arrayString.toString('utf8')
				var body = JSON.parse(data)
				id_token = body.id_token

				var decoded = jwt.decode(id_token);

				// get the decoded payload and header
				var decoded = jwt.decode(id_token, {complete: true});
				sub = decoded.payload.sub


				const query = `INSERT INTO User (google_id) VALUES (?)`
				db.run(query, sub, function(error){
					if(error){
						if(error = "SQLITE_CONSTRAINT: UNIQUE constraint failed: User.google_id") {
							res.status(400).json({error: "GoogleId_not_unique"})
						} else{
							res.status(500).end()
						}
					}else{
						res.status(200).end()
					}
				})
				
			})
		});
		
		post_req.write(url)
		
		post_req.on("error", (e)=>{
			console.log(e)
		})
		post_req.end()
		
})



function getAllSkills(){
	const query="SELECT * FROM Skill"
	db.all(query, function(error,skills){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(skills)
		}
	})
}
function getOneSkill(id){
	const query="SELECT * FROM Skill WHERE id=?"
	db.all(query,[id], function(error,skills){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(skills)
		}
	})
}


function getAllUsers() {
	const query="SELECT * FROM User"
	db.all(query, function(error,users){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(users)
		}
	})
}

function getOneUser(id){
	const query="SELECT * FROM User WHERE id=?"
	db.all(query,[id], function(error,users){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(users)
		}
	})
}
function getAllCompanies() {
	const query="SELECT * FROM Company"
	db.all(query, function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
}

function getOneCompany(id){
	const query="SELECT * FROM Company WHERE id=?"
	db.all(query,[id], function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
}
function getAllApplications() {
	const query="SELECT * FROM Application"
	db.all(query, function(error,applications){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(applications)
		}
	})
}
function getOneApplication() {
	const query="SELECT * FROM Application WHERE id=?"
	db.all(query,[id], function(error,applications){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(applications)
		}
	})
}

app.listen(3000)



//Can we skip in the table code of the report how it would look like for xml
