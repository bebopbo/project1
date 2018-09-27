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
var locationLat = '';
var locationLng = '';
var noteContent = '';



// Get all history from previous sessions and display them, but it's hidden by default.
var notes = getAllNotes();
renderHistory(notes);

/*-----------------------------
*Voice Recognition 
------------------------------*/

recognition.continuous = false;

//RESULT
recognition.onresult = function(event) {
  //console.log(event);
  var current = event.resultIndex;
  // Get a transcript of what was said.
  var voice_command = event.results[current][0].transcript;
  var check_error = (current == 1 && voice_command == event.results[0][0].transcript);

  if(!check_error) {
    noteContent = voice_command;// noteContent += voice_command;
    //ADD VOICE COMMAND TO INPUT BOX
    jabMicInput.val(noteContent);
    //STOP RECOGNITION 
    recognition.stop();

    if(noteContent != ""){
      renderResult(noteContent, "voice");
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
jabMicInput.on('keyup', function(e){
  var code = e.which;
  if(code == 13){
    e.preventDefault();
    var content = $.trim(jabMicInput.val());
    if(content === ""){
      jabStatusMemo.text('Please enter to search or click the microphone button.').show().fadeOut(5000);
      jabMicInput.focus();
      return false;
    }else{
      renderResult(content, "type");
    }
  }
});
jabMicInput.on('click', function(){
  previous_search_page.show();
});
notesList.on('click', function(e) {
  e.preventDefault();
  var target = $(e.target);
  if(target.hasClass('content')) {
    var content = target.text();
    //ADD/REPLACE INPUT BOX WITH NEW CONTENT
    jabMicInput.val(content);
    renderResult(content, "search-history");
  }else{
    target=target.parent();
    // re-search to the selected history.
    if(target.hasClass('search-history')) {
      var content = target.closest('.note').find('.content').text();
      //ADD/REPLACE INPUT BOX WITH NEW CONTENT
      jabMicInput.val(content);
      renderResult(content, "search-history");
    }
    // Delete history.
    if(target.hasClass('delete-history')) {
      var dateTime = target.siblings('.date').text();  
      deleteNote(dateTime);
      target.closest('.note').remove();
    }
  }
  
});

// Sync the text inside the text area with the noteContent variable.
jabMicInput.on('input', function() {noteContent = $(this).val();})


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
//TRIM VOICE COMMAND AS CONCISE SEARCH QUERY
function getSearchQuery(token){
  var searchQuery = '';
  var remove_words = ['jabit', 'jabet', 'find', 'me', 'search', 'look', 'for', 'amazon', 'on', 'in'];

  for(var i = 0; i < remove_words.length; i++){
    var index = token.indexOf(remove_words[i]);
    if(index > -1){
      token.splice(index, 1);
    }
  }
  for(var i = 0; i < token.length; i++){
    searchQuery += token[i];
    if(i != token.length + 1){searchQuery += ' ';}
  }
  searchQuery = $.trim(searchQuery);
  return searchQuery;
}
function sign(key, msg){
  return CryptoJS.HmacSHA256(key, encodeURIComponent(msg));
}
function getSignatureKey(key, dateStamp, regionName, serviceName){
  var kDate = sign(encodeURIComponent('AWS4'+ key), dateStamp);
  var kRegion = sign(kDate, regionName);
  var kService = sign(kRegion, serviceName);
  var kSigning = sign(kService, 'aws4_request');
  return kSigning;
}
function URLToArray(url) {
  var request = [];
  var pairs = url.substring(url.indexOf('?') + 1).split('&');
  for (var i = 0; i < pairs.length; i++) {
      if(!pairs[i])
          continue;
      var pair = pairs[i].split('=');
      request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
   }
   return request;
}
function ArrayToURL(array) {
  var pairs = [];
  for (var key in array)
    if (array.hasOwnProperty(key))

      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(array[key]));
  return pairs.join('&');
}
/***********************
 * DISPLAY
 ***********************/
//DISPLAY RESULT
function renderResult(noteContent, mode){
  //ONCE RESULT RECIEVED FROM API, 
  //1. HIDE PREVIOUS HISTORY SCREEN
  previous_search_page.hide();
  //2. EMPTY PREVIOUS RESULTS
  $('#response_display').empty();
  
  var jabit_flag = '';
  if(mode === "voice" || mode === "type"){
  //SAVE NEW HISTORY INTO LOCAL STORAGE
  saveHistory(new Date().toLocaleString(), noteContent);
  //UPDATE PREVIOUS HISTORY SCREEN, BUT IT'S HIDDEN UNTIL USER CLICK THE INPUT BOX
  renderHistory(getAllNotes());
  }else if(mode === "search-history"){

  }
  var token = noteContent.split(" ");
  console.log("============================================");
  console.log("1. Split a string of voice command ("+ noteContent +") and save into array");
  console.log(token);

  //jabit what's the weather today? -> iplocation to get city,state, country -> weather api
  //jabit find ...... in amazon -> amazon
  //jabit ........ - > gogole -> bing

  //AMAZON API
  if(token[token.length-1] == "amazon"){
    console.log("Search from amazon api");
    jabit_flag = "amazon";



    
    // console.log("http://webservices.amazon.com/onca/xml?Service=AWSECommerceService&Operation=ItemSearch&AWSAccessKeyId=AKIAI577EEL57ZKAQTGQ&SubscriptionId=ExampleID&SearchIndex=Books&Keywords="+encodeURIComponent("Harry Potter")+"&ResponseGroup="+encodeURIComponent("Images,ItemAttributes,Offers"));
     var method = 'GET';
     var service = 'ec2';
     var host = 'ec2.amazonaws.com';
     var region = 'us-east-1';
     var endpoint = 'https://ec2.amazonaws.com';
     var request_parameters = 'Action=DescribeRegions&Version=2005-10-05';
     var access_key = 'AKIAI577EEL57ZKAQTGQ';
    var secret_key = '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';
    
    
     var dt = new Date();
     var amzdate = dt.toISOString();
    var datestamp = dt.getFullYear()+''+(dt.getMonth()+1)+''+dt.getDate();
    
    
    var canonical_uri = '/';
    var canonical_querystring = request_parameters;
    var canonical_headers = 'host:' + host + '\n' + 'x-amz-date:' + amzdate + '\n';
    var signed_headers = host+';x-amz-date';
    
    var canonical_request = method + '\n' + canonical_uri + '\n' + canonical_querystring + '\n' + canonical_headers + '\n' + signed_headers;//+ '\n' + payload_hash
    
     var algorithm = 'AWS4-HMAC-SHA256'
     var credential_scope = datestamp + '/' + region + '/' + service + '/' + 'aws4_request';
     var string_to_sign = algorithm + '\n' +  amzdate + '\n' +  credential_scope + '\n' +  CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(encodeURIComponent(canonical_request)));
    
     var signing_key = getSignatureKey(secret_key, datestamp, region, service);
    // //Python
    //var signature = hmac.new(signing_key, (string_to_sign).encode('utf-8'), hashlib.sha256).hexdigest()
     var signature = CryptoJS.enc.Base64.stringify(sign(signing_key, string_to_sign));
     var authorization_header = algorithm + ' ' + 'Credential=' + access_key + '/' + credential_scope + ', ' +  'SignedHeaders=' + signed_headers + ', ' + 'Signature=' + signature
    
     var headers = {'x-amz-date':amzdate, 'Authorization':authorization_header}
    
     var request_url = endpoint + '?' + canonical_querystring;
    // console.log(request_url);
    
    // var hash = CryptoJS.HmacSHA256("Message", "secret");
    //   var hashInBase64 = CryptoJS.enc.Base64.stringify(hash);
    
    // console.log(HMAC(HMAC(HMAC(HMAC("AWS4" + kSecret,"20150830"),"us-east-1"),"iam"),"aws4_request"));
    var dt = new Date();
    var amazonUrl = "https://webservices.amazon.com/onca/xml?";
    amazonUrl += "AWSAccessKeyId=AKIAI577EEL57ZKAQTGQ";
    amazonUrl += "&Actor=Johnny%20Depp";
    amazonUrl += "&Operation=ItemSearch";
    amazonUrl += "&ResponseGroup="+encodeURIComponent("ItemAttributes,Offers,Images,Reviews,Variations");
    amazonUrl += "&SearchIndex=DVD";
    amazonUrl += "&Service=AWSECommerceService";
    amazonUrl += "&Sort=salesrank";
    amazonUrl += "&Timestamp="+encodeURIComponent(dt.toISOString());
    //http://webservices.amazon.co.uk/onca/xml?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Actor=Johnny%20Depp&AssociateTag=mytag-20&Operation=ItemSearch&Operation=ItemSearch&ResponseGroup=ItemAttributes%2COffers%2CImages%2CReviews%2CVariations&SearchIndex=DVD&Service=AWSECommerceService&Sort=salesrank&Timestamp=2014-08-18T17%3A34%3A34.000Z&Version=2013-08-01&Signature=Gv4kWyAAD3xgSGI86I4qZ1zIjAhZYs2H7CRTpeHLD1o%3D
    // amazonUrl += "AWSAccessKeyId=AKIAI577EEL57ZKAQTGQ";
    // amazonUrl += "&ItemId=0679722769";
    // amazonUrl += "&Operation=ItemLookup";
    // amazonUrl += "&ResponseGroup=Images%2CItemAttributes%2COffers%2CReviews";
    // amazonUrl += "&Service=AWSECommerceService";
    // amazonUrl += "&Timestamp="+encodeURIComponent(dt.toISOString());
    // amazonUrl += "&Version="+encodeURIComponent("2013-08-01");
    
    var parameter_array = URLToArray(amazonUrl);
    parameter_array = ArrayToURL(parameter_array);
    console.log(parameter_array);
    var canonical_request = method + '\n' + 'webservices.amazon.com' + '\n' + '/onca/xml' + '\n' + parameter_array;
    
    var signature =encodeURIComponent(sign(canonical_request,"sMuCDls8bi16HUc17hCZg20VSbCxxmkWsURGlhNO").toString(CryptoJS.enc.Base64));
    console.log(signature);
    amazonUrl += "&Signature="+signature;
    console.log(amazonUrl);
    var authorization_header = algorithm + ' ' + 'Credential=' + access_key + '/' + credential_scope + ', ' +  'SignedHeaders=' + signed_headers + ', ' + 'Signature=' + signature
    // $.get(amazonUrl,function(res){
    //   console.log(res);
    // })
    $.ajax({
    
      url: amazonUrl,
      type: 'GET',
      crossDomain:true,
      datatype: 'jsonp',
      success: function() { console.log("Success"); },
      error: function() { console.log('Failed!'); },
      beforeSend: setHeader
    
    });
    function setHeader(xhr) {
    
      xhr.setRequestHeader('Authorization', authorization_header);
    }
    
    

  }

  //WEATHER API
  else if(token.indexOf("weather")!= -1){
    console.log("--> USE WEATHER API");
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
    console.log("2. AFTER TRIM as SEARCH QUERY: (" + location + ")");
    console.log("3. CALL MAPQUEST API to get LAT, LNG");
    //SPECIFIC LOCATION
    var mapquestapi_url = "https://www.mapquestapi.com/geocoding/v1/address?";
    mapquestapi_url += "key=jgr5TBavIY3iQTC45biQIWUv126VTAGH&";
    mapquestapi_url += "location="+encodeURIComponent(location);
    $.get(mapquestapi_url, function (response){
      console.log("LAT: " + response.results[0].locations[0].latLng.lat); 
      console.log("LNG: " + response.results[0].locations[0].latLng.lng); 
      locationLat = response.results[0].locations[0].latLng.lat;
      locationLng = response.results[0].locations[0].latLng.lng;
      console.log("4. CALL DARK SKY API");
      var darksky_url = "https://cors-anywhere.herokuapp.com/https://api.darksky.net/forecast/23581296777986e722945e1545c7a64f/";
      darksky_url += locationLat + "," +locationLng;
      $.ajax({
        url: darksky_url,
        type: 'GET',
        crossDomain:true,
        datatype: 'jsonp',
        success: function(data) { 
          console.log("5. RECIEVED RESPONSE AND PRINT WEATHER WIDGET");
          console.log(data); 
          $('#response_display').html('<iframe id="forecast_embed" frameborder="0" height="245" width="100%" src="//forecast.io/embed/#lat=' + data.latitude + '&lon=' + data.longitude + '&name=' + location + '(' + data.timezone + ')"></iframe>');
        },
        error: function() { console.log('Failed!'); },
        
      });
    });
  }

  //GOOGLE API WITH BING SEARCH ENGINE
  else{
    console.log("--> USE GOOGLE & BING API");
    jabit_flag = "google";

    var searchQuery = getSearchQuery(token);
    console.log("2. AFTER TRIM as SEARCH QUERY: (" + searchQuery + ")");

    var googleapis_url = "https://www.googleapis.com/customsearch/v1?";
    googleapis_url += "key=AIzaSyBYcRkQhyfSGWEoFH_huxkXJpdgjZNKHQc&";
    googleapis_url += "cx=014686825535238989090:jwmwr2rnvos&";
    googleapis_url += "q=" + searchQuery;
    $.get(googleapis_url, function(response){
      console.log("3. RECIEVED RESPONSE AND PRINT OUT");
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
  //readOutLoud("OK Jabit is searching for "+ searchQuery);
}
//DISPLAY ALL HISTORIES
function renderHistory(notes) {
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

/************************
 * LOCAL STORAGE
 **********************/
//SAVE NOTE
function saveHistory(dateTime, content) {localStorage.setItem('history-' + dateTime, content);}
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
