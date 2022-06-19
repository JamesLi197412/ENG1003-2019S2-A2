/*
* Purpose: This is the main file for the app to run with
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 19/10/2019
*/

"use strict"

//  localStorage keys for accessing and
//  storing ports data, ships data and bookings data.
const PORTS_KEY = "portsKey";
const SHIPS_KEY = "shipsKey";
const ROUTES_KEY = "routesKey";

// API key for map
let mapAPI = "pk.eyJ1IjoidGVhbS0wNzgiLCJhIjoiY2swNjU2a2JnM3hoMDNibWxzeDUzbThyYSJ9.E7Yi7IBWUn1yqLrm9BGLeg";

// Variables for passing in and displaying forecast data
let routeWeatherStore = null;   // arbitrary route used for collecting weather data on callback
let isMapForecastDisplayed = false;   // Determines if markers should be styled to show forecast (true for yes, false for no)
let waypointForecastIndex = 0;    // Pointer to keep track of which waypoint to assign weather data to on callback.
let mapForWeather = null;   // Map holder to display forecast in

// Database for ships, ports and all booked routes. routeForBooking used when user makes booking.
let shipDatabase = new ShipList();
let portDatabase = new PortList();
let bookedRoutes = new Bookings();

// Variables used for holding user input entries for booking route and for defining input for routeForBooking
// as a new Route object
let shipForBooking = null;
let sourcePortForBooking = null;
let destinationPortForBooking = null;
let routeForBooking = null;

// HTML elements for holding user input for booking
let bookDepartDate = document.getElementById("departDate");
let bookDepartTime = document.getElementById("departTime");
let bookShipInput = document.getElementById("bookedShip");
let bookSourcePortInput = document.getElementById("sourcePort");
let bookDestinationPortInput = document.getElementById("destinationPort");

// Set up the dialog features for adding port to be set to nothing.
// dialogMap used for allowing map access from different functions.
let dialogMap = null;
let dialogSearchData = null;
let dialogPortMarker = null;

// Map markers for keeping track of the ports being booked in and waypoints used
let waypointMarkers = [];
let startMarker = null;
let endMarker = null;

// Marker indicates where the user clicked on the map for adding and deleting waypoints
let clickMarker = null;

// The map where user can add and delete waypoints at the second UI when the user is booking.
// This map is initialised to be empty and uses markerIndex to track the selected waypoint
mapboxgl.accessToken = mapAPI;
let waypointMap = null;
let markerIndex = null;

// The map at the first UI where the user starts booking
let bookingMap = new mapboxgl.Map({
  container: 'mapInBooking',
  center: [144.9648731,-37.8182711],
  zoom: 0,
  style: 'mapbox://styles/mapbox/streets-v10'
});

// Set these HTML elements invisible
document.getElementById("viewShipInfo").style.visibility = "hidden";
document.getElementById("viewPortInfo").style.visibility = "hidden";
document.getElementById("mapOfPort").style.visibility = "hidden";

// Load data if localStorage exists
if (typeof(localStorage) !== "undefined")
{
    loadData();
}

displayRoutes();
displayShips();
displayPorts();

// Switches from one UI to another. Called by events of certain buttons clicked.
// newID: the new HTML element ID to switch to.
function switchUI(newID)
{
    // Go through all sections and check if it is active.
    let sections = document.getElementsByClassName("mdl-layout__tab-panel");
    for (let i = 0; i < sections.length; i++)
    {
        // If active, deactivate it
        if (sections[i].className == "mdl-layout__tab-panel is-active")
        {
            sections[i].setAttribute("class", "mdl-layout__tab-panel");
        }
    }

    // Switch to new section
    document.getElementById(newID).setAttribute("class", "mdl-layout__tab-panel is-active");

    // Set mdl-drawer visible or hidden depending on the UI the user moves to.
    if (newID == "listOfShips" || newID == "listOfPorts" || newID == "listOfBookings" || newID == "viewingRouteOnMap")
    {
        document.getElementsByClassName("mdl-layout__drawer-button")[0].style.visibility = "visible";
    } else
    {
        document.getElementsByClassName("mdl-layout__drawer-button")[0].style.visibility = "hidden";
        // If the user clicked on the button 'New booking', the datalist tags for ship and port input are setted up.
        if (newID == "bookingEntries")
        {
            setShipInputList();
            setPortInputList();

            // Place the start marker on booking map if it already exists
            if (startMarker != null)
            {
                startMarker.addTo(bookingMap);
            }

            // Place the end marker on booking map if it already exists
            if (endMarker != null)
            {
                endMarker.addTo(bookingMap);
            }
        }
    }
}

// Puts all the ships into the datalist tag for ships. This enables the user to look at all available ships
// while inputting a ship for booking.
function setShipInputList()
{
    let output = "";

    // Put each ship from the database into the datalist tag
    for (let i = 0; i < shipDatabase.ships.length; i++)
    {
        output += "<option value='" + shipDatabase.getShip(i).shipName + "'>";
    }
    document.getElementById("ships").innerHTML = output;
}

// Goes through the HTML datalist options to find which ship was selected for booking
// shipInput: the ship input to check with the options
function findBookedShip(shipInput)
{
    let listOfShips = document.getElementById("ships");

    // Search through the ship options from the datalist tag until you find the selected one
    for (let i = 0; i < listOfShips.options.length; i++)
    {
        if (shipInput == listOfShips.options[i].value)
        {
            // Set the selected ship to be for booking
            shipForBooking = shipDatabase.getShip(i);
            return;
        }
    }

    shipForBooking = null;
}

//  Puts all the ports into the datalist tag for ports. This enables the user to look at all available ports
//  while inputting a source port or destination port for booking.
function setPortInputList()
{
    let output = "";

    // Put each port from the database into the datalist tag
    for (let i = 0; i < portDatabase.ports.length; i++)
    {
        output += "<option value='" + portDatabase.getPort(i) + "'>";
    }
    document.getElementById("ports").innerHTML = output;
}

// Goes through the HTML datalist options to find which port was selected for booking
// portInput: the port input to check with the options, isSourcePort: true if this is for source port,
// false for destination port
function findBookedPort(portInput, isSourcePort)
{
    let listOfPorts = document.getElementById("ports");

    // Check the port options until you find one selected or none of them selected
    for (let i = 0; i < listOfPorts.options.length; i++)
    {
        // If an option is found to be selected (equal to the port user input), place it on map
        if (portInput == listOfPorts.options[i].value)
        {
            // Records the port user input for booking and places it on map depending on if it's a destination or source port
            if (isSourcePort)
            {
                sourcePortForBooking = portDatabase.getPort(i);

                // If marker already exists, remove it
                if (startMarker != null)
                {
                    startMarker.remove();
                }

                // Put the source port on the map as a yellow marker
                startMarker = new mapboxgl.Marker({"color":"yellow"});
                startMarker.setLngLat([sourcePortForBooking.portCoordinate.lng,sourcePortForBooking.portCoordinate.lat]);
                let popupSourcePort = new mapboxgl.Popup({offset:45});
                popupSourcePort.setText(sourcePortForBooking);
                startMarker.setPopup(popupSourcePort);

                // Add the source port marker and popup to the map
                startMarker.addTo(bookingMap);
                popupSourcePort.addTo(bookingMap);
                bookingMap.panTo([sourcePortForBooking.portCoordinate.lng,sourcePortForBooking.portCoordinate.lat]);
            } else
            {
                destinationPortForBooking = portDatabase.getPort(i);

                // If marker already exists, remove it
                if (endMarker != null)
                {
                    endMarker.remove();
                }

                // Put the destination port on the map as a purple marker
                endMarker = new mapboxgl.Marker({"color":"purple"});
                endMarker.setLngLat([destinationPortForBooking.portCoordinate.lng,destinationPortForBooking.portCoordinate.lat]);
                let popupArrivalPort = new mapboxgl.Popup({offset:45});
                popupArrivalPort.setText(destinationPortForBooking);
                endMarker.setPopup(popupArrivalPort);

                // Add the destination port marker and popup to the map
                endMarker.addTo(bookingMap);
                popupArrivalPort.addTo(bookingMap);
                bookingMap.panTo([destinationPortForBooking.portCoordinate.lng,destinationPortForBooking.portCoordinate.lat]);
            }
            return;
        }
    }

    // If searching was for source port but no options matched, set input holder of source port to empty.
    // Happens likewise if searching was for destination port.
    if (isSourcePort)
    {
        sourcePortForBooking = null;
    } else
    {
        destinationPortForBooking = null;
    }
}

// Retrieve user entries for ship, source port, destination port and departure date and time
function setBookingEntries()
{
    // Check that the user has entered in an existing ship
    if (shipForBooking == null)
    {
        alert("You must enter existing ship!");
        return;
    }

    // Check that the user has entered in an existing source port
    if (sourcePortForBooking == null)
    {
        alert("You must enter a source port!");
        return;
    }

    // Check that the user has entered in an existing destination port
    if (destinationPortForBooking == null)
    {
        alert("You must enter a destination port!");
        return;
    }

    // Check that the user has entered the departure date and time
    if (bookDepartDate.value == "" || bookDepartTime.value == "")
    {
        alert("You must enter date and time!");
        return;
    }

    // Check that the source port and destination port are different
    if (sourcePortForBooking === destinationPortForBooking)
    {
        alert("You cannot have the source and destination ports the same as each other!");
        return;
    }

    // Set up the booking route and move to next UI section if the departure date and time is not before today and now
    let dateBooked = new Date(bookDepartDate.value + "T" + bookDepartTime.value + ":00");
    if (dateBooked - new Date() <= 0)
    {
        alert("You must enter date and time after today and now!");
        return;
    }
    routeForBooking = new Route(destinationPortForBooking, sourcePortForBooking, shipForBooking, dateBooked);
    waypointsUI();
}

// Draws the path on a map
// routeToUse: the route to refer to for drawing the path, map: the map to draw the path on
function drawPathOnMap(routeToUse, map)
{
    // Create an object for rendering the line
    let object = {
          type: "geojson",
          data: {
                type: "Feature",
                properties: {},
                geometry: {
                          type: "LineString",
                          coordinates: []
                                    }
                                  }
                                };

    // Add in coordinates of source port, destination port and any waypoints
    object.data.geometry.coordinates.push([routeToUse.startPort.portCoordinate.lng, routeToUse.startPort.portCoordinate.lat]);
    for (let i = 0; i < routeToUse.waypoints.length; i++)
    {
        let lat = routeToUse.waypoints[i].coord.lat;
        let lng = routeToUse.waypoints[i].coord.lng;
        object.data.geometry.coordinates.push([lng, lat]);
    } 
    object.data.geometry.coordinates.push([routeToUse.destinationPort.portCoordinate.lng, routeToUse.destinationPort.portCoordinate.lat]);

    // Add the object to the map
    map.addLayer({
                  id: "routes",
                  type: "line",
                  source: object,
                  layout: { "line-join": "round", "line-cap": "round" },
                  paint: { "line-color": "#888", "line-width": 6 }
          });
}

// Remove the specified layer from a map.
// idRemove: the id of the layer to remove, map: the map where the layer is to be removed
function removeMapLayer(idRemove, map)
{
    // If the layer with the id for removal exists, remove layer
    if (map.getLayer(idRemove) !== undefined)
    {
        map.removeLayer(idRemove);
        map.removeSource(idRemove);
    }
}

// Set up the map and its functionality for adding and deleting waypoints
function waypointsUI()
{
    switchUI('placeWaypoints');

    // Load in the map for adding and deleting waypoints
    waypointMap = new mapboxgl.Map({
      container: 'waypoint_map',
      center: [144.9648731,-37.8182711],
      zoom: 0,
      style: 'mapbox://styles/mapbox/streets-v10'
    });

    // When the map has loaded, draw the route path after adding in the ports and existing waypoints
    waypointMap.on('load', function ()
    {
      // Place source port on the map
      startMarker.addTo(waypointMap);

      // Place any waypoint markers, that were already added, into the map
      for (let i = 0; i < waypointMarkers.length; i++)
      {
          waypointMarkers[i].addTo(waypointMap);
          let waypointLat = waypointMarkers[i].getLngLat().lat;
          let waypointLng = waypointMarkers[i].getLngLat().lng;
          let point = {lng: waypointLng, lat: waypointLat};
          routeForBooking.addWaypoint(new Waypoint(point));
      }

      // Place destination port on the map
      endMarker.addTo(waypointMap);
      drawPathOnMap(routeForBooking, waypointMap);
    });

    // Make the map interactable
    waypointMap.on('click', function (e)
    {
      var coordinates = e.lngLat;

      // If there is a marker indicating where the user clicked, remove it.
      if (clickMarker != null)
      {
          clickMarker.remove();
          clickMarker = null;
      }

      // Calculate appropiate precision for marker selection based on map zooming
      let factor = 0.07;
      let constPrec = 0.0001;
      let prec = (waypointMap.getMaxZoom() - waypointMap.getZoom()) * factor + constPrec;

      // Check if any waypoints were selected
      for (let i=0; i<waypointMarkers.length;i++)
      {

          if(Math.abs(coordinates.lng - waypointMarkers[i].getLngLat().lng)<=prec && Math.abs(coordinates.lat - waypointMarkers[i].getLngLat().lat)<=prec)
          {
              // for coloring the previous selected marker to a different colour
              if (markerIndex != null)
              {
                  let prevMarker = waypointMarkers[markerIndex];
                  prevMarker.remove();

                  //for changing colour of marker when different one is clicked.
                  let differentMarker = new mapboxgl.Marker({"color":"green"});
                  waypointMarkers[markerIndex] = differentMarker;
                  let prevLat = routeForBooking.waypoints[markerIndex].coord.lat;
                  let prevLng = routeForBooking.waypoints[markerIndex].coord.lng;
                  differentMarker.setLngLat([prevLng,prevLat]);
                  let differentPopup = new mapboxgl.Popup({offset:45});
                  differentPopup.setText("longitude: " + prevLng + ", latitude: " + prevLat);

                  differentMarker.setPopup(differentPopup);

                  //display the marker
                  differentMarker.addTo(waypointMap);

                  //display the Popup
                  differentPopup.addTo(waypointMap);
              }


              //for replacing marker
              markerIndex = i;
              let markerRemove = waypointMarkers[i];
              markerRemove.remove();

              //for changing colour of waypoints when clicked one of them:
              let newMarker = new mapboxgl.Marker({"color":"red"});
              waypointMarkers[i] = newMarker;
              let lat = routeForBooking.waypoints[i].coord.lat;
              let lng = routeForBooking.waypoints[i].coord.lng;
              newMarker.setLngLat([lng,lat]);
              let popup = new mapboxgl.Popup({offset:45});
              popup.setText("longitude: " + lng + ", latitude: " + lat);

              newMarker.setPopup(popup);

              //display the marker
              newMarker.addTo(waypointMap);

              //display the Popup
              popup.addTo(waypointMap);

              return;
          }
      }
        // place marker that shows where the user clicked on map
        clickMarker = new mapboxgl.Marker();
        clickMarker.setLngLat(coordinates);
        clickMarker.addTo(waypointMap);
      });
}

// Adds a waypoint in during when the user books a route
function addWayPoint()
{
    // If there isn't the marker indicating where user clicked, don't add new waypoint
    if (clickMarker == null)
    {
        return;
    }

    // Set coordinates for new waypoint
    let waypointLng = clickMarker.getLngLat().lng;
    let waypointLat = clickMarker.getLngLat().lat;
    let point = {lng: waypointLng, lat: waypointLat};
    let lastIndex = routeForBooking.waypoints.length - 1;

    // If the last index in the waypoints array is above -1 (length of array > 0)
    // Then check if the new waypoint is in appropiate position.
    if (lastIndex > -1){
        let distance = routeForBooking._havsineDist(routeForBooking.waypoints[lastIndex], point);
        let minDist = 5;
        let maxDist = 100;

        // Check if the new waypoint is between 5km and 100km away from the last waypoint. If not,
        // print out error message.
        if (distance < minDist || distance > maxDist)
        {
            alert("The new waypoint must be between 5km and 100km away from the last waypoint. Probably you can enlarge the zoom of map");
            return;
        }
    }

    let newWaypoint = new Waypoint(point);
    routeForBooking.addWaypoint(newWaypoint);

    // Add a new waypoint marker to the map
    let newMarker = new mapboxgl.Marker({"color":"green"});
    newMarker.setLngLat([waypointLng,waypointLat]);
    let popup = new mapboxgl.Popup({offset:45});
    popup.setText("longitude: " + waypointLng + ", latitude: " + waypointLat);
    newMarker.setPopup(popup);
    newMarker.addTo(waypointMap);
    popup.addTo(waypointMap);
    waypointMarkers.push(newMarker);

    // Redraw the route path
    removeMapLayer('routes', waypointMap);
    drawPathOnMap(routeForBooking, waypointMap);

}

// Deletes the selected waypoint during when the user books a route
function deleteWaypoint()
{
    if (markerIndex != null)
    {
        // Delete the selected waypoint
        let markerRemove = waypointMarkers[markerIndex];
        markerRemove.remove();
        waypointMarkers.splice(markerIndex,1);
        routeForBooking.delWaypoint(routeForBooking.waypoints[markerIndex]);
        markerIndex = null;

        // Redraw the route path
        removeMapLayer('routes', waypointMap);
        drawPathOnMap(routeForBooking, waypointMap);
    }
}

// Show the estimated time arrival, distance travelled and the cost of booking
function routeEstimates()
{
    // Switch to next UI for booking and calculate route distance and arrival date
    switchUI('estimations');
    routeForBooking.calculateTotalDistance();
    routeForBooking.predictArrivalDate();

    // Code to set up the map
    mapboxgl.accessToken = mapAPI;
    let estimationMap = new mapboxgl.Map({
      container: 'pathDrawn_map',
      center: [144.9648731,-37.8182711],
      zoom: 0,
      style: 'mapbox://styles/mapbox/streets-v10'
    });
    document.getElementById("weatherTablePrediction").innerHTML = "";

    // when the map has loaded, display route forecast and path
    estimationMap.on('load', function ()
    {
      // Code to get weather predictions for route being booked.
      mapForWeather = estimationMap;
      computeRouteForecast(routeForBooking, true);

      // Code to draw the path on the map
      drawPathOnMap(routeForBooking, estimationMap);
    });

    estimationMap.on('click', function (e)
    {
      var coordinates = e.lngLat;

      // Calculate appropiate precision for marker selection based on map zooming
      let factor = 0.07;
      let constPrec = 0.0001;
      let prec = (estimationMap.getMaxZoom() - estimationMap.getZoom()) * factor + constPrec;

      // Check if the source port was selected. if so display its forecast
      if(Math.abs(coordinates.lng - routeForBooking.startPort.portCoordinate.lng) <= prec && Math.abs(coordinates.lat - routeForBooking.startPort.portCoordinate.lat) <= prec)
      {
          showIndividualForecast(routeForBooking.startWeather, routeForBooking.departureDate, "weatherTablePrediction");
          return;
      }

      // Check if the destination port was selected. if so display its forecast
      if(Math.abs(coordinates.lng - routeForBooking.destinationPort.portCoordinate.lng) <= prec && Math.abs(coordinates.lat - routeForBooking.destinationPort.portCoordinate.lat) <= prec)
      {
          showIndividualForecast(routeForBooking.arrivalWeather, routeForBooking.arrivalDate, "weatherTablePrediction");
          return;
      }

      // Check if any waypoints were selected. if so display the selected waypoint's forecast
      for (let i = 0; i < routeForBooking.waypoints.length; i++)
      {
          if(Math.abs(coordinates.lng - routeForBooking.waypoints[i].coord.lng) <= prec && Math.abs(coordinates.lat - routeForBooking.waypoints[i].coord.lat) <= prec)
          {
              showIndividualForecast(routeForBooking.waypoints[i].forecast, routeForBooking.waypoints[i].arriveDate, "weatherTablePrediction");
              return;
          }
      }
    });

    // Code to show estimations for the route
    let arrivalDates = formatDate(routeForBooking.arrivalDate);
    document.getElementById("estimateArrival").innerHTML = arrivalDates;
    document.getElementById("estimateTotalDistance").innerHTML = routeForBooking.routeDistance.toFixed(2);
    document.getElementById("maxShipDistance").innerHTML = routeForBooking.ship.shipRange;
    document.getElementById("estimateCost").innerHTML = "$" + routeForBooking.routeCost.toFixed(2);

    // If route distance is above ship range, show error message and disable next button.
    if (routeForBooking.routeDistance > routeForBooking.ship.shipRange)
    {
        document.getElementById("maxShipDistance").innerHTML += "<p style='color: red;'> (Distance is too far for the ship!)</p>";
        document.getElementById("finaliseBooking").disabled = true;
    } else
    {
        document.getElementById("finaliseBooking").disabled = false;
    }
}

// Show all final details of the route including its entries, estimations and booking cost
function finalRouteDetails()
{
    switchUI('bookingConfirm');

    // Code to show final route details for confirmation
    document.getElementById("shipConfirm").innerHTML = routeForBooking.ship.shipName;
    document.getElementById("sourcePortConfirm").innerHTML = routeForBooking.startPort;
    document.getElementById("destinationPortConfirm").innerHTML = routeForBooking.destinationPort;

    // Format the dates and display them and the booking cost and travel distance
    let departDates = formatDate(routeForBooking.departureDate);
    let arrivalDates = formatDate(routeForBooking.arrivalDate);
    document.getElementById("departureConfirm").innerHTML = departDates;
    document.getElementById("arrivalConfirm").innerHTML = arrivalDates;
    document.getElementById("distanceConfirm").innerHTML = routeForBooking.routeDistance.toFixed(2);
    document.getElementById("costConfirm").innerHTML = "$" + routeForBooking.routeCost.toFixed(2);

}

// Returns the date representation in the format dd/mm/yyyy, hour:min where minute has leading zero if less than 10
// date: the Date object to format.
function formatDate(date)
{
    let minute = date.getMinutes();
    if (minute < 10)
    {
        minute = "0" + minute;
    }

    return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() + ", " + date.getHours() + ":" + minute;
}

// Displays dialog that prompts the user to choose yes or no for a query
// query: the query for asking a yes or no question, num: a number to use in case for intended functionality
function showYesNoDialog(query, dialogId, num)
{
    // Put the dialog content in.
    let dialogContent = "<dialog class='mdl-dialog' style='width:40vw;'>";
    dialogContent += "<label style='font-size: 14px; margin-left: 160px;'>Are you sure you want to " + query + "?</label>";
    dialogContent += "<div class='mdl-dialog__actions'><button class='mdl-button mdl-button--colored cancel' style='right: 210px;'>No</button>";
    dialogContent += "<button class='mdl-button mdl-button--colored done' style='right: 210px;'>Yes</button></div></dialog>";

    // Show up the dialog if not already shown
    document.getElementById(dialogId).innerHTML = dialogContent;
    let dialog = document.querySelector('dialog');

    if (!dialog.showModal)
    {
        dialogPolyfill.registerDialog(dialog);
    }
    dialog.showModal();

    // Yes button runs the intended functionality depending on query
    dialog.querySelector('.done').addEventListener('click', function(){
      // If the query asked about booking confirmation confirm booking
        if (query == 'confirm booking')
        {
            bookingRoute();
        } else if(query == 'delete route')
        {
            // Else if the query asked about deleting route, delete route
            deleteRoute(num);
        }

        // Close dialog
        dialog.close();
        document.getElementById(dialogId).innerHTML = "";
    });

    // No button simply closes dialog without running intended functionality
    dialog.querySelector('.cancel').addEventListener('click', function(){
        dialog.close();
        document.getElementById(dialogId).innerHTML = "";
    });
}

// Books the route and displays it on the table in main page
function bookingRoute()
{
    // Add the new route in and save the bookings data
    bookedRoutes.bookRoute(routeForBooking);
    switchUI('listOfBookings');
    displayRoutes();
    storeData();

    // Reset inputs to be empty
    bookShipInput.value = "";
    bookSourcePortInput.value = "";
    bookDestinationPortInput.value = "";
    bookDepartDate.value = "";
    bookDepartTime.value = "";

    // Reset to be empty
    shipForBooking = null;
    sourcePortForBooking = null;
    destinationPortForBooking = null;
    routeForBooking = null;

    // Turn the starting marker to disappear
    if (startMarker != null)
    {
        startMarker.remove();
    }
    startMarker = null;

    // Turn the end marker to disappear
    if (endMarker != null)
    {
        endMarker.remove();
    }
    endMarker = null;

    // Remove the waypoint markers and the click marker
    waypointMarkers = [];
    clickMarker = null;

    // Reset the booking map
    bookingMap = new mapboxgl.Map({
      container: 'mapInBooking',
      center: [144.9648731,-37.8182711],
      zoom: 0,
      style: 'mapbox://styles/mapbox/streets-v10'
    });
}

// Cancels booking of the route and resets booking inputs to empty
function cancelRoute()
{
    switchUI('listOfBookings');

    // Code to reset all inputs of booking entries and remove the waypoints added in.
    waypointMarkers = [];
    clickMarker = null;

    // Turn the starting marker to disappear
    if (startMarker != null)
    {
        startMarker.remove();
    }
    startMarker = null;

    // Turn the end marker to disappear
    if (endMarker != null)
    {
        endMarker.remove();
    }
    endMarker = null;

    // Reset inputs to be empty
    bookShipInput.value = "";
    bookSourcePortInput.value = "";
    bookDestinationPortInput.value = "";
    bookDepartDate.value = "";
    bookDepartTime.value = "";

    // Reset to be empty
    shipForBooking = null;
    sourcePortForBooking = null;
    destinationPortForBooking = null;
    routeForBooking = null;

    // Reset the booking map
    bookingMap = new mapboxgl.Map({
      container: 'mapInBooking',
      center: [144.9648731,-37.8182711],
      zoom: 0,
      style: 'mapbox://styles/mapbox/streets-v10'
    });
}

//  Generates a list of booked routes on the table
function displayRoutes()
{
    let output = "";
    for (let i = 0; i < bookedRoutes.routes.length; i++)
    {
        // If the route departure date is not within the given time range, don't display the route
        if (!isInTimeRange(bookedRoutes.getRoute(i).departureDate))
        {
            continue;
        }

        output += "<tr>";

        // Displays the departure date.
        let date = bookedRoutes.getRoute(i).departureDate;
        output += "<td class='mdl-data-table__cell--non-numeric'>" + date.getDate() + "/";
        output += (date.getMonth() + 1) + "/" + date.getFullYear() + "</td>";

        // Displays the source and destination port.
        output += "<td class='mdl-data-table__cell--non-numeric'>" + bookedRoutes.getRoute(i).startPort.portName + "</td>";
        output += "<td class='mdl-data-table__cell--non-numeric'>" + bookedRoutes.getRoute(i).destinationPort.portName + "</td>";

        // Displays the booked ship and buttons for viewing and deleting.
        output += "<td class='mdl-data-table__cell--non-numeric'>" + bookedRoutes.getRoute(i).ship.shipName + "</td>";
        output += "<td><a class='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect' onclick='viewRoute("+i+")'>View</a></td>";
        output += "<td><a class='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect' onclick='showYesNoDialog(\"delete route\", \"deleteDialog\","+i+")'>Delete</a></td>";
        output += "</tr>"
    }

    document.getElementById("bookingsTable").innerHTML = output;
}

// Returns true if the given date is within the time range relative to today, false otherwise
// date: the date to check and verify
function isInTimeRange(date)
{
    // Check which option was selected then take the selected option's filter text
    let timeRange = "All";
    for (let i = 0; i < document.getElementById("routeFilter").options.length; i++)
    {
        if (document.getElementById("routeFilter").options[i].selected)
        {
            timeRange = document.getElementById("routeFilter").options[i].value;
            break;
        }
    }

    // Return true or false, depending on if the number of days ago is at least the specified time range
    let daysAgo = (new Date() - date) / 86400000;
    if (timeRange == "All")
    {
        return true;
    } else if (timeRange == "A week ago")
    {
        return daysAgo >= 7;
    } else if (timeRange == "Fortnight ago")
    {
        return daysAgo >= 14;
    } else
    {
        return daysAgo >= 28;
    }
}

// Predict weather forecast for the chosen route.
// routeComputed: the route to compute on for weather prediction
// forecastMarkerOn: true if markers should be styled to show weather icon and temperature, false if not.
function computeRouteForecast(routeComputed, forecastMarkerOn)
{
    routeWeatherStore = routeComputed;
    isMapForecastDisplayed = forecastMarkerOn;

    // Assign weather data to source port using unix time and source port's location.
    let unixDepartTime = Math.round(routeComputed.departureDate.getTime() / 1000);
    showWeather(routeComputed.startPort.portCoordinate.lat, routeComputed.startPort.portCoordinate.lng, unixDepartTime, "sourcePortWeather");

    // Assign weather data to each waypoint using unix time and their location. Also set up the waypoint pointer
    waypointForecastIndex = routeComputed.waypoints.length - 1;
    for (let i = 0; i < routeComputed.waypoints.length; i++)
    {
        let unixWaypointTime = Math.round(routeComputed.waypoints[i].arriveDate.getTime() / 1000);
        showWeather(routeComputed.waypoints[i].coord.lat, routeComputed.waypoints[i].coord.lng, unixWaypointTime, "waypointWeather");
    }

    // Assign weather data to destination port using unix time and destination port's location.
    let unixArriveTime = Math.round(routeComputed.arrivalDate.getTime() / 1000);
    showWeather(routeComputed.destinationPort.portCoordinate.lat, routeComputed.destinationPort.portCoordinate.lng, unixArriveTime, "destinationPortWeather");
}

// Returns a HTML text format to display the forecast.
// forecast: the object containing weather data to show in text
function createForecastDisplay(forecast)
{
    // If forecast is empty or undefined, return empty output
    let output = "";
    if (forecast == null || forecast == undefined)
    {
        return output;
    }

    // Insert the forecast data into the table
    output += "<tr><th>Temperature</th><td>" + forecast.temperature + "&deg;C</td></tr>";
    output += "<tr><th>UV Index</th><td>" + forecast.uvIndex + "</td></tr>";
    output += "<tr><th>Visibility</th><td>" + forecast.visibility + "km</td></tr>";
    output += "<tr><th>Pressure</th><td>" + forecast.pressure + "hPa</td></tr>";
    output += "<tr><th>Dew point</th><td>" + forecast.dewPoint + "&deg;C</td></tr>";
    output += "<tr><th>Humidity</th><td>" + forecast.humidity + "%</td></tr>";
    output += "<tr><th>Wind</th><td>" + forecast.windSpeed + "km/h, " + forecast.windBearing + "&deg;T</td></tr>";
    output += "<tr><th>Chance of rain</th><td>" + forecast.precipProbability + "%</td></tr>";

    return output;
}

// Display a table of weather data.
// weatherData: the weather data to display, dateAndTime: the date and time to show for the time of forecast
// id: the HTML id to choose which HTML element to display the table of forecast
function showIndividualForecast(weatherData, dateAndTime, id)
{
    let output = createForecastDisplay(weatherData);
    document.getElementById(id).innerHTML =  "<tbody><tr><th>Time</th><td>" + formatDate(dateAndTime) + "</td></tr>" + output + "</tbody>";
}

// Pops up a dialog for the user to postpone his booking.
// index: the index for choosing a route to postpone its departure.
function postponeBooking(index)
{
    // Verify that the booked date is after today, if not don't allow postponing
    let currentDate = bookedRoutes.getRoute(index).departureDate;
    if (currentDate - new Date() <= 0)
    {
        alert("You cannot postpone booking as today is after its departure date and time.");
        return;
    }

    // Insert the HTML elements inside the dialog.
    let dialogContent = "";
    dialogContent += "<dialog class='mdl-dialog' style='width:40vw;'>";
    dialogContent += "<h5 class='mdl-dialog__title' style='text-align: center;'>Postpone booking</h5><div class='mdl-dialog__content'>";
    dialogContent += "<div class='mdl-textfield mdl-js-textfield' style='font-size: 18px; width: 350px;'>"
    dialogContent += "<label>Current date and time: </label><label id='currentDepartureDate'></label></br>";
    dialogContent += "<label>Postpone date: </label><input class='mdl-textfield__input' type='date' id='postponeDate'><br><br>";
    dialogContent += "<label>Postpone time: </label><input class='mdl-textfield__input' type='time' id='postponeTime'></div>";
    dialogContent += "<div class='mdl-dialog__actions'><button class='mdl-button mdl-button--colored done'>Done</button>";
    dialogContent += "<button class='mdl-button mdl-button--colored cancel'>Cancel</button></div></div></dialog>"

    document.getElementById("postponeDialog").innerHTML = dialogContent;
    let dialog = document.querySelector('dialog');

    // Display dialog if not shown
    if (!dialog.showModal)
    {
        dialogPolyfill.registerDialog(dialog);
    }
    dialog.showModal();

    dialog.querySelector('.done').addEventListener('click', function(){
      // Check if user has inputted a postponed date and time, otherwise he's not done
      let newDate = document.getElementById("postponeDate").value;
      let newTime = document.getElementById("postponeTime").value;
      if (newDate == "" || newTime == "")
      {
          alert("You must input a postponed date and time.");
          return;
      }

      // If the user has postponed to a later date, postpone the chosen route's departure and recompute weather prediction
      let postponeDeparture = new Date(newDate + "T" + newTime + ":00")
      if (postponeDeparture - currentDate > 0)
      {
          // Recompute route's forecast and save changes to the bookings data
          bookedRoutes.getRoute(index).postpone(postponeDeparture);
          computeRouteForecast(bookedRoutes.getRoute(index), false);
          displayRoutes();
          viewRoute(index);
          storeData();

          // Exit dialog and make it empty
          dialog.close();
          document.getElementById("postponeDialog").innerHTML = "";
      } else
      {
          alert("You must postpone your date and time later than your previous departure date and time");
      }
    });

    dialog.querySelector('.cancel').addEventListener('click', function(){
      // Exit dialog and make it empty
      dialog.close();
      document.getElementById("postponeDialog").innerHTML = "";
    });

    // Display the current date where it will be a previous because of postponing
    let prevDate = formatDate(currentDate);
    document.getElementById("currentDepartureDate").innerHTML = prevDate;
}

// Displays information about the chosen route.
// index: the specified index to choose the route to display its information
function viewRoute(index)
{
    switchUI("viewingRouteOnMap");

    // Set the view of route information and the map visible
    let route = bookedRoutes.getRoute(index);

    // Format the departure and arrival dates
    let departDates = formatDate(route.departureDate);
    let arrivalDates = formatDate(route.arrivalDate);

    // Display the route's information
    document.getElementById("departure").innerText = departDates;
    document.getElementById("from").innerText = route.startPort;
    document.getElementById("to").innerText = route.destinationPort;
    document.getElementById("ship").innerText = route.ship.shipName;
    document.getElementById("cost").innerText = "$" + route.routeCost.toFixed(2);
    document.getElementById("distance").innerText = route.routeDistance.toFixed(2);
    document.getElementById("arrival").innerText = arrivalDates;
    document.getElementById("postpone").setAttribute("onclick", "postponeBooking(" + index + ")")

    // Code to display route on map
    let viewRouteMap = new mapboxgl.Map({
      container: 'mapOfRoute',
      center: [144.9648731,-37.8182711],
      zoom: 1,
      style: 'mapbox://styles/mapbox/streets-v10'});
    document.getElementById("viewWeatherOnRoute").innerHTML = "";

    // When the map has loaded, show the route forecast and path
    viewRouteMap.on('load', function ()
    {
        // Make the source port marker with popup
        let sourcePortPoint = new mapboxgl.Marker({"color":"yellow"});
        sourcePortPoint.setLngLat([route.startPort.portCoordinate.lng,route.startPort.portCoordinate.lat]);
        let popupSourcePort = new mapboxgl.Popup({offset:45});
        popupSourcePort.setText(route.startPort);
        sourcePortPoint.setPopup(popupSourcePort);

        // Add the source port marker and popup to the map
        sourcePortPoint.addTo(viewRouteMap);
        popupSourcePort.addTo(viewRouteMap);

        // Place waypoints on the map
        for (let i = 0; i < route.waypoints.length; i++)
        {
            // Create a waypoint marker with popup
            let waypointMark = new mapboxgl.Marker({"color":"green"});
            let lat = route.waypoints[i].coord.lat;
            let lng = route.waypoints[i].coord.lng;
            waypointMark.setLngLat([lng,lat]);
            let popup = new mapboxgl.Popup({offset:45});
            popup.setText("longitude: " + lng + ", latitude: " + lat);

            waypointMark.setPopup(popup);

            //display the marker
            waypointMark.addTo(viewRouteMap);
        }

        // Make the destination port marker with popup
        let destPortPoint = new mapboxgl.Marker({"color":"purple"});
        destPortPoint.setLngLat([route.destinationPort.portCoordinate.lng,route.destinationPort.portCoordinate.lat]);
        let popupDestPort = new mapboxgl.Popup({offset:45});
        popupDestPort.setText(route.destinationPort);
        destPortPoint.setPopup(popupDestPort);

        // Add the destination port marker and popup to the map
        destPortPoint.addTo(viewRouteMap);
        popupDestPort.addTo(viewRouteMap);


        drawPathOnMap(route, viewRouteMap);

        // If user wishes to postpone, reference to this map for displaying new forecast
        mapForWeather = viewRouteMap;
        viewRouteMap.panTo([route.startPort.portCoordinate.lng, route.startPort.portCoordinate.lat]);
    });

    // When the map is clicked, it checks if a marker was selected. If so it's forecast is displayed
    viewRouteMap.on('click', function (e)
    {
      var coordinates = e.lngLat;

      // Calculate appropiate selecting precision for marker selection based on map zooming
      let factor = 0.07;
      let constPrec = 0.0001;
      let prec = (viewRouteMap.getMaxZoom() - viewRouteMap.getZoom()) * factor + constPrec;

      // Check if the source port was selected with a close enough selecting precision. if so display its forecast
      if(Math.abs(coordinates.lng - route.startPort.portCoordinate.lng) <= prec && Math.abs(coordinates.lat - route.startPort.portCoordinate.lat) <= prec)
      {
          showIndividualForecast(route.startWeather, route.departureDate, "viewWeatherOnRoute");
          return;
      }

      // Check if the destination port was selected with a close enough selecting precision. if so display its forecast
      if(Math.abs(coordinates.lng - route.destinationPort.portCoordinate.lng) <= prec && Math.abs(coordinates.lat - route.destinationPort.portCoordinate.lat) <= prec)
      {
          showIndividualForecast(route.arrivalWeather, route.arrivalDate, "viewWeatherOnRoute");
          return;
      }

      // Check if any waypoints were selected. if so display the selected waypoint's forecast
      for (let i = 0; i < route.waypoints.length; i++)
      {
          // If selecting precision is close enough to a waypoint, show its weather data on a table
          if(Math.abs(coordinates.lng - route.waypoints[i].coord.lng) <= prec && Math.abs(coordinates.lat - route.waypoints[i].coord.lat) <= prec)
          {
              showIndividualForecast(route.waypoints[i].forecast, route.waypoints[i].arriveDate, "viewWeatherOnRoute");
              return;
          }
      }
    });
}

// Removes the route at a specified index.
// index: the index to remove the route at.
function deleteRoute(index)
{
    bookedRoutes.deleteRoute(index);
    displayRoutes();
    storeData();
}

// Generates a list of ships on a table.
function displayShips()
{
    let output = "";

    // Display each ship with their name, range and max speed
    for (let i = 0; i < shipDatabase.ships.length; i++)
    {
        // If the ship's name doesn't begin with the input in the ship search field, don't display it
        if (!shipDatabase.getShip(i).shipName.toLowerCase().startsWith(document.getElementById("shipFilter").value))
        {
            continue;
        }

        // Display the ship name, range and max speed as well as a view button in a table row
        output += "<tr>";
        output += "<td class='mdl-data-table__cell--non-numeric'>"+shipDatabase.getShip(i).shipName+"</td>";
        output += "<td>"+shipDatabase.getShip(i).shipRange+"</td>";
        output += "<td class='mdl-data-table__cell--non-numeric'>"+shipDatabase.getShip(i).shipMaxSpeed.toFixed(2)+"</td>";
        output += "<td><a class='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect' onclick='viewShip("+i+")'>View</a></td>";
        output += "</tr>";
    }

    document.getElementById("shipTable").innerHTML = output;
}

// Displays dialog for adding new ship
// dialogId: the HTML id to use for the dialog, defaultInput: the default input to insert at the start
function showNewShipDialog(dialogId, defaultInput)
{
    let dialogContent = "";
    dialogContent += "<dialog class='mdl-dialog' style='width:40vw;'>";
    dialogContent += "<h5 class='mdl-dialog__title' style='text-align: center;'>New Ship</h5><div class='mdl-dialog__content'>";

    // Add in HTML elements for user to input information for new ship.
    dialogContent += "<div class='mdl-textfield mdl-js-textfield'>";

    // Different inputs for new ship. Can use their ids to collect their inputs
    dialogContent += "<label>Ship: </label><input class='mdl-textfield__input' type='text' id='newShipName'><br>";
    dialogContent += "<label>Max speed (km/h): </label><input class='mdl-textfield__input' type='number' id='newMaxSpeed'><br>";
    dialogContent += "<label>Range (km): </label><input class='mdl-textfield__input' type='number' id='newRange'><br>";
    dialogContent += "<label>Description: </label><input class='mdl-textfield__input' type='text' id='newDesc'><br>";
    dialogContent += "<label>Comments: </label><input class='mdl-textfield__input' type='text' id='newComment'><br>";
    dialogContent += "<label>Cost (per km): $</label><input class='mdl-textfield__input' type='number' id='newCost'>";

    dialogContent += "</div><div class='mdl-dialog__actions'><button class='mdl-button mdl-button--colored done'>Done</button>";
    dialogContent += "<button class='mdl-button mdl-button--colored cancel'>Cancel</button></div></div></dialog>"

    // Open up the dialog if it hasn't already been opened
    document.getElementById(dialogId).innerHTML = dialogContent;
    let dialog = document.querySelector('dialog');
    if (!dialog.showModal)
    {
        dialogPolyfill.registerDialog(dialog);
    }
    dialog.showModal();

    // Done button adds in new ship when clicked
    dialog.querySelector('.done').addEventListener('click', function(){
        // retrive user inputs for new ship
        let name = document.getElementById("newShipName").value;
        let maxSpeed = Number(document.getElementById("newMaxSpeed").value);
        let range = Number(document.getElementById("newRange").value);
        let description = document.getElementById("newDesc").value;
        let comment = document.getElementById("newComment").value;
        let cost = Number(document.getElementById("newCost").value);

        let newShip = new Ship(name, maxSpeed, range, description, cost, comment);

        // If the ship name is blank, do not leave dialog
        if (name.trim() == "")
        {
            alert("You must not leave the name input blank!");
            return;
        }

        // Verify that the entered range and speed are positive
        if (newShip.shipRange > 0 && newShip.shipMaxSpeed > 0)
        {
            // If the new ship hasn't already been added, add it in
            if (shipDatabase._searchShip(newShip) == -1)
            {
                // If the dialog used was in the booking UI, change the HTML ship datalist's contents
                // and set the new selected ship for booking
                shipDatabase.addNewShip(newShip);
                if (dialogId == "booking_newShip")
                {
                    setShipInputList();
                    bookShipInput.value = newShip.shipName;
                    findBookedShip(newShip.shipName);
                }

                // Refresh display of ships and save database before closing dialog
                displayShips();
                storeData();
                dialog.close();
                document.getElementById(dialogId).innerHTML = "";
            }
        } else
        {
            alert("The speed and range input must be positive.");
        }
    });

    // Have the cancel button to simple close dialog when clicked
    dialog.querySelector('.cancel').addEventListener('click', function(){
      dialog.close();
      document.getElementById(dialogId).innerHTML = "";
    });
    document.getElementById("newShipName").value = defaultInput;
}

// Views the information of a chosen ship. Triggered when user clicks the view button
// on the table row with the ship they choose.
function viewShip(index)
{
    document.getElementById("viewShipInfo").style.visibility = "visible";
  	let selectedShip = shipDatabase.getShip(index);

    // Display data of a selected ship
  	document.getElementById("shipname").innerText = selectedShip.shipName;
  	document.getElementById("maxspeed").innerText = selectedShip.shipMaxSpeed.toFixed(2);
  	document.getElementById("range").innerText = selectedShip.shipRange;
  	document.getElementById("shipdesc").innerText = selectedShip.shipDescription;
  	document.getElementById("shipcost").innerText = "$" + selectedShip.shipCost.toFixed(2);
  	document.getElementById("shipcomments").innerText = selectedShip.shipComments;
}

// Generates a list of ports on the table
function displayPorts()
{
    let output = "";
    for (let i = 0; i < portDatabase.ports.length; i++)
    {
        // If the port doesn't start with the input from the port search field, don't display the port
        if (!portDatabase.getPort(i).portName.toLowerCase().startsWith(document.getElementById("portFilter").value))
        {
            continue;
        }

        // Have the row display the port name, country and type along with the view button
        output += "<tr>";
        output += "<td class='mdl-data-table__cell--non-numeric'>"+portDatabase.getPort(i).portName+"</td>";
        output += "<td class='mdl-data-table__cell--non-numeric'>"+portDatabase.getPort(i).portCountry+"</td>";
        output += "<td class='mdl-data-table__cell--non-numeric'>"+portDatabase.getPort(i).portType+"</td>";
        output += "<td><a class='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect' onclick='viewPort("+i+")'>View</a></td>";
        output += "</tr>";
    }

    document.getElementById("portTable").innerHTML = output;
}

// Displays the dialog used for adding new port
// dialogId: the HTML id to use for the dialog, defaultInput: the default input to insert at the start
// forSourcePort: true if when booking the new port is for source port, else for destination port
function showNewPortDialog(dialogId, defaultInput, forSourcePort)
{
    let dialogContent = "";
    dialogContent += "<dialog class='mdl-dialog' style='width:70vw;'>";
    dialogContent += "<h5 class='mdl-dialog__title' style='text-align: center;'>New Port</h5><div class='mdl-dialog__content'><div class='mdl-grid'>";

    // Add in HTML elements for user to input information for new port.
    dialogContent += "<div class='mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet'>"
    dialogContent += "<div class='mdl-textfield mdl-js-textfield'>";

    // Different information labels and user inputs for new port. Can use their ids to get their text.
    dialogContent += "<label>Port: </label><label id='newPortName'></label><br>";
    dialogContent += "<label>Country: </label><label id='newCountry'></label><br>";
    dialogContent += "<div class='userInput'><label>Type: </label><input class='mdl-textfield__input' type='text' id='newType'></div><br>";
    dialogContent += "<div class='userInput'><label>Size: </label><input class='mdl-textfield__input' type='text' id='newSize'></div><br>";
    dialogContent += "<label>Latitude: </label><label id='newLatitude'></label><br>";
    dialogContent += "<label>Longitude: </label><label id='newLongitude'></label></div></div>";

    // Put in search input html element and the map
    dialogContent += "<div class='mdl-cell mdl-cell--4-col mdl-cell--6-col-tablet'>";
    dialogContent += "<input class='mdl-textfield__input' type='text' id='geoFind' list='geoSearch'";
    dialogContent += "placeholder='search place' oninput='getGeoResults()' onchange='findSelectedPlace(value)'>";
    dialogContent += "<div id='dialogMap'></div>";
    dialogContent += "<datalist id='geoSearch'></datalist></div>";

    // Put in the dialog buttons
    dialogContent += "<div class='mdl-cell mdl-cell--4-col mdl-cell--6-col-tablet'>";
    dialogContent += "<div class='mdl-dialog__actions'><button id='addPortDone' class='mdl-button mdl-button--colored done'>Done</button>";
    dialogContent += "<button id='addPortCancel' class='mdl-button mdl-button--colored cancel'>Cancel</button></div></div></div></div></dialog>";

    document.getElementById(dialogId).innerHTML = dialogContent;
    let dialog = document.querySelector('dialog');

    // Pop up dialog if not shown yet
    if (!dialog.showModal)
    {
        dialogPolyfill.registerDialog(dialog);
    }
    dialog.showModal();

    // Show map on dialog
    mapboxgl.accessToken = mapAPI;
    dialogMap = new mapboxgl.Map({
      container: 'dialogMap',
      center: [144.9648731,-37.8182711],
      zoom: 0,
      style: 'mapbox://styles/mapbox/streets-v10'
    });

    // Done button adds new port in when clicked
    dialog.querySelector('.done').addEventListener('click', function(){
        // Get user input for new port
        let name = document.getElementById("newPortName").innerHTML;
        let country = document.getElementById("newCountry").innerHTML;
        let type = document.getElementById("newType").innerHTML;
        let size = document.getElementById("newSize").innerHTML;
        let latitude = Number(document.getElementById("newLatitude").innerHTML);
        let longitude = Number(document.getElementById("newLongitude").innerHTML);
        let coordinate = {
          lat: latitude,
          lng: longitude
        };

        // If the user hasn't searched for an existing place (name and country left blank), don't exit dialog
        if (name == "" || country == "")
        {
            alert("You must search for an existing place and select it as the new port input!");
            return;
        }

        // Check if the new port is not already in the port Database.
        let newPort = new Port(name, country, type, size, coordinate);
        if (portDatabase._searchPort(newPort) == -1)
        {
            portDatabase.addNewPort(newPort);
            if (dialogId == "booking_newPort")
            {
                setPortInputList();

                // Change the user input in booking UI to match the new port
                // to set it for either source or destination port
                if (forSourcePort)
                {
                    bookSourcePortInput.value = newPort;
                    findBookedPort(newPort, true);
                } else
                {
                    bookDestinationPortInput.value = newPort;
                    findBookedPort(newPort, false);
                }
            }

            // Refresh the display of ports and save database before closing dialog
            displayPorts();
            storeData();
            dialog.close();
            document.getElementById(dialogId).innerHTML = "";
        }
    });

    // Cancel button simply closes dialog when clicked
    dialog.querySelector('.cancel').addEventListener('click', function(){
        dialog.close();
        document.getElementById(dialogId).innerHTML = "";
    });

    // If the default input is provided, prompt the UI to do searching for places
    if (defaultInput != "")
    {
        document.getElementById("geoFind").value = defaultInput;
        getGeoResults();
    }
}

// Makes a geocode request by passing in the API key, input place from new port dialog and the callback function
function getGeoResults()
{
    let geoAPI = "44b6753ab31d45679d81fc6b97490ebf";
    let address = document.getElementById('geoFind').value;
    let callback = "geoSearchResponse";
    geocodeRequest(geoAPI, address, callback);
}

// Callback function that displays the search results of the place input from the new port dialog.
// geoMap: the search results of a place
function geoSearchResponse(geoMap)
{
    let output = "";
    let resultsList = [];

    // Go through each search result from the geoMap
    for (let i = 0; i < geoMap.results.length; i++)
    {
        // Get all the data from the search result for displaying existing places
        let comma = geoMap.results[i].formatted.lastIndexOf(",");
        let data = {
          nation: geoMap.results[i].components.country,
          place: geoMap.results[i].formatted.substring(0, comma),
          lat: geoMap.results[i].geometry.lat,
          lng: geoMap.results[i].geometry.lng
        };

        // Put inside a list so that when the user searches a place, this is displayed
        output += "<option value=\"" + geoMap.results[i].formatted + "\">";
        resultsList.push(data);
    }

    document.getElementById("geoSearch").innerHTML = output;
    dialogSearchData = resultsList;
}

// The datalist tag with id='geoSearch' tries to search through all its contained options to check if one is selected
// placeInput: the user input of the place to check if selected
function findSelectedPlace(placeInput)
{
    let placeList = document.getElementById("geoSearch");

    // Check through all place options from the datalist tag until you find the selected one
    for (let i = 0; i < placeList.options.length; i++)
    {
        // If this option was selected, indicate it as the new selected place
        if (placeInput == placeList.options[i].value)
        {
            // retrieve place properties for selecting new place and setting port input
            let nation = dialogSearchData[i].nation;
            let place = dialogSearchData[i].place;
            let lat = dialogSearchData[i].lat;
            let lng = dialogSearchData[i].lng;

            selectNewPlace(place, nation, lat, lng);
            return;
        }
    }
}

// Updates the new port dialog to display the newly selected place and information for the new port.
// place: the new place name, nation: the new country, lat: the new latitude, lng: the new longitude
function selectNewPlace(place, nation, lat, lng)
{
    document.getElementById("newPortName").innerHTML = place;
    document.getElementById("newCountry").innerHTML = nation;
    document.getElementById("newLatitude").innerHTML = lat;
    document.getElementById("newLongitude").innerHTML = lng;

    // If there is already a marker on the dialog map for adding port, remove it.
    if (dialogPortMarker != null)
    {
        dialogPortMarker.remove();
    }

    // Show the newly selected place on the map with marker and popup
    dialogPortMarker = new mapboxgl.Marker({"color": "red"});
    dialogPortMarker.setLngLat([lng, lat]);
    let popUp = new mapboxgl.Popup({offset: 40});
    popUp.setText(place + ", " + nation);
    dialogPortMarker.setPopup(popUp);
    dialogPortMarker.addTo(dialogMap);
    popUp.addTo(dialogMap);

    dialogMap.panTo([lng, lat]);
}

// View information of a chosen port. Triggered when user clicks the view button
// on the table row with the port they choose. index: the index of a chosen port
function viewPort(index)
{
    document.getElementById("viewPortInfo").style.visibility = "visible";
    document.getElementById("mapOfPort").style.visibility = "visible"
  	let selectedPort = portDatabase.getPort(index);

    // Display data of a selected port
  	document.getElementById("portname").innerText = selectedPort.portName;
  	document.getElementById("country").innerText = selectedPort.portCountry;
  	document.getElementById("type").innerText = selectedPort.portType;
  	document.getElementById("size").innerText = selectedPort.portSize;
  	document.getElementById("latitude").innerText = selectedPort.portCoordinate.lat;
    document.getElementById("longitude").innerText = selectedPort.portCoordinate.lng;

    // Display the map to see where the viewed port is
    mapboxgl.accessToken = mapAPI;
    let map = new mapboxgl.Map({
      container: 'mapOfPort',
      center: [144.9648731,-37.8182711],
      zoom: 0,
      style: 'mapbox://styles/mapbox/streets-v10'});

    // Put the selected Port on the map
    let marker = new mapboxgl.Marker({"color":"blue"});
    marker.setLngLat([selectedPort.portCoordinate.lng,selectedPort.portCoordinate.lat]);
    let popup = new mapboxgl.Popup({offset:45});
    popup.setText(selectedPort);

    //Display marker
    marker.addTo(map);

    //Display pop up
    popup.addTo(map);

    map.panTo([selectedPort.portCoordinate.lng,selectedPort.portCoordinate.lat]);
}

// Loads saved data of ships, ports and bookings into the app
function loadData()
{
    let testData_ports = localStorage.getItem(PORTS_KEY);
    let testData_ships = localStorage.getItem(SHIPS_KEY);
    let testData_bookings = localStorage.getItem(ROUTES_KEY);

    // Load saved Ports data if already saved. Otherwise load in default data of ports from API
    if ((testData_ports !== undefined) && (testData_ports != "") && (testData_ports != null))
    {
        //  retrive the data from Local Storage
        let portsData = JSON.parse(testData_ports);
        //  restore the global ports variable (shipsData) with the data retrieved
        let portListRestore = new PortList();
        for (let i = 0; i < portsData._ports.length; i++)
        {
            let portRestore = new Port();
            portRestore.fromData(portsData._ports[i]);
            portListRestore.addNewPort(portRestore);
        }
        portDatabase.fromData(portListRestore);
    } else
    {
        //  Request portAPI data and put them into portList
        let portsURL = "https://eng1003.monash/api/v1/ports/";
        let portDataAPI = {
          callback: "portsResponse"
        };
        webServiceRequest(portsURL, portDataAPI);
    }

    // Load saved Ships data if already saved. Otherwise load in default data of ships from API
    if ((testData_ships !== undefined) && (testData_ships != "") && (testData_ships != null))
    {
        //  retrive the data from Local Storage
        let shipsData = JSON.parse(testData_ships);
        //  restore the global ship variable (shipsData) with the data retrieved
        let shipListRestore = new ShipList();
        for (let i = 0; i < shipsData._ships.length; i++)
        {
            let shipRestore = new Ship();
            shipRestore.fromData(shipsData._ships[i]);
            shipListRestore.addNewShip(shipRestore);
        }
        shipDatabase.fromData(shipListRestore);
    } else
    {
        //  Request shipAPI data and then put them into shipList
        let shipsURL = "https://eng1003.monash/api/v1/ships/";
        let shipDataAPI = {
          callback: "shipResponse"
        };
        webServiceRequest(shipsURL, shipDataAPI);
    }

    // Load saved Bookings data if already saved
    if ((testData_bookings !== undefined) && (testData_bookings != "") && (testData_bookings != null))
    {
        let bookingsData = JSON.parse(testData_bookings);

        let bookingsRestore = new Bookings();
        for (let i = 0; i < bookingsData._routes.length; i++)
        {
            let routeRestore = new Route();

            // Restore the route's source port
            let sourcePortRestore = new Port();
            sourcePortRestore.fromData(bookingsData._routes[i]._starting);

            // Restore the route's destination port
            let destinationPortRestore = new Port();
            destinationPortRestore.fromData(bookingsData._routes[i]._destination);

            // Restore the route's ship
            let routeShipRestore = new Ship();
            routeShipRestore.fromData(bookingsData._routes[i]._ship);

            let arrayOfWaypoints = [];
            // Restore the route's waypoints
            for (let index = 0; index < bookingsData._routes[i]._waypoints.length; index++)
            {
                let waypointRestore = new Waypoint();
                waypointRestore.fromData(bookingsData._routes[i]._waypoints[index]);
                arrayOfWaypoints.push(waypointRestore);
            }

            // Load in saved data to the route and add it in as data for restoring the bookings database
            routeRestore.fromData(bookingsData._routes[i], routeShipRestore, sourcePortRestore, destinationPortRestore, arrayOfWaypoints);
            bookingsRestore._routes.push(routeRestore);
        }
        bookedRoutes.fromData(bookingsRestore);
    }
}

// Callback function to load in default shipAPI data
// shipDetails: the data from the ship API in callback
function shipResponse(shipDetails)
{
    for (let i = 0; i < shipDetails.ships.length; i++)
    {
        // Collect ship data to create new Ship object to be added to the Ship database
        let name = shipDetails.ships[i].name;
        let maxSpeed = shipDetails.ships[i].maxSpeed / 1.852;
        let range = shipDetails.ships[i].range;
        let desc = shipDetails.ships[i].desc;
        let cost = shipDetails.ships[i].cost;
        let status = shipDetails.ships[i].status;
        let comments = shipDetails.ships[i].comments;

        // If this ship is available, add it in to the database
        if (status == "available")
        {
            let ship = new Ship(name,maxSpeed,range,desc,cost,comments);
            shipDatabase.addNewShip(ship);
        }
    }
    displayShips();
}

// Callback function to load in default portAPI data
// portsDetails: the data from the port API in callback
function portsResponse(portsDetails)
{
    for (let i = 0; i < portsDetails.ports.length; i++)
    {
        // Collect port data to create new Port object to be added to the Port database
        let name = portsDetails.ports[i].name;
        let country = portsDetails.ports[i].country;
        let type = portsDetails.ports[i].type;
        let size = portsDetails.ports[i].size;
        let coordinate = {
          lat: portsDetails.ports[i].lat,
          lng: portsDetails.ports[i].lng
        };

        let port = new Port(name,country,type,size,coordinate);
        portDatabase.addNewPort(port);
    }
    displayPorts();
}

//  This function is used to store all data in Local Storage
function storeData()
{
  // For the ships, save ships data
	localStorage.setItem(SHIPS_KEY, JSON.stringify(shipDatabase));

  // For the bookings Data, save bookings data
  localStorage.setItem(ROUTES_KEY, JSON.stringify(bookedRoutes));

  // For the ports, save ports data
  localStorage.setItem(PORTS_KEY, JSON.stringify(portDatabase));

}

// Makes a request call for the weather given the coordinates and time
// lat: the latitude given, lng: the longitude given, time: the time given (includes date)
// callbackFunc: the string of the name of the function to use for callback
function showWeather(lat, lng, time, callbackFunc)
{
    let weatherAPI = "7905c6909f7550c090bdfe82501c495f";
    let data = {
      exclude: "minutely,hourly,alerts,flags",
      units: "ca",
      callback: callbackFunc
    };
    darkSkyRequest(weatherAPI, lat, lng, data, time);
}

// Callback function that assigns weather data to the source port
// forecast: the weather data collected
function sourcePortWeather(forecast)
{
    try
    {
        // Collects weather data for the source port in the route
        routeWeatherStore.startWeather = {
              icon: forecast.currently.icon,
              temperature: forecast.currently.temperature,
              uvIndex: forecast.currently.uvIndex,
              humidity: (forecast.currently.humidity * 100).toFixed(0),
              precipProbability: (forecast.currently.precipProbability * 100).toFixed(0),
              feelsLike: forecast.currently.apparentTemperature,
              dewPoint: forecast.currently.dewPoint,
              windSpeed: forecast.currently.windSpeed,
              windBearing: forecast.currently.windBearing,
              pressure: forecast.currently.pressure,
              visibility: forecast.currently.visibility
        };
    } catch(error)
    {
        // In case of error assign weather data as undefined
        routeWeatherStore.startWeather = {
            icon: "",
            temperature: undefined,
            uvIndex: undefined,
            humidity: undefined,
            precipProbability: undefined,
            feelsLike: undefined,
            dewPoint: undefined,
            windSpeed: undefined,
            windBearing: undefined,
            pressure: undefined,
            visibility: undefined
        };
    }

    // If the forecast should be displayed on map, style the marker to show forecast
    if (isMapForecastDisplayed)
    {
        // Put the source port on the map as a marker with weather forecast
        let sourcePortEl = document.createElement('div');
        sourcePortEl.className = 'forecastMarker';
        if (routeWeatherStore.startWeather.icon != "")
        {
            sourcePortEl.innerHTML = "<img src='appImages/" + routeWeatherStore.startWeather.icon + ".PNG' alt='" + routeWeatherStore.startWeather.icon + "' height='27' width='27'>";
        } else
        {
            sourcePortEl.innerHTML = "";
        }
        sourcePortEl.innerHTML += "<div class='markerName'>" + routeWeatherStore.startPort.portName + "</div>";

        // Define colour part for temperature display
        let sourcePortColour = "";
        if (routeWeatherStore.startWeather.temperature === undefined || routeWeatherStore.startWeather.temperature === null)
        {
            sourcePortColour = "grey";
        } else
        {
            // choose a colour, represented as hexadecimals, based on the temperature
            if (routeWeatherStore.startWeather.temperature <= 0)
            {
                sourcePortColour = "#006eff";
            } else if(routeWeatherStore.startWeather.temperature <= 20)
            {
                sourcePortColour = "#26b7ff";
            } else if(routeWeatherStore.startWeather.temperature <= 35)
            {
                sourcePortColour = "#ffb326";
            } else
            {
                sourcePortColour = "#ff0000";
            }
        }

        // If colour is grey, show N/A for temperature
        if (sourcePortColour == "grey")
        {
            sourcePortEl.innerHTML += "<div class='tempField' style='background:" + sourcePortColour + ";'><b>N/A</b></div>";
        } else
        {
            sourcePortEl.innerHTML += "<div class='tempField' style='background:" + sourcePortColour + ";'><b>" + routeWeatherStore.startWeather.temperature + "&deg;C</b></div>";
        }

        // Place the marker on the map with forecast
        let startPoint = new mapboxgl.Marker(sourcePortEl);
        startPoint.setLngLat([routeWeatherStore.startPort.portCoordinate.lng, routeWeatherStore.startPort.portCoordinate.lat]);
        startPoint.addTo(mapForWeather);
    }
}

// Callback function that assigns weather data to the destination port
// forecast: the weather data collected
function destinationPortWeather(forecast)
{
    // Collect weather data for the destination port in the route
    try
    {
        routeWeatherStore.arrivalWeather = {
              icon: forecast.currently.icon,
              temperature: forecast.currently.temperature,
              uvIndex: forecast.currently.uvIndex,
              humidity: (forecast.currently.humidity * 100).toFixed(0),
              precipProbability: (forecast.currently.precipProbability * 100).toFixed(0),
              feelsLike: forecast.currently.apparentTemperature,
              dewPoint: forecast.currently.dewPoint,
              windSpeed: forecast.currently.windSpeed,
              windBearing: forecast.currently.windBearing,
              pressure: forecast.currently.pressure,
              visibility: forecast.currently.visibility
        };

    } catch(error)
    {
        // In case of error assign weather data as undefined
        routeWeatherStore.arrivalWeather = {
            icon: "",
            temperature: undefined,
            uvIndex: undefined,
            humidity: undefined,
            precipProbability: undefined,
            feelsLike: undefined,
            dewPoint: undefined,
            windSpeed: undefined,
            windBearing: undefined,
            pressure: undefined,
            visibility: undefined
        };
    }

    // If the forecast should be displayed on map, style the marker to show forecast
    if (isMapForecastDisplayed)
    {
      // Put the destination port on the map as a marker with weather forecast
      let destPortEl = document.createElement('div');
      destPortEl.className = 'forecastMarker';
      if (routeWeatherStore.arrivalWeather.icon != "")
      {
          destPortEl.innerHTML = "<img src='appImages/" + routeWeatherStore.arrivalWeather.icon + ".PNG' alt='" + routeWeatherStore.arrivalWeather.icon + "' height='27' width='27'>";
      } else
      {
          destPortEl.innerHTML = "";
      }
      destPortEl.innerHTML += "<div class='markerName'>" + routeWeatherStore.destinationPort.portName + "</div>";

      // Define colour part for temperature display
      let destPortColour = "";
      if (routeWeatherStore.arrivalWeather.temperature === undefined || routeWeatherStore.arrivalWeather.temperature === null)
      {
          destPortColour = "grey";
      } else
      {
          // choose a colour, represented as hexadecimals, based on the temperature
          if (routeWeatherStore.arrivalWeather.temperature <= 0)
          {
              destPortColour = "#006eff";
          } else if(routeWeatherStore.arrivalWeather.temperature <= 20)
          {
              destPortColour = "#26b7ff";
          } else if(routeWeatherStore.arrivalWeather.temperature <= 35)
          {
              destPortColour = "#ffb326";
          } else
          {
              destPortColour = "#ff0000";
          }
      }

      // If colour is grey, show N/A for temperature
      if (destPortColour == "grey")
      {
          destPortEl.innerHTML += "<div class='tempField' style='background: " + destPortColour + ";'><b>N/A</b></div>";
      } else
      {
          destPortEl.innerHTML += "<div class='tempField' style='background: " + destPortColour + ";'><b>" + routeWeatherStore.arrivalWeather.temperature + "&deg;C</b></div>";
      }

      // Place the marker on the map with forecast
      let endPoint = new mapboxgl.Marker(destPortEl);
      endPoint.setLngLat([routeWeatherStore.destinationPort.portCoordinate.lng, routeWeatherStore.destinationPort.portCoordinate.lat]);
      endPoint.addTo(mapForWeather);
    }
}

// Callback function that assigns weather data to a waypoint and decrements
// the waypointForecastIndex to move to the next waypoint
// forecast: the weather data collected
function waypointWeather(forecast)
{
    // Collect weather data for the waypoint in the route
    try {
        routeWeatherStore.waypoints[waypointForecastIndex].forecast = {
            icon: forecast.currently.icon,
            temperature: forecast.currently.temperature,
            uvIndex: forecast.currently.uvIndex,
            humidity: (forecast.currently.humidity * 100).toFixed(0),
            precipProbability: (forecast.currently.precipProbability * 100).toFixed(0),
            feelsLike: forecast.currently.apparentTemperature,
            dewPoint: forecast.currently.dewPoint,
            windSpeed: forecast.currently.windSpeed,
            windBearing: forecast.currently.windBearing,
            pressure: forecast.currently.pressure,
            visibility: forecast.currently.visibility
        };

    } catch(error)
    {
        // In case of error assign weather data as undefined
        routeWeatherStore.waypoints[waypointForecastIndex].forecast = {
            icon: "",
            temperature: undefined,
            uvIndex: undefined,
            humidity: undefined,
            precipProbability: undefined,
            feelsLike: undefined,
            dewPoint: undefined,
            windSpeed: undefined,
            windBearing: undefined,
            pressure: undefined,
            visibility: undefined
        };
    }

    // If the forecast should be displayed on map, style the marker to show forecast
    if (isMapForecastDisplayed)
    {
        let waypointLng = routeWeatherStore.waypoints[waypointForecastIndex].coord.lng;
        let waypointLat = routeWeatherStore.waypoints[waypointForecastIndex].coord.lat;

        // Make new marker and popup for waypoint
        let el = document.createElement('div');
        el.className = 'forecastMarker';
        if (routeWeatherStore.waypoints[waypointForecastIndex].forecast.icon != "")
        {
            el.innerHTML = "<img src='appImages/" + routeWeatherStore.waypoints[waypointForecastIndex].forecast.icon + ".PNG' alt='" + routeWeatherStore.waypoints[waypointForecastIndex].forecast.icon + "' height='27' width='27'>";
        } else
        {
            el.innerHTML = "";
        }
        el.innerHTML += "<div class='markerName'>waypoint" + (waypointForecastIndex + 1) + "</div>";

        // Define colour part for temperature display
        let waypointColour = "";

        if (routeWeatherStore.waypoints[waypointForecastIndex].forecast.temperature === undefined || routeWeatherStore.waypoints[waypointForecastIndex].forecast.temperature === null)
        {
            waypointColour = "grey";
        } else
        {
            // Choose a colour, represented as hexadecimals, based on the temperature
            if (routeWeatherStore.waypoints[waypointForecastIndex].forecast.temperature <= 0)
            {
                waypointColour = "#006eff";
            } else if(routeWeatherStore.waypoints[waypointForecastIndex].forecast.temperature <= 20)
            {
                waypointColour = "#26b7ff";
            } else if(routeWeatherStore.waypoints[waypointForecastIndex].forecast.temperature <= 35)
            {
                waypointColour = "#ffb326";
            } else
            {
                waypointColour = "#ff0000";
            }
        }

        // If colour is grey show N/A for temperature
        if (waypointColour == "grey")
        {
            el.innerHTML += "<div class='tempField' style='background:" + waypointColour + ";'><b>N/A</b></div>";
        } else
        {
            el.innerHTML += "<div class='tempField' style='background:" + waypointColour + ";'><b>" + routeWeatherStore.waypoints[waypointForecastIndex].forecast.temperature + "&deg;C</b></div>";
        }

        // Place the marker on the map with forecast
        let newMarker = new mapboxgl.Marker(el);
        newMarker.setLngLat([waypointLng, waypointLat]);
        newMarker.addTo(mapForWeather);
    }

    waypointForecastIndex -= 1;
}
