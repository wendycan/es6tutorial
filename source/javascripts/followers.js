function getWordsBetweenAnglebrackets(str) {
  var results = [], re = /<([^>]+)>/g, text;
  while(text = re.exec(str)) {
    results.push(text[1]);
  }
  return results;
}

function renderUsers (users) {
  for (var i = 0; i < users.length; i++) {
   //console.log(users[i]);
  };
}

function load_res (url) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      url: url,
      type: 'GET',
      data: {
        client_id: '6a853226916e0c9e3295',
        client_secret: 'd677255b6d9b8d79d5bd52902bbcfaeae0b0ecd9'
      },
      success: function(data, status, xhr){
        var result = {
          body: data,
          xhr: xhr
        }
        resolve(result);
      },
      error: function (e) {
        reject()
        console.log(e);
      }
    });
  })
}

$(document).ready(function () {
  var p1 = load_res('http://api.github.com/users/wendycan/followers');
  p1.then(function (data) {
    var users = [];
    var links = data.xhr.getResponseHeader('Link');
    var urlPrefix = getWordsBetweenAnglebrackets(links)[0].split('page=')[0] + 'page=';
    var length = getWordsBetweenAnglebrackets(links)[1].split('page=')[1];
    var p_pages = [];
    for(var i = 1;i <= length;i++){
      var url = urlPrefix + i;
      p_pages.push(load_res(url));
     }
     var p = Promise.all(p_pages).then(function (data) {
      for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].body.length; j++) {
          users.push(data[i].body[j]);
        };
      };
      renderUsers(users);
   });
 });
});

var graph = new Springy.Graph();

var dennis = graph.newNode({
  label: 'Dennis',
  ondoubleclick: function() { console.log("Hello!"); }
});

var michael = graph.newNode({label: 'Michael'});
var jessica = graph.newNode({label: 'Jessica'});
var timothy = graph.newNode({label: 'Timothy'});
var barbara = graph.newNode({label: 'Barbara'});
var franklin = graph.newNode({label: 'Franklin'});
var monty = graph.newNode({label: 'Monty'});
var james = graph.newNode({label: 'James'});
var bianca = graph.newNode({label: 'Bianca'});

graph.newEdge(dennis, michael, {color: '#00A0B0'});
graph.newEdge(michael, dennis, {color: '#6A4A3C'});
graph.newEdge(michael, jessica, {color: '#CC333F'});
graph.newEdge(jessica, barbara, {color: '#EB6841'});
graph.newEdge(michael, timothy, {color: '#EDC951'});
graph.newEdge(franklin, monty, {color: '#7DBE3C'});
graph.newEdge(dennis, monty, {color: '#000000'});
graph.newEdge(monty, james, {color: '#00A0B0'});
graph.newEdge(barbara, timothy, {color: '#6A4A3C'});
graph.newEdge(dennis, bianca, {color: '#CC333F'});
graph.newEdge(bianca, monty, {color: '#EB6841'});

jQuery(function(){
  var springy = window.springy = jQuery('#springydemo').springy({
    graph: graph,
    nodeSelected: function(node){
      console.log('Node selected: ' + JSON.stringify(node.data));
    }
  });
});
// var p1 = load_res('http://api.github.com/users/wendycan')
    // var p2 = load_res('http://api.github.com/users/yandy')
    // var p_users = [p1, p2];
    // var p = Promise.all(p_users).then(function (data) {
    //   console.log(data);
    // }, function (reason) {
    //   console.log(reason)
    // });
