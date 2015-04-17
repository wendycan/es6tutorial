// http://kangax.github.io/compat-table/es6/#ie11tp
let trs = $('#table-wrapper tbody tr');
let data = [];

trs.each(function(index, tr){
  tr = $(tr);
  if(tr.hasClass('category')){
    data.push({category: tr.text(), data: []})
  } else {
    window.lasttr = tr;
    if(tr.find('td span')[0].childNodes){
      data[data.length-1].data.push($(Array.from(tr.find('td span')[0].childNodes)[1]).text());
    }
  }
});
window.data = data;
console.log(data);
