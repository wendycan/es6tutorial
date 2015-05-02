$(document).ready(function() {
  $.get('/public/data.json').done(function (data) {
    data.forEach(function(t, index){
      var html = _.template($('#t-table').html())({category: t.category.replace(' ', '-').replace('\n',''),table_index: index});
      $('#container').append(html);
      t.data.forEach(function(item, i){
        var tr = _.template($('#t-tr').html())({text: item,index: i + 1});
        $('#table-' + index).find('tbody').append(tr);
      });
    })
  })

  $('.scroll-nav td').on('click', function(e){
    e.preventDefault();
    var target = $( $(this).find('a').attr('href') );
    $('.scroll-nav td').removeClass('active');
    $(this).addClass('active');
    $('html, body').animate({
      scrollTop: target.offset().top - 50
    }, 1000);
  });
});
