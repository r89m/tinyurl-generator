var tinyurlgen = {
	
    //Is the current page being processed
    processing : false,
    //The HTTP Request Object
    currentRequest : null,
    //A list of TinyURLs to be exposed
    checkrequests : {},
    //Does the link need to be previewable?
    preview : false,
    // Is this the first time the add-on has been run?
    firstRun : true,
    // Regular expression for parsing TinyURLs
    matchstring : /^https?\:\/\/(preview.)?tinyurl\.com\/([A-z\-0-9]{1,})$/gi,
    //TinyURL options
    settings : {
        createpreviewbydefault : false,
        exposedestination : false,
        shortcutenabled : false,
        showpageoption : true,
        showlinkoption : true
    },
    //TinyURL shortcut settings
    shortcut : {
        key : "",
        modifiers : {
            accel : false,
            alt : false,
            shift : false
        }
    },
    //List of keys available for shortcuts
    keylist : [
        "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
        "0","1","2","3","4","5","6","7","8","9",
        "VK_RETURN",
        "VK_LEFT","VK_UP","VK_RIGHT","VK_DOWN",
        ";",",",".","/","`","(","\\",")",
        "VK_PAGE_UP","VK_PAGE_DOWN","VK_END","VK_HOME",
        "VK_INSERT","VK_DELETE",
        "=","VK_MULTIPLY","VK_ADD","VK_SUBTRACT","VK_DECIMAL","VK_DIVIDE",
        "VK_F1","VK_F2","VK_F3","VK_F4","VK_F5","VK_F6","VK_F7","VK_F8","VK_F9","VK_F10","VK_F11","VK_F12",
        "VK_F13","VK_F14","VK_F15","VK_F16","VK_F17","VK_F18","VK_F19","VK_F20","VK_F21","VK_F22","VK_F23","VK_F24",
        ],
    //TinyURL localised strings object
    stringsobj : null,
    //20 second timeout for requests
    timeout : 20000,
    //A reference to the object that was context clicked
    contextobj : null,
    //A reference to the clipboard object (don't initialise it right away
    clipboard : null,
	
    //A function to copy the returned URL to the clipboard
    copytoclipboard : function(text){
        
        // If a link to the clipboard has not yet been created...
        if(!tinyurlgen.clipboard)
        {
            // Create a link to the clipboard if required
            tinyurlgen.clipboard = this.cc("@mozilla.org/widget/clipboardhelper;1", "nsIClipboardHelper");
        }
		
        //Copy text to clipboard
        tinyurlgen.clipboard.copyString(text);
    },
	
    //A function to ease Component Class interfacing
    cc : function(cName, ifaceName){
		
        return Components.classes[cName].getService(Components.interfaces[ifaceName]);
    },
	
    cu : function(cName){

        try{
            Components.utils.import(cName);   
        }
        catch(e){
            
        }
    },
    
    init : function(){  
        //Get the broswer XUL Object
        var appcontent = document.getElementById("appcontent");   // browser
        //If it exists...
        if(appcontent){
            //Attach a listener that resets the processing state as a new page is loaded
            appcontent.addEventListener("DOMContentLoaded", tinyurlgen.pageload, false);
        }
        //Attach listener event to context menu to show and hide menuitem
        var contextMenu = document.getElementById("contentAreaContextMenu");
        if(contextMenu){
            contextMenu.addEventListener("popupshowing", function(){
                var pageoption = document.getElementById('tinyurlgen-context-page-option');
                var linkoption = document.getElementById('tinyurlgen-context-link-option');
                var pagehidden = !tinyurlgen.settings.showpageoption;
                var linkhidden = true;
                var el;
                if(document.popupNode && tinyurlgen.settings.showlinkoption){
                    el = document.popupNode;
                    while(el){
                        if(el.localName && el.localName.toLowerCase() == 'a'){
                            if(el.href != ''){
                                tinyurlgen.contextobj = el;
                                linkhidden = false;
                            }
                            break;
                        }
                        else{
                            el = el.parentNode;
                        }
                    }
                }

                pageoption.hidden = pagehidden;
                linkoption.hidden = linkhidden;
            }, false);
        }

        //Load and apply settings
        tinyurlgen.applysettings();

        const tinyurlTBItem = "tinyurlgen-status-bar-icon";
        
        if(tinyurlgen.firstRun){
            // First run - add icon to addon bar and show it
            setTimeout(function(){tinyurlgen.addicontoaddonbar();}, 5);
        }

        var appInfo = tinyurlgen.cc("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
        tinyurlgen.FFVersion = appInfo.version;
    },
    
    abort : function(){
		
        //Abort current request
        if(tinyurlgen.currentRequest){
            try{
                tinyurlgen.currentRequest.abort();
            }
            catch(e){
                
            }
            }

        //Set current state (error)
        tinyurlgen.setstate('error');
        setTimeout(function(){tinyurlgen.reset();}, 5000);
    },
    
    addicontoaddonbar : function(){

        const addonbarId = "addon-bar";
        const iconId = "tinyurlgen-status-bar-icon";
        
        // Get references to the addon bar and icon
        var addonbar = document.getElementById(addonbarId);
        var icon = document.getElementById(iconId);
        
        // If the addon bar is found, but the icon is not
        if (addonbar && !icon)
        {
            // Add the icon to the toolbar's 'set' property
            var newSet = addonbar.currentSet + "," + iconId;
            addonbar.setAttribute("currentset", newSet);
            addonbar.currentSet = newSet;
            // Make sure the change persists
            document.persist(addonbarId, "currentset");
            // Show the addon bar
            setToolbarVisibility(addonbar, true);
            try {
                BrowserToolboxCustomizeDone(true);
            } catch (e) {}
        }
      
    },
	
    applysettings : function(){
		
        //Load settings from config
        var prefManager = tinyurlgen.cc("@mozilla.org/preferences-service;1", "nsIPrefBranch");
		
        tinyurlgen.settings.createpreviewbydefault = prefManager.getBoolPref("extensions.tinyurlgen.createpreviewbydefault");
        tinyurlgen.settings.exposedestination = prefManager.getBoolPref("extensions.tinyurlgen.exposedestination");
        tinyurlgen.settings.showpageoption = prefManager.getBoolPref("extensions.tinyurlgen.showcontextoptionforpage");
        tinyurlgen.settings.showlinkoption = prefManager.getBoolPref("extensions.tinyurlgen.showcontextoptionforlinks");
        tinyurlgen.settings.shortcutenabled = prefManager.getBoolPref("extensions.tinyurlgen.shortcutenabled");
        
        tinyurlgen.shortcut.key = prefManager.getCharPref("extensions.tinyurlgen.shortcutkey");
        tinyurlgen.shortcut.modifiers.accel = prefManager.getBoolPref("extensions.tinyurlgen.shortcutmodifier.accel");
        tinyurlgen.shortcut.modifiers.alt = prefManager.getBoolPref("extensions.tinyurlgen.shortcutmodifier.alt");
        tinyurlgen.shortcut.modifiers.shift = prefManager.getBoolPref("extensions.tinyurlgen.shortcutmodifier.shift");
		
        tinyurlgen.firstRun = prefManager.getBoolPref("extensions.tinyurlgen.firstrun");
        if(tinyurlgen.firstRun){
            prefManager.setBoolPref("extensions.tinyurlgen.firstrun", false);
        }
        
        //Set keyboard shortcut properties
        var keydef_id = "tinyurlgen-shortcut-generate";
        var keyset = document.getElementById(keydef_id).parentNode;
        var keyset_cont = keyset.parentNode;
        keyset_cont.removeChild(keyset);
        
        keyset = null
        
        keyset = document.createElement("keyset");
            
        var keydef = document.createElement("key");
        var key = tinyurlgen.shortcut.key;
        
        keydef.setAttribute("id", keydef_id);
        
        if(tinyurlgen.settings.shortcutenabled)
        {
            if(key.indexOf("VK_") > -1)
            {
                keydef.setAttribute("keycode", key);
            }
            else
            {
                keydef.setAttribute("key", key);
            }
            keydef.setAttribute("oncommand", "tinyurlgen.generatedefault(event)");
            var mods = [];
            for(var x in tinyurlgen.shortcut.modifiers)
            {
                if(tinyurlgen.shortcut.modifiers[x])
                {
                    mods.push(x);
                }
            }
            keydef.setAttribute("modifiers", mods.join(","));
        }
        
        keyset.appendChild(keydef);
        keyset_cont.appendChild(keyset);
        
        //Get button references
        var create = document.getElementById('tinyurlgen-button-create');
        var createwithpreview = document.getElementById('tinyurlgen-button-create-with-preview');
        
        //Clear Shortcut Key text
        create.removeAttribute("acceltext")
        createwithpreview.removeAttribute("acceltext")
        
        //If Create Previewable link by default...
        if(tinyurlgen.settings.createpreviewbydefault){
            //Set to default
            createwithpreview.setAttribute("default", true);
            if(tinyurlgen.settings.shortcutenabled)
            {
                createwithpreview.setAttribute("key", keydef_id);
            }
            else
            {
                createwithpreview.removeAttribute("key")
            }
            //Unset default
            create.setAttribute("default", "false");
            create.removeAttribute("key");
            //Move option to top
            createwithpreview.parentNode.insertBefore(createwithpreview, create);
        }
        else{
            //Set to default
            create.setAttribute("default", true);
            if(tinyurlgen.settings.shortcutenabled)
            {
                create.setAttribute("key", keydef_id);
            }
            else
            {
                create.removeAttribute("key")
            }
            //Unset default
            createwithpreview.setAttribute("default", "false");
            createwithpreview.removeAttribute("key");
            //Move option to top
            create.parentNode.insertBefore(create, createwithpreview);
        }
    },
	
    //A function to generate a TinyURL
    generate : function(evt){
		
        //If the page is already being process, end execution
        if(tinyurlgen.processing){
            return false;
        }
			
        var url;
                        
        if(evt.target.id == 'tinyurlgen-context-link-option'){
            //Get linked page URL
            url = tinyurlgen.contextobj.href;
            tinyurlgen.contextobj = null;
        }
        else{
            //Get current page URL
            url = content.document.location.href;
        }
			
        //Encode URL
        url = encodeURIComponent(url);
			
        //Set state to processing
        tinyurlgen.setstate('processing');
		
        //Create HTTP Request Object
        tinyurlgen.currentRequest = new tinyurlgen.request("http://tinyurl.com/api-create.php?url=" + url, tinyurlgen.handleresponse);
        //Send request
        tinyurlgen.currentRequest.get();
        //Set timeout
        setTimeout(function(){tinyurlgen.abort()}, tinyurlgen.timeout);
    },

    generateplain : function(evt){

        tinyurlgen.generate(evt);
    },

    generatepreview : function(evt){

        tinyurlgen.preview = true;
        tinyurlgen.generate(evt);	
    },

    generatedefault : function(evt){

        //If the icon was 'right clicked', end execution
        if(evt.button == 2){
            return false;
        }

        //If Create Previewable link by default
        if(tinyurlgen.settings.createpreviewbydefault){
            //Set preview to true
            tinyurlgen.preview = true;
        }
        tinyurlgen.generate(evt);
    },
    
    getdestination : function(anchor, i){
        
        var reg = new RegExp(tinyurlgen.matchstring), match, segment;
        
        match = reg.exec(anchor.href);
        segment = match[2];
       
        tinyurlgen.checkrequests[segment] = new tinyurlgen.request("http://tinyurl.com/" + segment, function(dest, segment){
            
            // Set the url
            anchor.href = dest;
            // Show that we have exposed this link
            tinyurlgen.checkrequests[segment] = null;
            
            // Find the first unfound link
            for(key in tinyurlgen.checkrequests)
            {
                if(tinyurlgen.checkrequests[key] !== null)
                {
                    tinyurlgen.checkrequests[key].getDestination(key);
                    break;
                }
            }
            });
            
        return segment;
    },

    getwindow : function(winName){

        return tinyurlgen.cc("@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator").getMostRecentWindow(winName);
    },
	
    handleresponse : function(response){
					
        tinyurlgen.currentRequest = null;
                                        
        //Check that the response is valid
        if(response.match(/http\:\/\/tinyurl.com\//gi)){
            //Is this a previewable link?
            if(tinyurlgen.preview){
                //Make link previewable
                response = response.replace(/http\:\/\/tinyurl.com\//gi, 'http://preview.tinyurl.com/')
            }
            //Set current state (complete)
            tinyurlgen.setstate('complete');
            //Copy URL to clipboard
            tinyurlgen.copytoclipboard(response);
            //Reset state in 5 seconds
            setTimeout(function(){tinyurlgen.reset();}, 5000);
        }
        else{
            //Set current state (error)
            tinyurlgen.setstate('error');
            setTimeout(function(){tinyurlgen.reset();}, 5000);
        }
    },
    
    pageload : function()
    {
        //Reset the progress icon
        tinyurlgen.reset();
        
        //Update hrefs if desired
        if(tinyurlgen.settings.exposedestination){
            var anchors = content.document.getElementsByTagName("a");
            var a;
            var firstcheck = null;
            for(var x = 0; x < anchors.length; x++){
                a = anchors[x];
                if(a.href.match(tinyurlgen.matchstring)){
                    firstcheck = tinyurlgen.getdestination(a, x);
                }
            }
            // If there are any TinyUrls in the page, start exposing them
            if(firstcheck)
            {
                tinyurlgen.checkrequests[firstcheck].getDestination(firstcheck);
            }
        }
    },
	
    reset : function(){
		
        //If a TinyURL is not being generated
        if(!tinyurlgen.processing){
            //Reset the icon
            tinyurlgen.setstate(null);
        }
    },
	
    setstate : function(state){
		
        //Define variables
        var icon;
        var title, src, processing;
			
        //Get relevant titles and icons
        switch(state){
            //TinyURL retrieved successfully
            case 'complete':
                src = 'okay.png';
                title = tinyurlgen.string('state.complete');
                processing = false;
                break;
				
            //Error occurred when retrieving TinyURL
            case 'error':
                src = 'error.png';
                title = tinyurlgen.string('state.error');
                processing = false;
                break;
				
            //Currently retrieving TinyURL
            case 'processing':
                src = 'process.gif';
                title = tinyurlgen.string('state.processing');
                processing = true;
                break;
	
            //Reset to default state
            default:
                src = 'link.png';
                title = tinyurlgen.string('state.default');
                processing = false;
                break;
        }
			
        //Reset processing state
        tinyurlgen.processing = processing;
			
        //If processing complete, reset 'preview' flag
        if(!processing){
            tinyurlgen.preview = false;
        }
			
        //Get icon object
        icon = document.getElementById('tinyurlgen-status-bar-icon');
        if(icon){
            if(icon.nodeName.toLowerCase() == 'toolbarbutton'){
                icon.setAttribute('class', 'toolbarbutton-1 ' + state);
            }
            else{
                icon.setAttribute('src', 'chrome://tinyurlgen/skin/' + src);
            }
            icon.setAttribute('tooltiptext', title);
        }
    },
	
    showoptions : function(){
		
        //Get reference to window object
        var win = tinyurlgen.getwindow("TinyURL:Options");
        //If window is already open...
        if(win){
            //Focus it
            win.focus();
        }
        //If not
        else{
            //Create new dialog window
            var parentWindow = (!window.opener || window.opener.closed) ? window : window.opener;
            parentWindow.openDialog("chrome://tinyurlgen/content/options.xul", "_blank", "resizable=no,dialog=no,centerscreen");
        }
    },
	
    string : function(stringname){
		
        if(!tinyurlgen.stringobj){
            var localeService = this.cc("@mozilla.org/intl/nslocaleservice;1", "nsILocaleService");
            var bundleService = this.cc("@mozilla.org/intl/stringbundle;1", "nsIStringBundleService");
            var appLocale = localeService.getApplicationLocale();
            tinyurlgen.stringobj = bundleService.createBundle("chrome://tinyurlgen/locale/tinyurl.properties", appLocale);
        }
			
        return tinyurlgen.stringobj.GetStringFromName(stringname);
    }
}

//Reset state as new page loads
window.addEventListener('load', tinyurlgen.init, false);