/*
* Purpose: This is the main file for the app to run with
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 13/10/2019
*/

class PortList{

    // Creates a new PortList object
    constructor()
    {
        this._ports = [];
    }

    // Returns the array of ports
    get ports()
    {
        return this._ports;
    }

    // Returns the port at the specified index.
    // index: the specified index to return the port at
    getPort(index)
    {
        if(!isNaN(index))
        {
            if (index >= this._ports.length || index < 0)
            {
                return null;
            }
            return this._ports[index];
        } else
        {
            alert("The port is not in the list");
        }
    }

    // Adds in a new port.
    // newPort: the new port to add
    addNewPort(newPort)
    {
        if (newPort instanceof Port)
        {
            let index = this._searchPort(newPort);
            if (index == -1)
            {
                this._ports.push(newPort);
            }
        }
    }

    // Returns the index of where the searched port is found or -1 if not found
    // port: the port to search for.
    _searchPort(port){
        // Check through the ports array for a matching name and country
        for (let i = 0; i < this._ports.length; i++)
        {
            if (port.portName == this._ports[i].portName && port.portCountry == this._ports[i].portCountry)
            {
                return i;
            }
        }
        return -1;
    }

    // Restores this portList object.
    // dataObject: the data to use to restores this portList object
    fromData(dataObject)
    {
        this._ports = dataObject._ports;
    }
}
