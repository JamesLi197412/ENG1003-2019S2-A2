/*
* Purpose: Holds the ShipList class that stores all available ships
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 14/10/2019
*/

class ShipList{

    // Creates a new ShipList object with no stored ships
    constructor()
    {
        this._ships =[];
    }

    // Returns an array of ships
    get ships()
    {
        return this._ships;
    }

    // Returns the ship at a specified index if in range, otherwise returns null
    // index: the index to return the ship at
    getShip(index)
    {
        if (index >= this._ships.length || index < 0)
        {
            return null;
        }
        return this._ships[index];
    }

    // Adds in a new ship if not already added in
    // newShip: the new ship to add in
    addNewShip(newShip)
    {
        // Check if newShip is actually a ship
        if (newShip instanceof Ship)
        {
            // Verify that it has not been added in yet
            let index = this._searchShip(newShip);
            if (index == -1)
            {
                this._ships.push(newShip);
            }

        }
    }

    // Returns the index at where the ship is found based on the name, otherwise return -1 if not found
    // newShip: the ship to search for.
    _searchShip(newShip){
        // Check through ships by comparing their names to find if it matches
        for (let i = 0; i < this._ships.length; i++)
        {
            if (newShip.shipName.toLowerCase() == this._ships[i].shipName.toLowerCase()){
                return i;
            }
        }
        return -1;
    }

    // Restores this ShipList object
    // dataObject: the data to pass in to restore this ShipList object
    fromData(dataObject)
    {
        this._ships = dataObject._ships;
    }

}
