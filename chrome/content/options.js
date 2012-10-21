// JavaScript Document
var tinyurlgen;

//Attach load event to options window
window.addEventListener("load", function(){

    //Get reference to navigator window
    var win = Components.classes["@mozilla.org/appshell/window-mediator;1"]
	.getService(Components.interfaces.nsIWindowMediator)
	.getMostRecentWindow("navigator:browser");

    //If window exists
    if(win){
		tinyurlgen = win.tinyurlgen;
		var vers = tinyurlgen.FFVersion;
		var verComps = vers.split('.');
				
		// If version is 3.6 or lower then hide option
		if(verComps[0] < 4){
			// Firefox 3
			document.getElementById('iconinbargroup').style.display = 'none';
		}
		else{
			// Firefox 4
		}
	}
}, true);


//Attach unload event to options window
window.addEventListener("beforeunload", function(){
	
    
    if(tinyurlgen){
		//Update elements based on settings
		tinyurlgen.applysettings();
	}
}, true);