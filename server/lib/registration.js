var path = require('path');
var successObj = {"email":"","totalPaymentAmount":0}

var fs = require("fs");
var async = require("async")
var logger = require('./logModule');
var registration = {
        register: function(req, res, next) {

            try {
                var newData = req.body;

                logger.debug("request body : "+ JSON.stringify(newData))
                var fileName = path.resolve(__dirname, '../data') + '/' + newData.year + '_registration.json';
                async.auto({
                    check_file_or_create: function(callback) {

                        fs.exists(fileName, (exists) => {
                            var fileData = '';
                            if (!exists) {
                                fileData = createFileData(newData);
                            } else {
                                logger.debug("File exists. Checking if file is blank")
                                var fileSize = fs.statSync(fileName)["size"];
                                logger.debug("File size is :" + fileSize)
                                if (fileSize <= 0) {
                                    fileData = createFileData(newData);
                                }

                            }
                            return callback(null, fileData)
                        });
                    },
                    read_data: ["check_file_or_create", function(results, callback) {
                        // async code to get some data
                        logger.debug("results from check_file_or_create \n" + JSON.stringify(results))
                        if (results['check_file_or_create'] == '') {
                            fs.readFile(fileName, 'utf8', function(err, data) {
                                if (err) return callback(err, "Error");
                                data = JSON.parse(data)
                                mainEvent = data.events[newData.eventCode];
                                if(mainEvent){
								  if(!checkIfDuplicateByEmail(mainEvent.registrations,newData.data.email)){
									  mainEvent.registrations.push(newData.data);
								  }else{
									  //Duplicate email id. Can't register
									  var errorObj = {"key":"data.email","errorCode":"duplicate_email","errorMessage" : "Duplicate registration. Another registration record exist with same email id."}
									  return callback(errorObj);
								  }
                                  

                                }else{
                                  //event is not created yet (first registration). Hemce, creating the event
                                  var newEvent = {
                                      "name": newData.eventName,
                                      "eventCode": newData.eventCode,
                                      "registrations": [newData.data]
                                  }
                                  data.events[newData.eventCode] = newEvent;
                                }
                                return callback(null, data);

                            });
                        } else {
                            var newFileData = results['check_file_or_create'];
                            logger.debug("new File data \n" + JSON.stringify(newFileData))
                            newFileData.events[newData.eventCode].registrations.push(newData.data);
                            return callback(null, newFileData);
                        }

                    }],
                    write_file: ['read_data', function(results, callback) {
                        logger.debug('in write_file', JSON.stringify(results));
                        fs.writeFile(fileName, JSON.stringify(results["read_data"]), 'utf-8', (err) => {
                            if (err) callback(err, "Write Error");
                        });
                        return callback(null, 'filename');
                    }]
                }, function(err, results) {
                    if (err) {
						if(err.errorCode && err.errorCode == "duplicate_email"){
							var errorObject = {}
							errorObject[err.key]=[err.errorMessage];
							
							res.status(400);
							return res.send(errorObject)
						}else{
							return next(err)
						}
                        
                    } else {
						successObj.email = newData.data.email;
						var totalFee = 0; 
						if(newData.data.membershipFee){
							totalFee = parseInt(newData.data.eventFee)+parseInt(newData.data.membershipFee);
						}else{
							totalFee = parseInt(newData.data.eventFee);
						}
						successObj.totalPaymentAmount = totalFee;
                        res.status(200);
                        res.send(successObj)
                    }
                });
            } catch (e) {
                res.status(500);
                return next(e);
            }

        },
        getRegisteredMembers: function(req, res, next) {
            try {
                res.json(result);
            } catch (e) {
                res.status(500);
                return next(e);
            }

        },
        getRegisteredMember: function(req, res, next) {
            try {
                res.json(result);
            } catch (e) {
                res.status(500);
                return next(e);

            }
        }
      }

        function createFileData(newData) {
            var obj = {};
            var events={};
            var eventCode = newData.eventCode;
            events[eventCode] = {
                "name": newData.eventName,
                "eventCode": eventCode,
                "registrations": []
            };
            obj["events"] = events;
            return obj;
        }

        function writeToRegistrationFile() {

        }
		function checkIfDuplicateByEmail(registrationArr,email){
			for(var i=0;i<registrationArr.length;i++){
				if(registrationArr[i].email === email){
					return true;
				}
			}
			return false;
		}

        module.exports = registration;
