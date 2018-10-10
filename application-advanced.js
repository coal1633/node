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

router.get("/application",function getAllApplications(req,res) {
	const query="SELECT * FROM Application"
	db.all(query, function(error,applications){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(applications)
		}
	})
})

router.get("/application/:id",function getOneApplication(req,res) {
	const id=parseInt(req.params.id)
	const query="SELECT * FROM Application WHERE id=?"
	db.all(query,[id], function(error,applications){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(applications)
		}
	})
})

module.exports = router

