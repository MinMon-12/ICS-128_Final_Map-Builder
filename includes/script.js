let localEvents = [];
let favouriteEvents = [];
let countryCode = "CA";
const APIKEY = 'FWymGciklGsiIkJDr0CfyUz6CmxiDAA9';
let markers = [];
let customEvents = [];

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
    }
}

//class to create custom event objects
class CustomEvent {
    constructor(id,name, date, venue, genre, lat, long){
        this.id = id;
        this.name = name;
        this.date = date;
        this.venue = venue;
        this.genre = "Custom Event";
        this.lat = lat;
        this.long = long;
    }
}

//Fetch saved events when the page loads
$(document).ready(function() {
    // Fetch saved events from JSON server
    fetchFavourites().then(() => {
        showSavedEvents(); // Display favourite events on map
    });
    fetchEvents().then(() =>{
        $("$btnLocalEvents").on("click", showLocalEvents);
    })
    //fetchEvents(); // Fetch events from Ticketmaster API on page load
    //Show my events menu on page load
    $(".myEventsMenu").show();
    //Hide local events menu on page load
    $(".localEventsMenu").hide();
});

//function to get the map 
var map = L.map('map',{
    minZoom: 3
}).setView([49.2827, -123.1207], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

//function to get icon according to the parameter of the function
let createColoredIcon =(color) => {
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
let blueIcon = createColoredIcon('blue');
  
//function to add marker to the map
let addMarker = (event, lat, long ) => {
    let icon;
    // Set icon based on genre
    if (event.genre === "Music") {
        icon = redIcon;
    } else if (event.genre === "Sports") {
        icon = greenIcon;
    } else if (event.genre === "Arts & Theatre") {
        icon = violetIcon;
    } else if (event.genre === "Film") {
        icon = goldIcon;
    } else if (event.genre === "Custom Event") {
        icon = blueIcon;
    } else {
        icon = grayIcon;
    }
    let marker = L.marker([lat, long], {
        title: event.name, // Set the title of the marker to the event name
        icon: icon // Set the icon of the marker
    }).addTo(map); // Add marker to map
    if(event.genre === "Custom Event"){
        marker.bindPopup(createCustomEventCard(event)); // Bind popup to the marker with event details
    }else{
        marker.bindPopup(createEventCard(event)); // Bind popup to the marker with event details
    }
    bindMarkerClickEvents(); // Bind click events to the marker
    $(marker._icon).attr('id', `marker${event.id}`); // Store event ID in marker's data
    return marker; // Return the marker object
}

// Main async function to fetch events from Ticketmaster API and populate dropdowns
let fetchEvents = async() => {
    $("#spinner2").addClass("spin");
    $("#btnLocalEvents").attr("disabled", "disabled");
    try {
        clearEvents(markers); // Clear existing markers before displaying new events

        let page = 0;
        const maxPages = 3; // Set maximum number of pages to fetch

        // Loop through pages
        while (page < maxPages) {
            let data = await fetchEventPage(page); // Ensure this uses `fetch()` internally

            if (!data || !data._embedded?.events) break;
            processEvents(data._embedded.events, page); // Process and store events
            page++;
        }
        // Populate genres
        const genres = getGenres(); // Assumes this returns an array
        $('#genreDropdown').empty().append('<option value="All Genres">All Genres</option>');
        genres.forEach(genre => {
            $('#genreDropdown').append(`<option value="${genre}">${genre}</option>`);
        });
        // Populate cities
        const cities = getCity(); // Assumes this returns an array
        $('#cityDropdown').empty().append('<option value="All Cities">All Cities</option>');
        cities.forEach(city => {
            $('#cityDropdown').append(`<option value="${city}">${city}</option>`);
        });
        return localEvents; // Return the array of events
    } catch (error) {
        console.error("Error fetching events:", error);
        showModal(error); // Custom modal for user-friendly error message
    } finally {
        $("#spinner2").removeClass("spin"); // Remove spinner class after fetching
        $("#btnLocalEvents").removeAttr("disabled") // Enable button after fetching
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

let processedEvents = [];
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

        // Only add events and display marker that have a valid location
        if (lat && long) {
            let event = new Event(id, name, date, venue, description, image, genre, subgenre, city, lat, long);
            localEvents.push(event); // Add event to global array
        }
    });
}

//loop through the events array and get the genre of each event
let getGenres = () => {
    let genres = localEvents.map(event => event.genre); // Map to get all genres
    // Remove duplicates from the genres array
    let uniqueGenres = genres.filter((genre, index) => {
        return genres.indexOf(genre) === index;
    });
    return uniqueGenres; // Return unique genres
}

//loop through the events array and get the city of each event
let getCity = () => {
    let cities = localEvents.map(event => event.city); // Map to get all cities
    // Remove duplicates from the cities array
    let uniqueCities = cities.filter((city, index) => {
        return cities.indexOf(city) === index;
    });
    //sort the cities alphabetically
    uniqueCities.sort();
    return uniqueCities; // Return unique cities
}

// A function to bind click event to Leaflet marker icons 
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
        event = findFavouriteEventByID(eventID); // Check if event is in favourites
        flyToEventLocation(event); // Fly to event location if found in favourites
    }
}

// Extract event ID from marker ID
function extractEventID(markerID) {
    return markerID.replace('marker', '');
}

// Find event by ID from events array
function findEventByID(id) {
    return localEvents.find(event => event.id == id);
}

// Find event by ID from favourite events array
function findFavouriteEventByID(id) {
    return favouriteEvents.find(event => event.id == id);
}

// Fly to the event location on the map
function flyToEventLocation(event) {
    const offsetLat = event.lat + 0.0065; // the value to control vertical offset
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
                <button class="btn btn-primary" id="btnAddToFavourites" data-id="${event.id}">Add to Favourites</button>
            </div>
        </div>
    `;
};

// This function takes a custom event object and creates a card element to display the custom event details
let createCustomEventCard = (event) => {
    return `
        <div class="card" id="${event.id}">
            <div class="card-body">
                <h5>${event.name}</h5>
                <h6>${event.genre}</h6>
                <p><strong>Date:</strong> ${event.date}</p>
                <p><strong>Venue:</strong> ${event.venue}</p>
                <button class="btn btn-primary" id="btnCustomEdit" data-id="${event.id}">Add to Favourites</button>
                <button class="btn btn-primary" id="btnCustomDelete" data-id="${event.id}">Delete</button>
            </div>
        </div>
    `;
};

// This function saves the favourite events to json server
let saveToFavourites = (eventID) => {
    let event = findEventByID(eventID); // Find the event by ID
    event.id = favouriteEvents.length + 1; // Assign a new ID for the favourite event
    // Check if event is already in favourites
    if (event) {
        // Check if the event is already in favourites
        if (favouriteEvents.some(e => e.id === event.id)) {
            alert("Event already in favourites!"); // Alert if event is already in favourites
            return;
        }
        $.ajax({
            url: 'https://min.json.compsci.cc/foo', // correct endpoint
            method: 'POST',
            data: JSON.stringify(event),
            contentType: 'application/json',
            success: function(response) {
                //
            },
            error: function( status, error) {
                showModal(error); // Show error modal if fetching fails
            }
        });
    } else {
        alert("Event not found!"); // Alert if event not found
    }
}


// This function takes an array of events and clears the existing markers on the map
let clearEvents = (markers) => {
    // Clear existing markers
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers.length = 0; // Clear the markers array in place
}

// This function filters events based on the selected city and displays them on the map
// It takes the city to filter and the array of events as arguments
let filterEventsByCity = (cityToFilter, events) => {
    clearEvents(markers); // Clear existing markers before filtering
    let filteredEvents = events.filter(event => 
        event.city === cityToFilter);
    filteredEvents.forEach(event => {
        markers.push(addMarker(event, event.lat, event.long)); // Add markers for filtered events
    });
}

// This function filters events based on the selected genre and displays them on the map
// It takes the genre to filter and the array of events as arguments
let filterEvents = (genreToFilter, localEvents) => {
    clearEvents(markers); // Clear existing markers before filtering
    let filteredEvents = localEvents.filter(event => 
        event.genre === genreToFilter);
    filteredEvents.forEach(event => {
        markers.push(addMarker(event, event.lat, event.long)); // Add markers for filtered events
    });
}

let showSavedEvents = () => {
    clearEvents(markers); // Clear markers
    if (favouriteEvents.length === 0) {
        showModal(error="You have no items saved yet."); // Show error modal if fetching fails
    }else{
        favouriteEvents.forEach(event => {
            markers.push(addMarker(event, event.lat, event.long)); // Add markers for favourite events
        });
    }
}


//This function show saved events and custom events on the map
let showLocalEvents = () => {
    clearEvents(markers); // Clear markers
    if (localEvents.length === 0) {
        showModal(error="Network error. Please try again later"); // Show error modal if fetching fails
    }else{
        localEvents.forEach(event => {
            markers.push(addMarker(event, event.lat, event.long)); // Add markers for local events
        });
    }
}

//This async function fetch the favourite events from json server and return the data
let fetchFavourites = async () => {
    $("#spinner1").addClass("spin");
    try {
        const response = await fetch('https://min.json.compsci.cc/foo');
        if (!response.ok) throw new Error("Failed to fetch favourites");

        const data = await response.json();
        favouriteEvents.push(...data); // Spread into array
        console.log(favouriteEvents);
    } catch (error) {
        clearEvents(markers);
        showModal(error);  // Show error modal if fetching fails
    } finally {
        $("#spinner1").removeClass("spin"); // Remove spinner class after fetching
    }
};

// Event listener for "Add Event" button click
$("#btnAddEvent").on("click", function() {
    //animate the navbar to go up and hide
    $(".menubar").animate({top: "-100px"}, 500, function() {
        //if the map is clicked, put the marker on the location clicked
        map.on('click', function(e) {
            let lat = e.latlng.lat; // Get latitude from click event
            let long = e.latlng.lng; // Get longitude from click event
            let marker = L.marker([lat, long], {icon: blueIcon}); // Add draggable marker to map
            
            marker.addTo(map); // Add marker to map
            //make the map clickable once
            map.off('click'); // Remove click event from map
            // Show the form to add event details
            $("#addEventForm").css({top: "-100px", display: "block"}).animate({top: "0px"}, 500);
            //if the form is submitted, save the event to the json server
            $("#eventForm").on("submit", function(event) {
                // Make the page not refresh when the button is clicked
                event.preventDefault(); // Prevent default form submission
                let id = customEvents.length + 1; // Assign a new ID for the custom event
                let name = $("#customEventName").val(); // Get event name from input field
                let date = $("#customEventDate").val(); // Get event date from input field
                let venue = $("#customEventLocation").val(); // Get event venue from input field

                // Create a new event object with the provided details
                let customEvent = new CustomEvent(id,name, date, venue, lat, long);                
                
                $.ajax({
                    url: 'https://min.json.compsci.cc/foo',
                    method: 'POST',
                    data: JSON.stringify(customEvent), 
                    contentType: 'application/json',
                    success: function(response) {
                        //show success modal 
                        showModal("Event added successfully!"); // Show success message
                        customEvents.push(customEvent); // Add the new event to the customEvents array
                        markers.push(addMarker(customEvent, lat, long)); // Add marker for the new event
                        map.removeLayer(marker); // Remove the temporary marker from the map
                        $("#addEventForm").animate({top: "-100px"}, 500, function() {
                            $(this).css({display: "none"}); // Hide the form after animation
                            $(".menubar").animate({top: "60px"}, 500, function() {
                                $(this).css("top", ""); // Remove the top attribute to restore original value
                            });
                        });
                    },
                    error: function(status, error) {
                        map.removeLayer(marker); // Remove the temporary marker from the map
                        showModal(error="Error adding new event. Please try again later."); // Show error modal if fetching fails
                        $("#addEventForm").animate({top: "-100px"}, 500, function() {
                            $(this).css({display: "none"}); // Hide the form after animation
                            $(".menubar").animate({top: "60px"}, 500, function() {
                                $(this).css("top", ""); // Remove the top attribute to restore original value
                            });
                        });
                    }
                });
            });

            //If cancel is clicked, remove the marker and hide the form
            $("#btnCancelAddEvent").on("click", function(event) {
                // Make the page not refresh when the button is clicked
                event.preventDefault(); // Prevent default form submission
                map.removeLayer(marker); // Remove the marker from the map
                $("#addEventForm").animate({top: "-100px"}, 500, function() {
                    $("#addEventForm").css({display: "none"}); // Hide the form after animation
                    $(".menubar").animate({top: "60px"}, 500, function() {
                        $(this).css("top", ""); // Remove the top attribute to restore original value
                    });
                });
            });
        });
    });
});


// Show My Events Menu
$("#btnSavedEvents").click(function () {
  $(".myEventsMenu").show();
  $(".localEventsMenu").hide();
});

// Show Local Events Menu
$("#btnLocalEvents").click(function () {
  $(".localEventsMenu").show();
  $(".myEventsMenu").hide();
});

// Event listener for showing saved events
$("#btnSavedEvents").on("click", showSavedEvents); // Show favourite events when button is clicked
// Event listenter for showing local events
$("#btnLocalEvents").on("click", showLocalEvents); // Show local events when button is clicked

// Event listener for city dropdown change
$("#cityDropdown").on("change", function() {
    let cityToFilter = $(this).val(); // Get selected city from dropdown
    // Check if "All" is selected
    if (cityToFilter == "All Cities") {
        clearEvents(markers); // Clear existing markers if "All" is selected
        localEvents.forEach(event => {
            markers.push(addMarker(event, event.lat, event.long)); // Add markers for all events
        });
        return;
    } else {
        filterEventsByCity(cityToFilter, localEvents); // Filter events based on selected city
    }
});

// Event listener for genre dropdown change
$("#genreDropdown").on("change", function() {
    let genreToFilter = $(this).val(); // Get selected genre from dropdown
    console.log(genreToFilter);
    // Check if "All" is selected
    if (genreToFilter == "All Genres") {
        clearEvents(markers); // Clear existing markers if "All" is selected
        localEvents.forEach(event => {
            markers.push(addMarker(event, event.lat, event.long)); // Add markers for all events
        });
        return;
    } else {
        filterEvents(genreToFilter, localEvents); // Filter events based on selected genre
    }
});

// Event listener for adding to favourites (delegated)
$(document).on("click", "#btnAddToFavourites", function() {
    alert("Clicked");
    let eventID = $(this).data('id'); // Get event ID from button data attribute
    saveToFavourites(eventID); // Save event to favourites
});

//function to show the error modal
function showModal(message) {
    // Set the error message in the modal
    $('#errorMessage').text(message);
    // Show the modal
    $('#modal').fadeIn();
}

// Function to close the error modal
function closeModal() {
    // Hide the modal
    $('#modal').fadeOut();
}



    
