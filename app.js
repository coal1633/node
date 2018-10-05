const express = require('express')
const sqlite3 = require('sqlite3')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const db = new sqlite3.Database("database.db")

db.run("PRAGMA foreign_keys = ON")

db.run(`
  CREATE TABLE IF NOT EXISTS Company (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name VARCHAR(20) UNIQUE,
		hashedPassword VARCHAR(15),
		location TEXT
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS User (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username VARCHAR(20) UNIQUE,
		hashedPassword VARCHAR(15)
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Advert (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		company_id INTEGER,
		title TEXT,
		sector VARCHAR(30),
		type TEXT,
		description TEXT,
		location VARCHAR(50),
		FOREIGN KEY(\`company_id\`) REFERENCES \`Company\`(\`id\`) ON DELETE CASCADE
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Skill (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_name VARCHAR(20) UNIQUE
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS UserSkill (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_id INTEGER,
		user_id INTEGER,
		FOREIGN KEY(\`skill_id\`) REFERENCES \`Skill\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`user_id\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE
	)
`)
db.run(`
  CREATE TABLE IF NOT EXISTS AdvertSkill (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_id INTEGER,
		advert_id INTEGER,
		FOREIGN KEY(\`skill_id\`) REFERENCES \`Skill\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`advert_id\`) REFERENCES \`Advert\`(\`id\`) ON DELETE CASCADE
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Aplication(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		company_id INTEGER,
		advert_id INTEGER,
		FOREIGN KEY(\`user_id\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`company_id\`) REFERENCES \`Company\`(\`id\`) ON DELETE CASCADE,
		FOREIGN KEY(\`advert_id\`) REFERENCES \`Advert\`(\`id\`) ON DELETE CASCADE
	)
`)

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

/* 
app.use(function corsMiddleware(req, res, next){
 res.header("Access-Control-Allow-Origin", "*")
 res.header("Access-Control-Allow-Methods", "*")
 res.header("Access-Control-Allow-Headers", "*")
 res.header("Access-Control-Expose-Headers", "*")
 next()
}) */

function validateAdvert(ad,user_type){
	var err = []
	var valid=false

	if(ad.title.length<=0){
		err.push('nameTooShort')
	}
	if( ad.title.length>20){
		err.push('nameTooLong')
	}
	if(ad.description.length<10){
		err.push('descriptionTooShort')
	}
	if(ad.description.length>1000){
		err.push('descriptionTooLong')
	}
	if(user_type=="user"){
		err.push('invalidCreator')
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
	//return user type
}
	


//Retriving all adverts
app.get("/adverts", function(req, res){
	let query ="SELECT * FROM Advert"
	let values = []
	let title = req.query.title
	let sector = req.query.sector
	let location  = req.query.location
	let type = req.query.type

	console.log(req.query)
	//skill but not here
	if(req.query != ""){

		query+=" WHERE"
	}
	if(title){
		query+=" title = ?"
		values.push(title.toLowerCase())
	}else if(sector){
		query+=" sector=?"
		values.push(sector.toLowerCase())
	}else if(location){
		query+=" location =?"
		values.push(location.toLowerCase())
	}else if(type){
		query+=" type=?"
		values.push(type.toLowerCase())
	}
	
 	db.all(query,values, function(error, posts){
	 	if(error){
			console.log(query)
	 		res.status(500).end()
	 	}else{
			console.log(query)
	 	   res.status(200).json(posts)
	 	}
 	})
})

//Retriving a specific advert based on id, including skills
app.get("/adverts/:id", function(req, res){
	const id = parseInt(req.params.id)
	const query1 = "SELECT * FROM Advert WHERE id=?"
	//req.headers.name-header
	//req.get(Content-Type)
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
app.get("/adverts-skill", function(req, res){
	const skill = req.query.skill
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
	const location = req.body.location
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

const jwtSecret = "dsjlksdjlkjfdsl"

//Getting a token for logging in 

// how can I be sure that an user cant make an advert?
app.post("/token", function(req, res){
	
	const grant_type = req.body.grant_type
	const name = req.body.username
	const hashedPassword = req.body.password
	const user_type=req.body.user_type

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
	//verify the user type
 	if(valid){
 		const query = "INSERT INTO Advert(company_id, title, sector, type, description, location) VALUES (?,?,?,?,?,?)"
 		const values=[tokenAccountId, advert.title, advert.sector, advert.type, advert.description, advert.location]
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

//create user friendly text for error

// what about the application table

//Retrive user skills ************** do otthers need to be able to access it?

//you need to send id with the request. is there a better easier way
app.get("/user-skills", function(req, res){
	const tokenAccountId = authorize(req,res,req.query.id);

	const query = `SELECT * FROM Skill 
	JOIN UserSkill ON Skill.id=UserSkill.skill_id
	WHERE user_id=?`
 	db.get(query,[tokenAccountId], function(error, skills){
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
	const tokenAccountId = authorize(req,res);
	const query1 ="SELECT * UserSkill WHERE user_id="+tokenAccountId
	const query2 ="SELECT * AdvertSkill"
	const query3 ="SELECT * Advert"
	let order=[]
	let overlap=[]


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

})


//Create user-skill
//Do I always need to send the id of the person who is logged in? Workaround or maybe a session-cookie
app.post("/user-skill", function(req, res){
	const tokenAccountId = authorize(req,res);
 
 		const query = "INSERT INTO UserSkill(user_id, skill_id) VALUES (?,?)"
 		const values=[tokenAccountId,req.body.skill_id]
 		db.run(query,values,function(error){
			if (error) {
				res.status(500).end()

			}else{
				res.status(201).end()
			}
		})
})

//Create advert-skill
app.post("/advert-skill", function(req, res){
	const tokenAccountId = authorize(req,res);
 
 		const query = "INSERT INTO AdvertSkill(advert_id, skill_id) VALUES (?,?)"
 		const values=[req.body.advert_id,req.body.skill_id]
 		db.run(query,values,function(error){
			if (error) {
				res.status(500).end()

			}else{
				res.status(201).end()
			}
		})
})



//Update advert if you are logged in as the company that created it **********

app.put("/advert/:id", function(req, res){
	const tokenAccountId = authorize(req,res);
	const id = req.params.id
	const advert = req.body
	const valid=validateAdvert(advert)
	
	// Go ahead and update the resource.
	const query = `
		UPDATE Advert SET title=?, sector=? , type=? , description=? , location= ?
		WHERE id = ?
	`
	const values = [advert.title, advert.sector, advert.type, advert.description, advert.location, id]
	console.log(query)
	db.run(query, values, function(error){
		console.log(values)
		if(error){
			res.status(500).end()
		}else{

			res.status(200).end()
		}
	})

})

/*
//Update company location or name *********
app.put("/company-accounts/:id", functionreq,res){
	const tokenAccountId = authorize(req,res);
	const id = req.params.id
	const name=req.body.name
	const location=req.body.location
	let query="UPDATE Company SET"
	if (!name=='null' && location='null'){
		query+= "name= ?"
	}
	if(!location=='null' && name='null'){
		query+= "location= ?"
	}
	if(!name=='null' && !location='null'){
		query+="name= ?, location = ?"
	}

	query+= "WHERE id = ?"

	const values = [name,location,id]

	db.run(query, values, function(error){
		if(error){
			res.status(500).end()
		}else{
			res.status(204).end()
		}
	})

})*/

//Update password ********
app.put("/password", function(req,res){
	const tokenAccountId = authorize(req,res);
	const saltRounds=10
	const newPassword=req.body.password
	const user_type=req.body.user_type
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

//Delete company account -**************
app.delete("/company-accounts/:id", function(req,res){
	const tokenAccountId = authorize(req,res);
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
})

//Delete user account*******
app.delete("/user-accounts/:id", function(req,res){
	const tokenAccountId = authorize(req,res);
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
})

//Delete advert if you are logged in as the company that created it
app.delete("/adverts/:id", function(req,res){
	const tokenAccountId = authorize(req,res);
	const id=req.body.id
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
})

//Delete user-skill***********
app.delete("/user-skill/:id", function(req,res){
	const tokenAccountId = authorize(req,res);
	const skill_id=req.body.skill_id
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
})

//Delete advert-skill***********
app.delete("/advert-skill/:id", function(req,res){
	const tokenAccountId = authorize(req,res);
	const advert_id=req.body.id
	const skill_id=req.body.skill_id
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
})


//Change data so it is not case sensistive
//add the functionality that you can search for more then one column at a time (filters)
app.listen(3000)



//get through function data from database that you just need
