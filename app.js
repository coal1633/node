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
		name VAR CHAR(20) UNIQUE,
		hashedPassword VAR CHAR(15),
		location TEXT
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS User (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username VAR CHAR(20) UNIQUE,
		hashedPassword VAR CHAR(15)
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Advert (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		company_id INTEGER,
		title TEXT UNIQUE,
		sector VAR CHAR(30),
		type TEXT,
		description TEXT,
		location VAR CHAR(50),
		FOREIGN KEY(\`company_id\`) REFERENCES \`Company\`(\`id\`) ON DELETE CASCADE
	)
`)

db.run(`
  CREATE TABLE IF NOT EXISTS Skill (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_name VAR CHAR(20) UNIQUE
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


app.use(function corsMiddleware(req, res, next){
 res.header("Access-Control-Allow-Origin", "*")
 res.header("Access-Control-Allow-Methods", "*")
 res.header("Access-Control-Allow-Headers", "*")
 res.header("Access-Control-Expose-Headers", "*")
 next()
})

function validateAdvert(ad){
	var err = []
	var valid=false

	if(ad.name.length<=0){
		err.push('nameTooShort')
	}
	if( ad.name.length>20){
		err.push('nameTooLong')
	}
	if(ad.description.length<10){
		err.push('descriptionTooShort')
	}
	if(ad.description.length>1000){
		err.push('descriptionTooLong')
	}
 	if(err.length==0){
 		valid=true
 	}

 	return valid
}

app.get("/adverts", function(req, res){
	const query = "SELECT * FROM Advert"
 	db.all(query, function(error, posts){
	 	if(error){
	 		res.status(500).end()
	 	}else{
	 	   res.status(200).json(posts)
	 	}
 	})
})


app.get("/adverts/:id", function(req, res){
	const id = parseInt(req.params.id)
	const query = "SELECT * FROM Advert WHERE id=?"
 	db.get(query,[id], function(error, adverts){
	 	if(error){
	 		res.status(404).end()
	 	}else{
	 	    res.status(200).json(adverts)
	 	}
 	})
})


//Create an User Account
app.post("/users", function(req, res){
	const saltRounds = 10
	const username = req.body.name
	const password = req.body.hashedPassword
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
app.post("/companies", function(req, res){
	const saltRounds = 10
	const name = req.body.name
	const password = req.body.hashedPassword
	const location = req.body.location
	const theHash = bcrypt.hashSync(password, saltRounds)

	const query = `
		INSERT INTO Company (name, hashedPassword,location)
		VALUES (?,?,?)
	`
	const values = [name, theHash,location]

	db.run(query, values, function(error){
		if(error){
			res.status(500).end()
		}else{
			res.setHeader("Location", "/companies/"+this.lastID)
			res.status(201).end()
		}
	})

})

const jwtSecret = "dsjlksdjlkjfdsl"

// POST /tokens
// Content-Type: application/x-www-form-urlencoded
// Body: grant_type=password&username=Alice&password=abc123&user_type=user
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
		query = `SELECT * FROM User WHERE name = ?`
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
			if(bcrypt.compareSync(account.hashedPassword,hashedPassword)){

				const accessToken = jwt.sign({accountId: account.id}, jwtSecret)

				res.status(200).json({
					access_token: accessToken,
					token_type: "Bearer"
				})

			}else{
				res.status(400).json({error: "invalid_client"})
			}
		}
	})

})
// POST /movies
// Content-Type: application/json
// Authorization: Bearer THE_ACCESS_TOKEN
// Body: {"title": "Shrek", "abstract": "Green ogre", "accountId": 123}
app.post("/adverts", function(req, res){
	const advert = req.body
	const authorizationHeader = req.get("Authorization")
	const accessToken = authorizationHeader.substr(7)

	let tokenAccountId = null
	try{
		const payload = jwt.verify(accessToken, jwtSecret)
		tokenAccountId = payload.accountId
	}catch(error){
		res.status(401).end()
		return
	}

	if(tokenAccountId != accountId){
		res.status(401).end()
		return
	}
	const valid = validateAdvert(advert)

 	if(valid){
 		const query = "INSERT INTO Advert(company_id, title, sector, type, description, location) VALUES (?,?,?,?,?,?)"
 		const values=[tokenAccountId,advert.title,advert.sector,advert.type, advert.description,advert.location]
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




app.listen(3000)

