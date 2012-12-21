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
        
    var menu = document.getElementById("shortcut-key-menu");
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        
    var pref_key = document.getElementById("shortcut-key").value;
    var item_index = -1;
        
    //Add keycodes to menulist
    for(i = 0; i < tinyurlgen.keylist.length; i++)
    {
        var item = document.createElementNS(XUL_NS, "menuitem");
        var key = tinyurlgen.keylist[i];
        item.setAttribute("label", toTitleCase(key.replace("VK_", "")));
        item.setAttribute("value", key);
        if(pref_key == key){item_index = i;}
        menu.appendChild(item);
    }
    
    document.getElementById("shortcut-key").selectedIndex = item_index;
    
    //Update keyboard shortcut fields
    shortcutEnableDisable();
    
    }, true);


//Attach unload event to options window
window.addEventListener("beforeunload", function(){
	
    
    if(tinyurlgen){
        //Update elements based on settings
        tinyurlgen.applysettings();
	}
    }, true);
    
function shortcutEnableDisable()
{
    var enabled = !(document.getElementById("shortcut-enabled").checked);
    var els = ["shortcut-key", "shortcut-modifier-accel", "shortcut-modifier-alt", "shortcut-modifier-shift"];
    
    
    for(i = 0; i < els.length; i++)
    {
        document.getElementById(els[i]).disabled = enabled;        
    }
}

function toTitleCase(str)
{
    str = str.replace("_", " ");
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}