var redis    = require('redis'),
    client   = redis.createClient(),
    jazShort = new require(__dirname + '/src/jaz_short')({
      redisClient: client,
      uniqueUrls: true,
      checkUrl: true
    });

var    urlRegex = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/i;

var testUrls = [
  'http://www.test.de',
  'http://test.com',
  'http://test.com/',
  'http://test.com?foo=42',
  'http://test.com/bar?foo=42',
  'ftp://test.com/bar.png',
  'test.de',
  'test'
];

testUrls.forEach(function(url) {
  console.log(url, urlRegex.test(url));
});

jazShort.shorten('http://test.com/bar?foo=42', function(err, shortUrl) {
  console.log("shortUrl", shortUrl, arguments); // 4 char key
  jazShort.expand(shortUrl, function(err, longUrl) {
    console.log("longUrl", longUrl, arguments); // returns the same
    jazShort.stats(shortUrl, function(err, stats) {
      console.log("stats", stats, arguments); // still 0
      jazShort.visit(shortUrl, function(err) {
        console.log("visit", arguments); // increases visits count
        jazShort.stats(shortUrl, function(err, stats) {
          console.log("stats", stats, arguments); // now 1
        });
      });
    });
  });
  jazShort.shorten('http://test.com/bar?foo=42', function(err, shortUrl) {
    // the same 4 char key if uniqueUrls is used, a different otherwise
    console.log("againshortUrl", shortUrl, arguments);
  });
});

jazShort.shorten('http://test', function(err, shortUrl) {
  // that should not work
  console.log("FAIL:", err, arguments);
});
