"use strict"

function webServiceRequest(url,data)
{
	// Build URL parameters from data object.
    let params = "";
    // For each key in data object...
    for (let key in data)
    {
        if (data.hasOwnProperty(key))
        {
            if (params.length == 0)
            {
                // First parameter starts with '?'
                params += "?";
            }
            else
            {
                // Subsequent parameter separated by '&'
                params += "&";
            }

            let encodedKey = encodeURIComponent(key);
            let encodedValue = encodeURIComponent(data[key]);

            params += encodedKey + "=" + encodedValue;
         }
    }
    let script = document.createElement('script');
    script.src = url + params;
    document.body.appendChild(script);
}

function darkSkyRequest(key,lat,lng,data,time)
{
	// Build URL parameters from data object.
    let params = "";
    // For each key in data object...
    for (let key in data)
    {
        if (data.hasOwnProperty(key))
        {
            if (params.length == 0)
            {
                // First parameter starts with '?'
                params += "?";
            }
            else
            {
                // Subsequent parameter separated by '&'
                params += "&";
            }

            let encodedKey = encodeURIComponent(key);
            let encodedValue = encodeURIComponent(data[key]);

            params += encodedKey + "=" + encodedValue;
         }
    }
    let script = document.createElement('script');
    if (time == undefined)
    {
    	script.src = "https://api.darksky.net/forecast/"+key+"/"+lat+","+lng+ params;
    }
    else
    {
    	script.src = "https://api.darksky.net/forecast/"+key+"/"+lat+","+lng+","+time+ params;
    }

    document.body.appendChild(script);
}

function geocodeRequest(key, address, callback)
{
    let script = document.createElement('script');
    script.src = "https://api.opencagedata.com/geocode/v1/json?q=" + encodeURIComponent(address) + "&key=" + key + "&jsonp=" + callback;
    document.body.appendChild(script);
}
