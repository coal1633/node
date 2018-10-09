var express = require('express')
var router = express.Router()
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("database.db")

//Create an User Account
router.post("/user-accounts", function(req, res){
	const saltRounds = 10
	const username = req.body.username
	const password = req.body.password
	const theHash = bcrypt.hashSync(password, saltRounds)
	let valid = true

	if(username.length<5){
		res.status(400).json({"usernameTooShort":"Please provide a longer username"})
		valid=false
	}
	if(username.length>50){
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
router.post("/company-accounts", function(req, res){
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
router.post("/token", function(req, res){
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
			})
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

//Update company location or name 
router.put("/company-accounts/:id", function(req,res){
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
router.put("/password/:id", function(req,res){
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
router.delete("/company-accounts/:id", function(req,res){
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
router.delete("/user-accounts/:id", function(req,res){
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

router.post("/oauth2/v4/token", function(req, res){
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
		})
		response.on("end",function(){
			var arrayString=Buffer.concat(arr)
			var data = arrayString.toString('utf8')
			var body = JSON.parse(data)
			id_token = body.id_token

			var decoded = jwt.decode(id_token);
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
	})
	post_req.write(url)
		
	post_req.on("error", (e)=>{
		console.log(e)
	})
	post_req.end()		
})

module.exports = router