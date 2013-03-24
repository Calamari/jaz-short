/*jslint node: true */
'use strict';

var RETRIES  = 10,
    chars    = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    numChars = chars.length,
    urlRegex = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/i;

function generateId(length) {
  var id = '';
  while (length--) {
    id += chars[Math.floor(Math.random()*numChars)];
  }
  return id;
}

function saveUrl(redis, keyLength, url, retries, cb) {
  var shortUrl = generateId(keyLength);
  redis.setnx('jaz-short.shorts.' + shortUrl, url, function(err, res) {
    if (err || res === 0) {
      saveUrl(redis, keyLength, url, --retries, cb);
    } else {
      redis.setnx('jaz-short.register.' + url, shortUrl);
      redis.setnx('jaz-short.visits.' + shortUrl, 0);
      cb(null, shortUrl);
    }
  });
}

module.exports = function JazShort(config) {
  var redis      = config.redisClient,
      keyLength  = config.minLength || 4,
      // if true, an url will not be there twice
      uniqueUrls = config.uniqueUrls || false,
      // shall an url check be performed?
      checkUrl   = config.checkUrl || false;

  function shortenUrl(url, checkUnique, cb) {
    saveUrl(redis, keyLength, url, RETRIES, function(err, shortUrl) {
      if (err) {
        ++keyLength;
        shorten(url, cb);
      } else {
        cb(null, shortUrl);
      }
    });
  }

  function shorten(url, cb) {
    if (!checkUrl || urlRegex.test(url)) {
      // If random returns 10 times in a row a taken key, increase keyLength
      if (uniqueUrls) {
        redis.get('jaz-short.register.' + url, function(err, item) {
          if (!item) {
            shortenUrl(url, false, cb);
          } else {
            cb(null, item);
          }
        });
      } else {
        shortenUrl(url, false, cb);
      }
    } else {
      cb(new Error('url is invalid'));
    }
  }

  function expand(shortUrl, cb) {
    redis.get('jaz-short.shorts.' + shortUrl, cb);
  }

  function visit(shortUrl, cb) {
    redis.incr('jaz-short.visits.' + shortUrl, cb);
  }

  function stats(shortUrl, cb) {
    redis.get('jaz-short.visits.' + shortUrl, cb);
  }

  return {
    shorten : shorten,
    expand  : expand,
    stats   : stats,
    visit   : visit
  };
};
