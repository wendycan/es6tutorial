function getWordsBetweenAnglebrackets(str) {
  var results = [], re = /<([^>]+)>/g, text;
  while(text = re.exec(str)) {
    results.push(text[1]);
  }
  return results;
}

function renderUsers (users) {
  for (var i = 0; i < users.length; i++) {
    var html = [
    "<tr id=" + users[i].login + ">",
    " <td><img src=" + users[i].avatar_url + "></img></td>",
    " <td><a href=" + users[i].html_url + " target='_blank'>"+ users[i].login + "</a></td>",
    " <td class='followers'>" + "--" + "</td>",
    " <td class='following'>" + "--" + "</td>",
    " <td class='repos'>" + "--" + "</td>",
    " <td class='gists'>" + "--" + "</td>",
    " <td class='company'>" + "--" + "</td>",
    " <td class='location'>" + "--" + "</td>",
    " <td class='created_at'>" + "--" + "</td>",
    "</tr>"
    ];
    $('tbody').append(html.join(''));
  };
}

function fetchUsers (users) {
  for (var i = 0; i < users.length; i++) {
    var url = "https://api.github.com/users/" + users[i].login;
    var p = load_res(url);
    p.then(function (data) {
      renderUserMeta(data.body);
    })
  };
}

function renderUserMeta (user) {
  var user_ele = $('#' + user.login);
  var date = new Date(user.created_at);
  user_ele.find('.followers').text(user.followers);
  user_ele.find('.following').text(user.following);
  user_ele.find('.repos').text(user.public_repos);
  user_ele.find('.gists').text(user.public_gists);
  if(user.company) user_ele.find('.company').text(user.company);
  if(user.location) user_ele.find('.location').text(user.location);
  user_ele.find('.created_at').text(date.getFullYear() + '年' + date.getMonth() + '月');
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
  var p2 = load_res('http://api.github.com/users/wendycan');
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
      fetchUsers(users);
    });
  });
  p2.then(function (data) {
    data = data.body;
    var date = new Date(data.created_at);
    var html = [
      "<div class='row'>",
      "  <div class='columns large-2'>",
      "    <img src=" + data.avatar_url + "></img>",
      "  </div>",
      "  <div class='columns large-10'>",
      "    <p>被关注" + data.followers + "</p>",
      "    <p>关注中" + data.following + "</p>",
      "    <p>公开项目" + data.public_repos + "</p>",
      "    <p>公开 Gist" + data.public_gists + "</p>",
      "    <p>公司" + data.company + "</p>",
      "    <p>位置" + data.location + "</p>",
      "    <p>加入时间" + date.getFullYear() + '年' + date.getMonth() + '月' + "</p>",
      "  </div>",
      "</div>"
    ];
    $('.meta').html(html.join(''));
  })
});

// var p1 = load_res('http://api.github.com/users/wendycan')
    // var p2 = load_res('http://api.github.com/users/yandy')
    // var p_users = [p1, p2];
    // var p = Promise.all(p_users).then(function (data) {
    //   console.log(data);
    // }, function (reason) {
    //   console.log(reason)
    // });
