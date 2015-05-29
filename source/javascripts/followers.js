function getWordsBetweenAnglebrackets(str) {
  var results = [], re = /<([^>]+)>/g, text;
  while(text = re.exec(str)) {
    results.push(text[1]);
  }
  return results;
}

function renderUsers (parent, users, graph) {
  var parentNode = graph.newNode({label: parent});

  for (var i = 0; i < 30; i++) {
    var node = graph.newNode({label: users[i].login});
    graph.newEdge(node, parentNode, {color: '#EB6841'});
  };
  return graph;
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
  var graph = new Springy.Graph();
  $('#followers_graph').width($('#followers_graph').parent().width()*0.8);
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
      graph = renderUsers('wendycan', users, graph);
      var springy = $('#followers_graph').springy({
        graph: graph,
        // nodeSelected: function(node){
        //   console.log('Node selected: ' + JSON.stringify(node.data));
        // }
      });
   });
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
