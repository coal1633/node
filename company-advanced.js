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


router.get("/companies", function getAllCompanies(req,res) {
	const query="SELECT * FROM Company"
	db.all(query, function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
})

router.get("/companies/:id",function getOneCompany(req,res){
	const id=parseInt(req.params.id)
	const query="SELECT * FROM Company WHERE id=?"
	db.all(query,[id], function(error,companies){
		if(error){
			res.status(500).end()
		}else{
			res.status(200).json(companies)
		}
	})
})


module.exports = router

