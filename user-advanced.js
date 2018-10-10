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



module.exports = router

