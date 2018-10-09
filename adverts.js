var express = require('express')
var router = express.Router()

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

module.exports = router