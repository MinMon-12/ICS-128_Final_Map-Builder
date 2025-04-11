let events = [];
let favouriteEvents = [];
let classficationName = "music";
let countryCode = "CA";
const APIKEY = 'FWymGciklGsiIkJDr0CfyUz6CmxiDAA9';

function createColoredIcon(color) {
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }
  
  // Create specific icons
  let greenIcon = createColoredIcon('green');
  let redIcon = createColoredIcon('red');
  let violetIcon = createColoredIcon('violet'); 
  let goldIcon = createColoredIcon('gold'); 
  let grayIcon = createColoredIcon('grey'); 

//class to create event objects
class Event {
    //constructor
    constructor(id, name, date, venue, description, image , genre, subgenre, city, lat, long){
        this.id = id;
        this.name = name;
        this.date = date;
        this.venue = venue;
        this.description = description;
        this.image = image;
        this.genre = genre;
        this.subgenre = subgenre;
        this.city = city;
        this.lat = lat;
        this.long = long;
        this.marker = this.addMarker(lat, long); // Function to Add marker to the map
    }


    //function to add marker to the map
    addMarker = (lat, long ) => {
        let icon;
        // Set icon based on genre
        if (this.genre === "Music") {
            icon = redIcon;
        } else if (this.genre === "Sports") {
            icon = greenIcon;
        } else if (this.genre === "Arts & Theatre") {
            icon = violetIcon;
        } else if (this.genre === "Film") {
            icon = goldIcon;
        }
        else {
            icon = grayIcon;
        }
        let marker = L.marker([lat, long], {
            title: this.name, // Set the title of the marker to the event name
            icon: icon // Set the icon of the marker
        }).addTo(map); // Add marker to map
        marker.bindPopup(createEventCard(this)); // Bind popup to the marker with event details
        bindMarkerClickEvents(); // Bind click events to the marker
        $(marker._icon).attr('id', `marker${this.id}`); // Store event ID in marker's data
        return marker; // Return the marker object
    }
}

//function to get the map 
var map = L.map('map',{
    minZoom: 3
}).setView([49.2827, -123.1207], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Main async function to fetch and process event data
async function fetchEvents() {
    try {
        let page = 0;
        const maxPages = 5; // Limit the number of pages to fetch

        // Loop through multiple pages of event data
        while (page < maxPages) {
            const data = await fetchEventPage(page); // Fetch a page of events
            if (!data || !data._embedded?.events) break; // Stop if no events are found

            processEvents(data._embedded.events, page); // Process each event in the page
            page++; // Go to the next page
        }
        let genres = getGenres(); // Get unique genres
        //Add genres to the dropdown menu
        genres.forEach(genre => {
            $('#genreDropdown').append(`<option value="${genre}">${genre}</option>`);
        });
        //Add cities to the dropdown menu
        let cities = getCity(); // Get unique genres
        cities.forEach(city => {
            $('#cityDropdown').append(`<option value="${city}">${city}</option>`);
        });
    } catch (error) {
        alert("Network error! Please try again later."); // Alert user on network error
        console.error("Fetch error:", error); // Handle errors during fetch
    }
}

// Fetch a single page of events from Ticketmaster API
async function fetchEventPage(page) {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?countryCode=${countryCode}&page=${page}&size=200&apikey=${APIKEY}`;

    let response = await fetch(url, {
        method: "GET",
        mode: "cors" // Enable cross-origin requests
    });

    // Throw an error if response is not successful
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json(); // Return parsed JSON data
}

// Process event data and store valid ones in the global events array
let processEvents = (eventsData, page) => {
    eventsData.forEach((item, index) => {
        let id = `${page}-${index + 1}`; // Create a unique ID using page and index
        let name = item.name;
        let date = item.dates?.start?.localDate || "Date unknown";
        let venue = item._embedded?.venues?.[0]?.name || "Unknown venue";
        let description = item.info || "No description available.";
        let image = item.images?.[0]?.url || "";

        // Get genre and subgenre if available
        let genre = item.classifications?.[0]?.segment?.name || "Miscellaneous";
        let subgenre = item.classifications?.[0]?.genre?.name || "Miscellaneous";

        // Get venue data like city and coordinates
        let venueData = item._embedded?.venues?.[0];
        let city = venueData?.city?.name || "";
        let lat = parseFloat(venueData?.location?.latitude) || 0;
        let long = parseFloat(venueData?.location?.longitude) || 0;

        // Only add events that have a valid location
        if (lat && long) {
            let event = new Event(id, name, date, venue, description, image, genre, subgenre, city, lat, long);
            events.push(event); // Add event to global array
        }
    });
}

//loop through the events array and get the genre of each event
let getGenres = () => {
    let genres = events.map(event => event.genre); // Map to get all genres
    // Remove duplicates from the genres array
    let uniqueGenres = genres.filter((genre, index) => {
        return genres.indexOf(genre) === index;
    });

    return uniqueGenres; // Return unique genres
}

//loop through the events array and get the genre of each event
let getCity = () => {
    let cities = events.map(event => event.city); // Map to get all genres
    // Remove duplicates from the cities array
    let uniqueCities = cities.filter((city, index) => {
        return cities.indexOf(city) === index;
    });

    //sort the cities alphabetically
    uniqueCities.sort();
    return uniqueCities; // Return unique genres
}

// Bind click event to Leaflet marker icons after events are displayed
function bindMarkerClickEvents() {
    $('.leaflet-marker-icon').on('click', function () {
        onMarkerClick(this); // Call custom handler for marker click
    });
}

// Function to handle marker click
function onMarkerClick(markerElement) {
    let markerID = $(markerElement).attr('id');
    console.log("Marker ID:", markerID);

    let eventID = extractEventID(markerID);
    console.log("Event ID:", eventID);

    let event = findEventByID(eventID);
    if (event) {
        flyToEventLocation(event);
    } else {
        alert("Event not found!"); // Alert if event not found
    }
}

// Extract event ID from marker ID
function extractEventID(markerID) {
    return markerID.replace('marker', '');
}

// Find event by ID from events array
function findEventByID(id) {
    return events.find(event => event.id == id);
}

// Fly to the event location on the map
function flyToEventLocation(event) {
    const offsetLat = event.lat + 0.0045; // the value to control vertical offset
    map.flyTo([offsetLat, event.long], 15, {
        duration: 2
    });
}
    
// This function takes an event object and creates a card element to display the event details
let createEventCard = (event) => {
    return `
        <div class="card" id="${event.id}">
            <div class="card-header">
                <img src="${event.image}" alt="${event.name}" class="col-12">
            </div>
            <div class="card-body">
                <h5>${event.name}</h5>
                <h6>${event.genre} - ${event.subgenre}</h6>
                <p><strong>Date:</strong> ${event.date}</p>
                <p><strong>Venue:</strong> ${event.venue}</p>
            </div>
        </div>
    `;
};

// This function 

// This function takes an array of events and clears the existing markers on the map
let clearEvents = (events) => {
    // Clear existing markers
    events.forEach(event => {
        if (event.marker) {
            map.removeLayer(event.marker);
        }
    });
}

// This function filters events based on the selected city and displays them on the map
// It takes the city to filter and the array of events as arguments
let filterEventsByCity = (cityToFilter, events) =>{
    clearEvents(events); // Clear existing markers before filtering
    let filteredEvents = events.filter(event => 
        event.city === cityToFilter);
    filteredEvents.forEach(event => {
        event.marker = event.addMarker(event.lat, event.long)}) // Add markers for filtered events
}

// This function filters events based on the selected genre and displays them on the map
// It takes the genre to filter and the array of events as arguments
let filterEvents = (genreToFilter, events) => {
    clearEvents(events); // Clear existing markers before filtering
    let filteredEvents = events.filter(event => 
        event.genre === genreToFilter);
    filteredEvents.forEach(event => {
        event.marker = event.addMarker(event.lat, event.long)}) // Add markers for filtered events
}

$("#btnFetch").on("click", fetchEvents);

// Event listener for city dropdown change
$("#cityDropdown").on("change", function() {
    let cityToFilter = $(this).val(); // Get selected city from dropdown
    // Check if "All" is selected
    if (cityToFilter === "All") {
        clearEvents(events); // Clear existing markers if "All" is selected
        events.forEach(event => {
            event.marker = event.addMarker(event.lat, event.long)}) // Add markers for all events
        return;
    }else {
        clearEvents(events); // Clear existing markers before filtering
        filterEventsByCity(cityToFilter,events); // Filter events based on selected city
    }
});
// Event listener for genre dropdown change
$("#genreDropdown").on("change", function() {
    let genreToFilter = $(this).val(); // Get selected genre from dropdown
    // Check if "All" is selected
    if (genreToFilter === "All") {
        clearEvents(events); // Clear existing markers if "All" is selected
        events.forEach(event => {
            event.marker = event.addMarker(event.lat, event.long)}) // Add markers for all events
        return;
    }else{
        clearEvents(events); // Clear existing markers before filtering
        filterEvents(genreToFilter,events); // Filter events based on selected genre
    }
});


