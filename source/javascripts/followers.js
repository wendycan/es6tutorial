function getWordsBetweenAnglebrackets(str) {
  var results = [], re = /<([^>]+)>/g, text;
  while(text = re.exec(str)) {
    results.push(text[1]);
  }
  return results;
}

function renderUsers (el, users) {
  for (var i = 0; i < users.length; i++) {
    var html = [
    "<tr class=" + users[i].login + ">",
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
    el.append(html.join(''));
  };
}

function fetchUsers (el, users) {
  var p_users = [];
  for (var i = 0; i < users.length; i++) {
    var url = "https://api.github.com/users/" + users[i].login;
    p_users.push(load_res(url));
  };
  var p = Promise.all(p_users).then(function (data) {
    for (var i = 0; i < data.length; i++) {
      renderUserMeta(el, data[i].body);
    };
  });
}

function renderUserMeta (el, user) {
  var user_ele = el.find('.' + user.login);
  var date = new Date(user.created_at);
  user_ele.find('.followers').text(user.followers);
  user_ele.find('.following').text(user.following);
  user_ele.find('.repos').text(user.public_repos);
  user_ele.find('.gists').text(user.public_gists);
  if(user.company) user_ele.find('.company').text(user.company);
  if(user.location) user_ele.find('.location').text(user.location);
  user_ele.find('.created_at').text(date.getFullYear() + '年' + (date.getMonth() + 1) + '月');
  if(user.followers > 200) {
    user_ele.addClass('highlight');
    user_ele.find('.followers').addClass('emph')
  }
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
  var p3 = load_res('http://api.github.com/users/wendycan/following');

  p1.then(function (data) {
    var users = [];
    var links = data.xhr.getResponseHeader('Link');
    if(links){
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
        renderUsers($('.followers-table tbody'), users);
        fetchUsers($('.followers-table tbody'), users);
      });
    } else {
      cusers = data.body;
      renderUsers($('.followings-table tbody'), users);
      fetchUsers($('.followings-table tbody'), users);
    }
  });
  p2.then(function (data) {
    data = data.body;
    var date = new Date(data.created_at);
    var html = [
      "<div class='data-equalizer'>",
      "  <div class='columns large-2'>",
      "    <img src=" + data.avatar_url + "></img>",
      "  </div>",
      "  <div class='columns large-10 panel'>",
      "    <p>被<span class='emph'>" + data.followers + "</span>人关注</p>",
      "    <p>关注了<span class='emph'>" + data.following + "</span>人</p>",
      "    <p>拥用<span class='emph'>" + data.public_repos + "</span>个公有项目</p>",
      "    <p>拥有<span class='emph'>" + data.public_gists + "</span>个公有 Gist</p>",
      "    <p>现就职于<span class='emph'>" + data.company + "</span></p>",
      "    <p>现居于<span class='emph'>" + data.location + "</span></p>",
      "    <p>于<span class='emph'>" + date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + "</span>加入 Github</p>",
      "  </div>",
      "</div>"
    ];
    $('.meta').html(html.join(''));
  })
  p3.then(function (data) {
    var users = [];
    var links = data.xhr.getResponseHeader('Link');
    if(links){
      var urlPrefix = getWordsBetweenAnglebrackets(links)[0].split('page=')[0] + 'page=';
      var length = getWordsBetweenAnglebrackets(links)[1].split('page=')[1];      
      var p_pages = [];
      for (var i = 1; i <= length; i++) {
        var url = urlPrefix + i;
        p_pages.push(load_res(url));
      };
      var p = Promise.all(p_pages).then(function (data) {
        for (var i = 0; i < data.length; i++) {
          for (var j = 0; j < data[i].body.length; j++) {
            users.push(data[i].body[j]);
          };
        };
        renderUsers($('.followings-table tbody'), users);
        fetchUsers($('.followings-table tbody'), users);
      });
    } else {
      users = data.body;
      renderUsers($('.followings-table tbody'), users);
      fetchUsers($('.followings-table tbody'), users);
    }
  });
});
