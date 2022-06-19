/*
* Purpose: Holds the Port class that stores information about a port
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 19/10/2019
*/

class Port{

  // Creates a new Port object.
  // name: the port name, country: the port country
  // type: the port type, size: the port size
  // coordinate: the port coordinate with latitude and longitude
  constructor(name,country,type,size,coordinate){
    this._portName = name;
    this._portCountry = country;
    this._portType = type;
    this._portSize = size;
    this._coordinate = coordinate;
  }

  // Returns the port name
  get portName(){
    return this._portName;
  }

  // Returns the port country
  get portCountry(){
    return this._portCountry;
  }

  // Returns the port type
  get portType(){
    return this._portType;
  }

  // Returns the port size
  get portSize(){
    return this._portSize;
  }

  // Returns the port coordinate as an object with properties lat (for latitude) and lng (for longitude)
  get portCoordinate(){
    return this._coordinate;
  }

  // Returns the string format of the port
  toString()
  {
    return this._portName + ", " + this._portCountry;
  }

  // Restores this port object
  // dataObject: the data used for restoring this port object
  fromData(dataObject)
  {
    this._portName = dataObject._portName;
    this._portCountry = dataObject._portCountry;
    this._portType = dataObject._portType;
    this._portSize = dataObject._portSize;
    this._coordinate = dataObject._coordinate;
  }
}
