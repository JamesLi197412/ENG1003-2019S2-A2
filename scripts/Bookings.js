/*
* Purpose: Holds the Bookings class that stores booked routes
* Team: ENG1003 Team 078
* Author: Jason Tay, Zhiyue Li, Steven Cheng, Steven Yang
* Last Modified: 17/10/2019
*/

class Bookings{

    // Create new Bookings object with empth list of booked routes
    constructor()
    {
        this._routes = [];
    }

    // Returns an array of routes
    get routes()
    {
        return this._routes;
    }

    // Returns the route at the specified index
    // index: the index to choose the route to return
    getRoute(index)
    {
        //  Check number
        if (!isNaN(index))
        {
            // If out of range, return nothing.
            if (index >= this._routes.length || index < 0)
            {
                return null;
            }
            return this._routes[index];
        }
    }

    // Adds in a new route as a booked route.
    // newRoute: the new route to add in
    bookRoute(newRoute)
    {
        this._routes.push(newRoute);
    }

    // Deletes the route at the specified index
    // index: the index to choose the route to delete
    deleteRoute(index)
    {
        // Check if index is a number
        if (!isNaN(index))
        {
            // If index is out of range, give error message and exit function
            if (index >= this._routes.length || index < 0)
            {
                alert("This route doesn't exist");
                return;
            }
            this._routes.splice(index, 1);
        }
    }

    // Restores this Bookings object.
    // dataObject: the Bookings object used to restore this object
    fromData(dataObject)
    {
        this._routes = dataObject._routes;
    }

}
