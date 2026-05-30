// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB6TZ8gpZMrE3ocSV5Xy6UxYGvcmIe9cbo",
    authDomain: "mapeventfinder.firebaseapp.com",
    projectId: "mapeventfinder",
    storageBucket: "mapeventfinder.firebasestorage.app",
    messagingSenderId: "465612820519",
    appId: "1:465612820519:web:5c3e490ea81ae66a7bbe02",
    measurementId: "G-TFJSEZD5TG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

let localEvents = [];
let favouriteEvents = [];
let countryCode = "CA";
const APIKEY = 'FWymGciklGsiIkJDr0CfyUz6CmxiDAA9';
let markers = [];



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
        this.genre = genre;
        this.lat = lat;
        this.long = long;
    }
}

//This async function fetch the favourite events from json server and return the data
let fetchFavourites = async () => {
    $("#spinner1").removeClass("d-none"); // Show spinner
    $("#spinner1").addClass("spin");
    $("#btnSavedEvents").attr("disabled", "disabled");

    //clear the favourite events array 
    favouriteEvents = [];
    try {
        // Get all documents
        const querySnapshot = await getDocs(collection(db, "favourites"));

        querySnapshot.forEach((doc) => {
            favouriteEvents.push({
                firestoreId: doc.id,
                ...doc.data().event
            });
        });
    } catch (error) {
        clearEvents(markers);
        showModal(error);  // Show error modal if fetching fails
    } finally {
        $("#btnSavedEvents").removeAttr("disabled"); // Enable button after fetching
        $("#spinner1").removeClass("spin"); // Remove spinner class after fetching
        $("#spinner1").addClass("d-none"); // Show spinner
    }
};


//Fetch saved events when the page loads
$(document).ready(function() {
    // Fetch saved events from JSON server
    fetchFavourites().then(() => {
        showSavedEvents(); // Display favourite events on map
    }).catch(error => {
        showModal(error); // Show error modal for user-friendly message
    });
    $("#btnSavedEvents").addClass("active"); // Add active class to the button
    //Show my events menu on page load
    if($("#btnSavedEvents").hasClass("active")){
        $("#btnAddToFavourites").addClass("d-none"); // Hide add to favourites button
    }
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
    $("#spinner2").removeClass("d-none"); // Show spinner
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
        showModal(error="Network error"); // Custom modal for user-friendly error message
    } finally {
        $("#spinner2").removeClass("spin"); // Remove spinner class after fetching
        $("#btnLocalEvents").removeAttr("disabled") // Enable button after fetching
        $("#spinner2").addClass("d-none"); // Show spinner
    }
}



// Fetch a single page of events from Ticketmaster API
let fetchEventPage = async(page) => {
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
let bindMarkerClickEvents =() => {
    $('.leaflet-marker-icon').on('click', function () {
        onMarkerClick(this); // Call custom handler for marker click
    });
}

// Function to handle marker click
let onMarkerClick = (markerElement) => {
    let markerID = $(markerElement).attr('id');
    let eventID = extractEventID(markerID);
    let event = findEventByID(eventID);
    if (event) {
        flyToEventLocation(event);
    } else {
        event = findFavouriteEventByID(eventID); // Check if event is in favourites
        flyToEventLocation(event); // Fly to event location if found in favourites
    }
}

// Extract event ID from marker ID
let extractEventID = (markerID) => {
    return markerID.replace('marker', '');
}

// Find event by ID from events array
let findEventByID = (id) => {
    return localEvents.find(event => event.id == id) || favouriteEvents.find(event => event.id == id);
};

// Find event by ID from favourite events array
let findFavouriteEventByID = (id) => {
    return favouriteEvents.find(event => event.id == id);
}

// Fly to the event location on the map
let flyToEventLocation = (event) => {
    const offsetLat = event.lat + 0.0065; // the value to control vertical offset
    map.flyTo([offsetLat, event.long], 15, {
        duration: 2
    });
}
    
// This function takes an event object and creates a card element to display the event details
let createEventCard = (event) => {
    let isSavedView = $("#btnSavedEvents").hasClass("active");
    let isLocalView = $("#btnLocalEvents").hasClass("active");
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
                <button class="btn btn-primary ${isSavedView ? 'd-none' : ''}" id="btnAddToFavourites" data-id="${event.id}">Add to Favourites</button>
                <button class="btn btn-danger  ${isLocalView ? 'd-none' : ''}" id="btnDelete" data-id="${event.id}">Delete</button>
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
                <button class="btn btn-danger" id="btnDelete" data-id="${event.id}">Delete</button>
            </div>
        </div>
    `;
};

// This function saves the favourite events to json server
let saveToFavourites = async(eventID) => {
    let event = findEventByID(eventID); // Find the event by ID

    if(!event){
        showModal(error="Event not found");
    }
    try {
        await addDoc(collection(db, "favourites"), {
        event: {...event}
    });
    } catch (error) {
        showModal(error= error); // Show error modal if event is not found
    }
};


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
    // Only show modal if we really have no data AND it was successfully fetched
    if (favouriteEvents.length === 0) {
        // Don't show this modal here if there's already an error handled in fetchFavourites
        console.warn("No saved events found."); // Log it instead, or handle differently
        return;
    }
    favouriteEvents.forEach(event => {
        console.log(event);
        markers.push(addMarker(event, event.lat, event.long)); // Add markers for favourite events
    });
}


//This function show saved events and custom events on the map
let showLocalEvents = async () => {
    await fetchEvents(); // Fetch events from Ticketmaster API
    clearEvents(markers); // Clear markers
    if (localEvents.length === 0) {
        showModal(error="Network error. Please try again later"); // Show error modal if fetching fails
    }else{
        localEvents.forEach(event => {
            markers.push(addMarker(event, event.lat, event.long)); // Add markers for local events
        });
    }
}



//This function delete all the data from the json server
let deleteSavedEvent = async(documentID) => {
    try {
        await deleteDoc(doc(db,"favourites", documentID));
    } catch (error) {
        showModal(error=error);
    }
}

// Event listener for "Add Event" button click
$("#btnAddEvent").on("click", function() {
    //animate the navbar to go up and hide
    $(".menubar").animate({top: "-100px"}, 500, function() {
        //if the map is clicked, put the marker on the location clicked
        map.once('click', function(e) {
            let lat = e.latlng.lat; // Get latitude from click event
            let long = e.latlng.lng; // Get longitude from click event
            let marker = L.marker([lat, long], {icon: blueIcon}); // Add draggable marker to map
            
            marker.addTo(map); // Add marker to map
            //make the map clickable once
            map.off('click'); // Remove click event from map
            // Show the form to add event details
            $("#addEventForm").css({top: "-100px", display: "block"}).animate({top: "0px"}, 300);
            //if the form is submitted, save the event to the json server
            $("#eventForm").off("submit").on("submit", async function(event) {
                // Make the page not refresh when the button is clicked
                event.preventDefault(); // Prevent default form submission
                //Assign a new ID to the event
                let id = Date.now(); // Assign a new ID for the event
                let name = $("#customEventName").val(); // Get event name from input field
                let date = $("#customEventDate").val(); // Get event date from input field
                let venue = $("#customEventLocation").val(); // Get event venue from input field

                // Create a new event object with the provided details
                let customEvent = new CustomEvent(id, name, date, venue, "Custom Event", lat, long);                
                try {
                    await addDoc(collection(db, "favourites"), {
                    event: {...customEvent}
                });
                //show success modal 
                showModal("Event added successfully!"); // Show success message
                markers.push(addMarker(customEvent, lat, long)); // Add marker for the new event
                $("#addEventForm").animate({top: "-100px"}, 500, function() {
                    $(this).css({display: "none"}); // Hide the form after animation
                    $(".menubar").animate({top: 0}, 500); //Show the menu bar 
                });
                } catch (error) {
                    showModal(error= error); // Show error modal if event is not found
                    map.removeLayer(marker); // Remove the temporary marker from the map
                    showModal(error+ status); // Show error modal if fetching fails
                    $("#addEventForm").animate({top: "-100px"}, 500, function() {
                        $(this).css({display: "none"}); // Hide the form after animation
                        $(".menubar").animate({top: 0}, 500);//Show the menu bar 
                    });
                }
            });

            //If cancel is clicked, remove the marker and hide the form
            $("#btnCancelAddEvent").on("click", function(event) {
                // Make the page not refresh when the button is clicked
                event.preventDefault(); // Prevent default form submission
                map.removeLayer(marker); // Remove the marker from the map
                $("#addEventForm").animate({top: "-100px"}, 500, function() {
                    $("#addEventForm").css({display: "none"}); // Hide the form after animation
                    $(".menubar").animate({top: 0}, 500);//Show the menu bar 
                });
            });
        });
    });
});


// Show My Events Menu
$("#btnSavedEvents").click(function () {
    $("#btnSavedEvents").addClass("active"); // Add active class to the button
    $("#btnLocalEvents").removeClass("active"); // Remove active class from the other button
    $(".myEventsMenu").show();
    $(".localEventsMenu").hide();
});

// Show Local Events Menu
$("#btnLocalEvents").click(function () {
    $("#btnLocalEvents").addClass("active"); // Add active class to the button
    $("#btnSavedEvents").removeClass("active"); // Remove active class from the other button
    $(".localEventsMenu").show();
    $(".myEventsMenu").hide();
});

// Event listener for showing saved events
$("#btnSavedEvents").on("click", function(){
    fetchFavourites().then(() => {
        showSavedEvents(); // Display favourite events on map
    });
}); // Show favourite events when button is clicked
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
    let eventID = $(this).data('id'); // Get event ID from button data attribute
    if(saveToFavourites(eventID)){
        showModal("Event saved")
    }; // Save event to favourites
});

//function to show the error modal
let showModal = (message) =>{
    // Set the error message in the modal
    $('#message').text(message);
    // Show the modal
    $('#modal').fadeIn();
}

// Function to close the error modal
let closeModal = (modalName)=> {
    // Hide the modal
    $(modalName).fadeOut();
}

// Event listener for closing the modal
$(".btnCloseModal").on("click", function() {
    closeModal(".modal"); // Close the modal when button is clicked
});

// Event listener for deleting saved item (delegated)
$(document).on("click", "#btnDelete", function() {
    let eventID = $(this).data('id'); // Get event ID from button data attribute
    let event = findEventByID(eventID);
    console.log(event);
   // Show confirmation modal before deleting all events
    $('#confirmationModal').fadeIn(); // Show confirmation modal
    $("#message2").text("Are you sure you want to delete this event?"); // Set confirmation message
    // If the user confirms, delete all events
    $("#btnConfirmDelete")
    .off("click")
    .on("click", async function() {
        await deleteSavedEvent(event.firestoreId);
        $('#confirmationModal').fadeOut();
        await fetchFavourites();
        showSavedEvents();
    });
    // If the user cancels, hide the confirmation modal
    $("#btnCancelDelete").on("click", function() {
        $('#confirmationModal').fadeOut(); // Hide confirmation modal
    });
});

// console.log(fetchFavourites());


    
