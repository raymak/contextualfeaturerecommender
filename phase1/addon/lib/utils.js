
function writeToFile(fileName, message){
	var file = require("sdk/io/file");
	var dirPath = require("sdk/system").pathFor("TmpD");
	var filePath = file.join(dirPath, fileName);
	var writer = file.open(filePath, "w");
	writer.writeAsync(message, function(error)
	{
  	if (error)
    	console.log("Error: " + error);
  	else;
   	 // console.log("Success!");
	});
}


exports.writeToFile = writeToFile;