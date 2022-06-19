/*
* Purpose: Holds the Ship class that stores ship data and information
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 19/10/2019
*/

class Ship{

  // Creates a new Ship object.
  // name: the ship name, maxSpeed: the ship's max speed to give
  // range: the maximum distance the ship can travel.
  // description: the ship's description
  // cost: the cost of the ship travelling in dollars per km
  // comments: any comments about the ship
  constructor(name,maxSpeed,range,description,cost,comments){
    this._shipName = name;
    this._shipMaxSpeed = maxSpeed;
    this._shipRange = range;
    this._shipDescription = description;
    this._shipCost = cost;  // per distance
    this._shipComments = comments;
  }

  // Returns the ship name
  get shipName(){
    return this._shipName;
  }

  // Returns the ship's max speed
  get shipMaxSpeed(){
    return this._shipMaxSpeed;
  }

  // Returns the ship's range
  get shipRange(){
    return this._shipRange;
  }

  // Returns the ship's description
  get shipDescription(){
    return this._shipDescription;
  }

  // Returns the ship's cost in dollars per km
  get shipCost(){
    return this._shipCost;
  }

  // Returns the comments about this ship
  get shipComments(){
    return this._shipComments;
  }

  // Restores this ship object
  // dataObject: the data to pass in to restore this ship object
  fromData(dataObject)
  {
    this._shipName = dataObject._shipName;
    this._shipMaxSpeed = dataObject._shipMaxSpeed;
    this._shipRange = dataObject._shipRange;
    this._shipDescription = dataObject._shipDescription;
    this._shipCost = dataObject._shipCost;  // per distance
    this._shipStatus = dataObject._shipStatus;
    this._shipComments = dataObject._shipComments;
  }

}
