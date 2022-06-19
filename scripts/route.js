/*
* Purpose: Holds the route class that stores route information and data
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 19/10/2019
*/

"use strict"

//  initial route is created
class Route
{
    // Creates an instance of this route object and sets up its properties
    // destination: the destination port where the route finishes
    // starting: the starting port where the route starts
    // ship: the ship travelling this route
    // departDate: the date of departure as a Date object
    constructor(destination, starting, ship, departDate)
  	{
    		this._destination = destination;
    		this._starting = starting;
        this._waypoints = [];
        this._startDate = departDate;
        this._endDate = null;
        this._ship = ship;
        this._distance = 0;
        this._routeCost = 0;

        // The forecast data for source port and destination port begin with properties having undefined
        // to counteract against the type error of missing properties
        this._startForecast = {
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

        this._endForecast = {
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
        };;
  	}

    // Returns the ship travelling this route
    get ship()
    {
        return this._ship;
    }

    // Sets the ship for booking
    // bookingShip: the ship to set to
    set ship(bookingShip)
    {
        this._ship = bookingShip;
    }

    // Returns the destination port
    get destinationPort()
    {
        return this._destination;
    }

    // Sets the destination port for booking
    // bookingDestinationPort: the destination port to set to
    set destinationPort(bookingDestinationPort)
    {
        this._destination = bookingDestinationPort;
    }

    // Returns an array of waypoints
    get waypoints()
    {
        return this._waypoints;
    }

    // Sets the weather data of the ending forecast.
    // forecast: the weather data to set to.
    set arrivalWeather(forecast)
    {
        this._endForecast = forecast;
    }

    // Returns the weather data of the ending forecast.
    get arrivalWeather()
    {
        return this._endForecast;
    }

    // Returns the source port
    get startPort()
    {
        return this._starting;
    }

    // Sets the source port for booking
    // bookingSourcePort: the source port to set to
    set startPort(bookingSourcePort)
    {
        this._starting = bookingSourcePort;
    }

    // Sets the weather data of the starting forecast.
    // forecast: the weather data to set to
    set startWeather(forecast)
    {
        this._startForecast = forecast;
    }

    // Returns the weather data of the starting forecast.
    get startWeather()
    {
        return this._startForecast;
    }

    // Returns the departure date
    get departureDate()
    {
        return this._startDate;
    }

    // Sets the departure date
    // newDate: the new date to set to
    set departureDate(newDate)
    {
        this._startDate = newDate;
    }

    // Returns the arrival date
    get arrivalDate()
    {
        return this._endDate;
    }

    // Returns the distance to travel in the route
    get routeDistance()
    {
        return this._distance;
    }

    // Returns the cost of travelling in the route
    get routeCost()
    {
        return this._routeCost;
    }

    // Sets the departure date to a later date and predicts the new arrival date
    postpone(newDate)
    {
        this._startDate = newDate;
        this.predictArrivalDate();
    }

    // Calculate the arrival date from one point to another.
    _calculateArrival(point1, point2, startDate)
    {
        // Get the period time calculations
        let distance = this._havsineDist(point1, point2);
        let time = distance / this._ship.shipMaxSpeed;
        let days = Math.floor(time / 24);
        let hours = Math.floor(time - days * 24);
        let minutes = Math.floor((time - Math.floor(time)) * 60);

        // Adjust the time calculation, accounting for any overloads such as the final result of minutes above 60
        let minutesResult = (minutes + startDate.getMinutes()) % 60;
        let hoursResult = hours + startDate.getHours() + Math.floor(minutesResult / 60);
        days += Math.floor(hoursResult / 24);

        // Output the end date with proper date formatting
        let date = this._convertDaysToDate(days, startDate);
        let endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hoursResult, minutesResult);

        return endDate;
    }

    // Converts the days including the day of the starting date to a proper date that is returned.
    // days: the number of days after the starting date, startDate: the starting date.
    _convertDaysToDate(days, startDate)
    {
        let dateValid = false;
        let month = startDate.getMonth() + 1;
        let year = startDate.getFullYear();
        let newDay = startDate.getDate() + days;

        // Keep computing into a proper date if newDay doesn't fit inside a calendar month.
        while (!dateValid)
        {
            // Depending on the month, and possibly if it's a leap year, check if newDay overloads
            // the number of days that fit inside the current month.
            if (month == 4 || month == 6 || month == 8 || month == 9 || month == 11)
            {
                // If newDay goes over 30 days, reduce it and increment month as a month has passed.
                // Otherwise the date is in proper form.
                if (newDay > 30)
                {
                    newDay -= 30;
                    month += 1;
                } else
                {
                    dateValid = true;
                }
            } else if (month == 2)
            {
                // Check if the current year is a leap year.
                if (this._isLeapYear(year))
                {
                    // If newDay goes over 29 days, reduce it and increment month as a month has passed.
                    // Otherwise the date is in proper form.
                    if (newDay > 29)
                    {
                        newDay -= 29;
                        month += 1;
                    } else
                    {
                        dateValid = true;
                    }
                } else
                {
                    // If newDay goes over 28 days, reduce it and increment month as a month has passed.
                    // Otherwise the date is in proper form.
                    if (newDay > 28)
                    {
                        newDay -= 28;
                        month += 1;
                    } else
                    {
                        dateValid = true;
                    }
                }
            } else
            {
                // If newDay goes over 31 days, reduce it and increment month as a month has passed.
                // Otherwise the date is in proper form.
                if (newDay > 31)
                {
                    newDay -= 31;
                    month += 1;
                } else
                {
                    dateValid = true;
                }
            }

            // If month is out of range (passing December), reset month to January (1)
            // and increment year as a year has passed.
            if (month > 12)
            {
                month = 1;
                year += 1;
            }
        }

        return new Date(year, month - 1, newDay);
    }

    // Returns true if year is a leap year, otherwise returns false. year: the year to check if it's leap year.
    _isLeapYear(year)
    {
        return (year % 4 == 0 && year % 100 != 0) || (year % 100 == 0 && year % 400 == 0);
    }

    // Computes the total distance and assigns the results to its distance attribute.
    calculateTotalDistance()
    {
        let totalDistance = 0;

        // If there are any waypoints, calculate total distance including them. Otherwise calculate distance
        // between starting port and destination port as the total distance.
        if (this._waypoints.length > 0)
        {
            // Include distance from starting port to first waypoint
            totalDistance += this._havsineDist(this._starting.portCoordinate, this._waypoints[0].coord);

            // Include all other waypoints to calculate total distance
            for (let i = 0; i < this._waypoints.length-1; i++)
            {
                let point1 = this._waypoints[i].coord;
                let point2 = this._waypoints[i+1].coord;
                let distance = this._havsineDist(point1, point2);
                totalDistance += distance;
            }

            // Include distance from final waypoint to destination port for total distance
            let finalWaypoint = this._waypoints[this._waypoints.length-1];
            totalDistance += this._havsineDist(finalWaypoint.coord, this._destination.portCoordinate);
        } else
        {
            totalDistance += this._havsineDist(this._starting.portCoordinate, this._destination.portCoordinate);
        }

        this._distance = totalDistance;
        this._routeCost = this._distance * this._ship.shipCost;
    }

    // Predicts the end date as the arrival date to the destination port.
    predictArrivalDate()
    {
        // If there are any waypoints, predict their arrival dates. Otherwise only predict end date
        // to go from starting port and destination port.
        if (this._waypoints.length > 0)
        {
            this._waypoints[0].arriveDate = this._calculateArrival(this._starting.portCoordinate, this._waypoints[0].coord, this._startDate);

            // Predict arrival dates for all other waypoints
            for (let i = 0; i < this._waypoints.length-1; i++)
            {
                let point1 = this._waypoints[i].coord;
                let point2 = this._waypoints[i+1].coord;
                this._waypoints[i+1].arriveDate = this._calculateArrival(point1, point2, this._waypoints[i].arriveDate);
            }

            // Predict end date arrival when arriving at the destination port.
            let finalWaypoint = this._waypoints[this._waypoints.length-1];
            this._endDate = this._calculateArrival(finalWaypoint.coord, this._destination.portCoordinate, finalWaypoint.arriveDate);

        } else
        {
            this._endDate = this._calculateArrival(this._starting.portCoordinate, this._destination.portCoordinate, this._startDate);
        }
    }

    // Returns distance between two points that are in latitude(lat) and longitude(lng).
    // point1: the first point as object with lat and lng. point2: the second point as object with lat and lng
    _havsineDist(point1, point2)
    {
        //  Treat point1 & point 2 as object like {lat, lng}
        //  Assuming the total distance is a straight line between 2 ports
        /*
            JavaScript of haversine formula:
            var R = 6371e3; // metres
            var φ1 = lat1.toRadians();
            var φ2 = lat2.toRadians();
            var Δφ = (lat2-lat1).toRadians();
            var Δλ = (lon2-lon1).toRadians();

            var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

            var d = R * c;
          */
        let R = 6371; // kilometres   Earth Radius

        let lat1 = point1.lat;
        let lat2 = point2.lat;
        let longitude1 = point1.lng;
        let longitude2 = point2.lng;

        //  Apply the haversine formula
        let alpha1 = lat1 * Math.PI / 180;
        let alpha2 = lat2 * Math.PI / 180;
        let deltaAlpha = (alpha1 - alpha2) * Math.PI / 180;
        let deltaBeta = (longitude1 - longitude2) * Math.PI / 180;

        let a = Math.sin(deltaAlpha/2)*Math.sin(deltaAlpha/2)+Math.cos(alpha1)*Math.cos(alpha2)*Math.sin(deltaBeta/2)*Math.sin(deltaBeta/2);
        let c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
        let distance = R*c;
        return distance;

    }

    // Adds in a new waypoint if it doesn't already exist in the route
    // waypoint: the new waypoint to add in
    addWaypoint(waypoint)
    {
        //  checking if this waypoint exists in the array or not
        for (let i = 0; i < this._waypoints.length; i++)
        {
            if (this._waypoints[i] === waypoint)
            {
                alert("This waypoint has already existed");
                return null;
            }
        }
        this._waypoints.push(waypoint);
    }

    // Deletes a chosen waypoint if it exists in the route
    // waypoint: the waypoint to delete
    delWaypoint(waypoint)
    {
        if (this._waypoints.length === 0)
        {
            alert("There is no more waypoint!");
        }
        else
        {
            let index = this._findIndex(waypoint);

            // If the index is not -1 (the waypoint to delete is found), delete the chosen waypoint
            if (index != -1)
            {
                this._waypoints.splice(index, 1);
            } else
            {
                alert("This waypoint doesn't exists");
            }
        }
    }

    // Returns the index of where the waypoint is found or -1 if not found
    // findWaypoint: the waypoint to find
    _findIndex(findWaypoint)
    {
        for (let i = 0; i < this._waypoints.length; i++)
        {
            // Return index if the waypoint to find is found by having the same coordinates
            if (this._waypoints[i].coord.lat == findWaypoint.coord.lat && this._waypoints[i].coord.lng == findWaypoint.coord.lng)
            {
                return i;
            }
        }
        return -1;
    }

    // Restores this route object by passing in the loaded properties
    // dataObject: the data to use for loading properties in
    // shipObj: the ship data used for loading in the route ship
    // sourePortObj: the source port data used for loading in the source port
    // destinationPortObj: the destination port data used for loading in the destination port
    // arrayWaypoints: the array of waypoints used to load in the route's waypoints
    fromData(dataObject, shipObj, sourePortObj, destinationPortObj, arrayWaypoints)
    {
        this._destination = destinationPortObj;
        this._starting = sourePortObj;
        this._waypoints = arrayWaypoints;
        this._startDate = new Date(dataObject._startDate);
        this._endDate = new Date(dataObject._endDate);
        this._ship = shipObj;
        this._distance = dataObject._distance;
        this._routeCost = dataObject._routeCost;
        this._startForecast = dataObject._startForecast;
        this._endForecast = dataObject._endForecast;
    }

}
