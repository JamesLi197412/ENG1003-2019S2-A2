/*
* Purpose: This is the main file for the app to run with
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 19/10/2019
*/

"use strict"

class Waypoint
{

  // Creates a new Waypoint object.
  // coord: the waypoint coordinates in latitude and longitude
  constructor(coord)
  {
      this._coordinates = coord;

      // The forecast data for waypoint begin with properties having undefined
      // to counteract against the type error of missing properties
      this._forecast = {
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
      this._arriveDate = null;
  }

  // Returns the coordinates as an object with latitude and longitude
  get coord()
  {
      return this._coordinates;
  }

  // Returns the forecast weather
  get forecast()
  {
      return this._forecast;
  }

  // Returns the arrival date
  get arriveDate()
  {
      return this._arriveDate;
  }

  // Set the arrival date. newDate: the new date, as a Date object, to set to.
  set arriveDate(newDate)
  {
      this._arriveDate = newDate;
  }

  // Set the weather. weather: the new weather to set to
  set forecast(weather)
  {
      this._forecast = weather;
  }

  // Restores this waypoint object
  // dataObject: the data used to restore this waypoint object
  fromData(dataObject)
  {
      this._coordinates = dataObject._coordinates;
      this._forecast = dataObject._forecast;
      this._arriveDate = new Date(dataObject._arriveDate);
  }

}
