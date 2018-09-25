try {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
}
catch(e) {
  console.error(e);
  $('.no-browser-support').show();
  $('.app').hide();
}

var jabMicInput = $('#jabMicInput');
var jabStatusMemo = $('#jabStatusMemo');
var previous_search_page = $('.Previous-Searches');
var notesList = $('ul#notes');

var noteContent = '';
var jabit_flag = '';


// Get all history from previous sessions and display them, but it's hidden by default.
var notes = getAllNotes();
renderNotes(notes);

/*-----------------------------
      Voice Recognition 
------------------------------*/
// If false, stop after a few seconds of silence.
// When true, stop after about 15 seconds.
recognition.continuous = false;

//RESULT
recognition.onresult = function(event) {
  //console.log(event);
  var current = event.resultIndex;
  // Get a transcript of what was said.
  var voice_command = event.results[current][0].transcript;
  var check_error = (current == 1 && voice_command == event.results[0][0].transcript);

  if(!check_error) {
    //ONCE RESULT RECIEVED FROM API, 
    //1. HIDE PREVIOUS HISTORY SCREEN
    previous_search_page.hide();
    //2. EMPTY PREVIOUS RESULTS
    $('#response_display').empty();
    
    noteContent = voice_command;// noteContent += voice_command;
    //ADD VOICE COMMAND TO INPUT BOX
    jabMicInput.val(noteContent);
    //STOP RECOGNITION 
    recognition.stop();

    if(noteContent != ""){
      //SAVE NEW HISTORY INTO LOCAL STORAGE
      saveNote(new Date().toLocaleString(), noteContent);
      //UPDATE PREVIOUS HISTORY SCREEN, BUT IT'S HIDDEN UNTIL USER CLICK THE INPUT BOX
      renderNotes(getAllNotes());
      
      var token = noteContent.split(" ");
      console.log(token);

      //jabit what's the weather today? -> iplocation to get city,state, country -> weather api
      //jabit find ...... in amazon -> amazon
      //jabit ........ - > gogole -> bing

      //AMAZON API
      if(token[token.length-1] == "amazon"){
        console.log("search from amazon api");
        jabit_flag = "amazon";
      }

      //WEATHER API
      else if(token.indexOf("weather")!= -1){
        console.log("search from weather api");
        jabit_flag = "weather";
        var default_location = "300 aritum dr, somerset, NJ";
        var location = '';

        var searchQuery = getSearchQuery(token);

        var find_index_weather = $.inArray("weather",token);
        for(var i = find_index_weather + 1 ; i < token.length; i++){
          if(token[i] != "in"){
            location += token[i];
            if(i != token.length+1){
              location += ' ';
            }
          }
        }
        location = location.trim();
        if(location !="today" && location!="tomorrow" && location!="current" && location!=""){
        }else{
          location = default_location;
        }
        
        //SPECIFIC LOCATION
        $.get("http://www.mapquestapi.com/geocoding/v1/address?key=jgr5TBavIY3iQTC45biQIWUv126VTAGH&location="+encodeURIComponent(location), function (response){
          console.log(location);
          console.log("lat: " + response.results[0].locations[0].latLng.lat); 
          console.log("lng: " + response.results[0].locations[0].latLng.lng); 
        });
      }

      //GOOGLE API WITH BING SEARCH ENGINE
      else{
        console.log("search from GOOGLE & BING api...");
        jabit_flag = "google";

        var searchQuery = getSearchQuery(token);
        console.log(searchQuery);

        $.get("https://www.googleapis.com/customsearch/v1?key=AIzaSyBYcRkQhyfSGWEoFH_huxkXJpdgjZNKHQc&cx=014686825535238989090:jwmwr2rnvos&q=" + searchQuery, function(response){
          // console.log(response);
          // console.log(response.items.length);  
          for(var i=0; i < response.items.length; i++){
            var item_block = $('<div class="card py-3">');
            //CREATE TITLE
            var title = $('<div class="title ">');
            title.html(response.items[i].htmlTitle);
            //CREATE CONTENT
            var content = $('<div class="content text-dark">');
            content.html(response.items[i].htmlSnippet);

            //CREATE LINK
            var link = $('<a class="link">');
            //ADD URL IN <A> TAG
            link.attr('href', response.items[i].link).attr('target','_blank');
            link.html(title);

            item_block.append(link, content);
            //APPEND EVERTHING IN DISPLAY
            $('#response_display').append(item_block);
          }
        })
      }
      readOutLoud("OK Jabit is searching for "+ searchQuery);
    }
  }
};

recognition.onstart = function() { 
  jabStatusMemo.text('Voice recognition activated. Try speaking into the microphone.').show().fadeOut(5000);
  readOutLoud('OK, I\'m ready.');
}

recognition.onspeechend = function() {
  jabStatusMemo.text('You were quiet for a while so voice recognition turned itself off.').show().fadeOut(5000);
}

recognition.onerror = function(event) {
  if(event.error == 'no-speech') {
    jabStatusMemo.text('No speech was detected. Try again.').show().fadeOut(5000);
    readOutLoud('No speech was detected. Try again.');
  };
}



//CLICK BUTTONS AND ACTION
$('#start-record-btn').on('click', function(e) {
  var sound = document.getElementById("jab_start");
  sound.play();

  if (noteContent.length) { noteContent += ' ';}
  recognition.start();
});
$('#close-history-btn').on('click', function(e) {
  previous_search_page.hide();
})
$('#delete-all-btn').on('click', function(e) {
  recognition.stop();
  deleteAllNotes();
});
jabMicInput.on('click',function(){
  previous_search_page.show();
});
notesList.on('click', function(e) {
  e.preventDefault();
  var target = $(e.target).parent();
  // Listen to the selected note.
  if(target.hasClass('search-history')) {
    var content = target.closest('.note').find('.content').text();
    readOutLoud(content);
  }
  // Delete note.
  if(target.hasClass('delete-history')) {
    var dateTime = target.siblings('.date').text();  
    deleteNote(dateTime);
    target.closest('.note').remove();
  }
});

// Sync the text inside the text area with the noteContent variable.
jabMicInput.on('input', function() {noteContent = $(this).val();})

//TRIM VOICE COMMAND AS CONCISE SEARCH QUERY
function getSearchQuery(token){
  var searchQuery='';
  var remove_words = ['find', 'me', 'search', 'look', 'for', 'amazon', 'on','in'];
  for(var i = 0; i < token.length; i++){
    for(var j = 0; j < remove_words.length; j++){
      if(token[i] == remove_words[j]){

      }else{
        searchQuery += token[i];
        if(i != token.length+1){
          searchQuery += ' ';
        }
        break;
      }
    }
  }
  searchQuery = $.trim(searchQuery);
  return searchQuery;
}
//SPEAK OUT
function readOutLoud(message) {
  /*
  var speech = new SpeechSynthesisUtterance();
  // Set the text and voice attributes.
  speech.text = message;
  speech.volume = 1;
  speech.rate = 1;
  speech.pitch = 1;
  window.speechSynthesis.speak(speech);*/
  console.log(message);
}

//DISPLAY ALL HISTORIES
function renderNotes(notes) {
  var html = '';
  if(notes.length) {
    notes.forEach(function(note) {
      html+= `<li class="note">
        <p class="header">
          <a href="#" class="search-history" title="Search again"><i class="fas fa-search"></i></a>
          <a href="#" class="delete-history" title="Delete"><i class="far fa-trash-alt"></i></a>
          <span class="content">${note.content}</span>
          <span class="date" style="display:none;">${note.date}</span>
        </p>
      </li>`;    
    });
  }
  else {
    html = '<li><p class="content" style="font-size:1rem;">You don\'t have any search history yet.</p></li>';
  }
  notesList.html(html);
}
//SAVE NOTE
function saveNote(dateTime, content) {localStorage.setItem('history-' + dateTime, content);}
//GET NOTES FROM LOCAL STORAGE
function getAllNotes() {
  var notes = [],key;
  for (var i = 0; i < localStorage.length; i++) {
    key = localStorage.key(i);
    if(key.substring(0,8) == 'history-') {
      notes.push({
        date: key.replace('history-',''),
        content: localStorage.getItem(localStorage.key(i))
      });
    } 
  }
  return notes;
}
//DELETE ONE NOTE
function deleteNote(dateTime) {localStorage.removeItem('history-' + dateTime);}
//DELETE ALL
function deleteAllNotes(){
  var notes = []; // Array to hold the keys
  // Iterate over localStorage and insert the keys that meet the condition into arr
  for (var i = 0; i < localStorage.length; i++){
      if (localStorage.key(i).substring(0,8) == 'history-') {
        notes.push(localStorage.key(i));
      }
  }
  // Iterate over arr and remove the items by key
  for (var i = 0; i < notes.length; i++) {
      localStorage.removeItem(notes[i]);
  }
  notesList.empty();
  notesList.html('<li><p class="content" style="font-size:1rem;">You don\'t have any search history yet.</p></li>');
}
