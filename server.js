var cheerio = require('cheerio'); //Server-side jQuery
var request = require('request'); //Simple HTTP requests
var URL = require('url-parse');

var boardToCrawl = 'MacShop';
var pageToCrawl = 'https://www.ptt.cc/bbs/Tech_Job/index.html';
var page = 'https://www.ptt.cc/bbs/' + boardToCrawl + '/index.html';

var START_URL = page;
var SEARCH_WORD = 'iphone';
var MAX_PAGES_TO_VISIT = 15;

var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];
var url = new URL(START_URL);
var baseUrl = url.protocol + "//" + url.hostname;
var id = 0;
var datas = [];

var path = require('path');
var express = require('express');
var http = require('http');
var webpack = require('webpack');
var config = require('./webpack.config');

var app = express();
var compiler = webpack(config);
var io = require('socket.io')
      .listen(app.listen(3000, function(){
        console.log('HTTP on http://localhost:3000/');
      }));

app.use(require('webpack-dev-middleware')(compiler, {
  publicPath: config.output.publicPath,
  stats: {
    colors: true
  }
}));

app.use(require('webpack-hot-middleware')(compiler));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// sockets
io.sockets.on('connection', function (socket) {
  pagesToVisit.push(START_URL);
  console.log("socket!");
  crawl();
}); 



function crawl() {
  if(numPagesVisited >= MAX_PAGES_TO_VISIT) {
    console.log("Reached max limit of number of pages to visit.");
    io.sockets.emit('items', datas);
    return;
  }
  var nextPage = pagesToVisit.pop();
  if (nextPage in pagesVisited) {
    // We've already visited this page, so repeat the crawl
    crawl();
  } else {
    // New page we haven't visited
    visitPage(nextPage, crawl);
  }
}

function visitPage(url, callback) {
  // Add page to our set
  pagesVisited[url] = true;
  numPagesVisited++;

  // Make the request
  //
  //console.log("Visiting page " + url);
  request(url, function(error, response, body) {
     // Check status code (200 is HTTP OK)
     // console.log("Status code: " + response.statusCode);
     console.log("crawling: ", url);
     if(response.statusCode !== 200) {
       callback();
       return;
     }
     // Parse the document body
     var $ = cheerio.load(body);
     var item = $("body").html();

     $('a').each(function(i, elem){
  		if($(this).text().toLowerCase().indexOf('iphone') !== -1){
        var title = $(this).text();
        var url = baseUrl + $(this).attr('href');
        datas.push({id: id,title: title, url: url});
        ++id;
  		}     	
     });

     var isWordFound = searchForWord($, SEARCH_WORD);
     if(isWordFound) {
       //console.log('Word ' + SEARCH_WORD + ' found at page ' + url);
       collectInternalLinks($);
       // In this short program, our callback is just calling crawl()
       callback();
     } else {
       collectInternalLinks($);
       // In this short program, our callback is just calling crawl()
       callback();
     }
  });
}

function searchForWord($, word) {
  var bodyText = $('html > body').text().toLowerCase();
  return(bodyText.indexOf(word.toLowerCase()) !== -1);
}

function collectInternalLinks($) {
    var relativeLinks = $("a[href^='/']");
    //console.log("Found " + relativeLinks.length + " relative links on page");
    relativeLinks.each(function() {
    	var link = $(this).attr('href');
    	if(link.toLowerCase().indexOf('bbs\/macshop\/index') !== -1 &&
    		link.toLowerCase().indexOf('index1\.html') == -1
    		){
    		pagesToVisit.push(baseUrl + $(this).attr('href'));
    	}
    });
}
