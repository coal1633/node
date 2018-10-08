module.exports = function validateAdvert(ad,user_type){
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