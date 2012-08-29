/*
Adapted from code found at http://lduros.net/posts/https-everywhere-and-xhr-other-add-ons/ [12 June 2012]

*/
tinyurlgen.cu("resource://gre/modules/XPCOMUtils.jsm");
tinyurlgen.cu("resource://gre/modules/NetUtil.jsm");

tinyurlgen.request = function (url, callback){
    this.url = url;
    this.responseCallback = callback;
    this.reqObj = null
    
    if("undefined" !== typeof XPCOMUtils)
    {
        var iOService = tinyurlgen.cc("@mozilla.org/network/io-service;1", "nsIIOService");
        this.channel = iOService.newChannel(this.url, 'UTF-8', null);
    }
    else
    {
        this.channel = null;
    }
};

/**
* get
* asyncOpen channel and get response text 
* when the request is completed.
*/
tinyurlgen.request.prototype = {
    
    abort : function(){
        
        if(this.channel !== null){
            // Not sure how to implement this
        }
        else{
            this.reqObj.abort();
        }
        
    },
    
    get : function() {

        var that = this;

        var responseReceived = function (data) {
                // do some stuff here with the data if needed.
                that.responseCallback(data);
            };

        if(this.channel !== null){
            this.channel.asyncOpen({
                QueryInterface: XPCOMUtils.generateQI([Ci.nsIRequestObserver, Ci.nsIStreamListener]),

                data: "",

                onStartRequest: function(request, context) {},

                onDataAvailable: function (request, context, stream, offset, count) {
                    this.data += NetUtil.readInputStreamToString(stream, count);
                },

                onStopRequest: function (request, context, result) {
                    responseReceived(this.data);
                }

                }, null);

        }
        else{
            //Create XMLHTTPRequest Object
            this.reqObj = new XMLHttpRequest();
            //Set onload handler
            this.reqObj.onload = function(){

                responseReceived(this.responseText);
            }
            //Constuct request
            this.reqObj.open("GET", this.url, true);
            //Send request
            this.reqObj.send(null);
        }
    },
    
    getDestination : function(segment){
        
        var that = this;

        var responseReceived = function (data, segment) {
                // do some stuff here with the data if needed.
                that.responseCallback(data, segment);
            };
        
            try{
                // Setup request objects
                var io = tinyurlgen.cc("@mozilla.org/network/io-service;1", "nsIIOService");
                var uri = tinyurlgen.cc("@mozilla.org/network/standard-url;1", "nsIURI");
                uri.spec = this.url;

                that.reqObj = io.newChannelFromURI(uri).QueryInterface(Components.interfaces.nsIHttpChannel);

                that.reqObj.redirectionLimit = 0;
                that.reqObj.requestMethod = "HEAD";

                // Start request and find redirect location
                that.reqObj.asyncOpen({
                    onStartRequest : function(request, context){ },
                    onStopRequest : function(request, context, statusCode){ 

                        responseReceived(request.getResponseHeader("Location"), segment);
                    },
                    onDataAvailable : function(request, context, inputStream, offset, count){} 
                }, null);
            }
            catch(e){
                alert(e.message);
            }
    }
}