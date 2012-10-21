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
        // Get reference to main window's TinyUrl object
        tinyurlgen = win.tinyurlgen;
	}
}, true);


//Attach unload event to options window
window.addEventListener("beforeunload", function(){
	
    
    if(tinyurlgen){
		//Update elements based on settings
		tinyurlgen.applysettings();
	}
}, true);