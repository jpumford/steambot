var Log = require('log');
var log = new Log('debug', require('fs').createWriteStream('bot.log', {flags: "a"}));
var colors = require('colors');
var username = 'a_crippled_kid';
var password = '';
var steamGuard = require('fs').readFileSync('sentryfile'); // code received by email

var Steam = require('steam');
var SteamTrade = require('steam-trade'); // change to 'steam-trade' if not running from the same directory

var steam = new Steam.SteamClient();
var steamTrade = new SteamTrade();

function success(text) {
	log.info(text);
	console.log(("[INFO]  " + text).green);
}

function debug(text) {
	log.debug(text);
	console.log(("[DEBUG] " + text).grey);
}

function info(text) {
	log.info(text);
	console.log(("[INFO]  " + text).white);
}

function error(text) {
	log.error(text);
	console.log(("[ERR]   " + text).red);
}

steam.logOn({
	accountName: username,
	password: password,
	shaSentryfile: steamGuard
});

steam.on('debug', function(message) {
	debug(message);
});

steamTrade.on('debug', function(message) {
	debug(message);
});

steam.on('loggedOn', function(result) {
	info('Logged in!');
	 steam.setPersonaState(Steam.EPersonaState.Online);
});

steam.on('webSessionID', function(sessionID) {
  debug('Got a new session ID: ' + sessionID);
  steamTrade.sessionID = sessionID;
  steam.webLogOn(function(cookies) {
    debug('Got a new cookie: ' + JSON.stringify(cookies));
    cookies.forEach(function(cookie) {
        steamTrade.setCookie(cookie);
    });
  });
});

var inventory;
var scrap;
var weapons;
var addedScrap;
var client;

steam.on('tradeProposed', function(tradeID, otherClient) {
  steam.respondToTrade(tradeID, true);
});

steam.on('sessionStart', function(otherClient) {
  inventory = [];
  scrap = [];
  weapons = 0;
  addedScrap = [];
  client = otherClient;
  
  info('Trading with ' + steam.users[client].playerName);
  steamTrade.open(otherClient);
});

/*
  if (item.tags && item.tags.some(function(tag) {
    return ~['primary', 'secondary', 'melee', 'pda2'].indexOf(tag.internal_name);
  }) && (item.descriptions === '' || !item.descriptions.some(function(desc) {
    return desc.value == '( Not Usable in Crafting )';
  }))) {
    // this is a craftable weapon
    weapons += added ? 1 : -1;
    if (addedScrap.length != Math.floor(weapons / 2)) {
      // need to change number of scrap
      if (added && scrap.length > addedScrap.length) {
        console.log('adding scrap');
        var newScrap = scrap[addedScrap.length];
        steamTrade.addItems([newScrap]);
        addedScrap.push(newScrap);
      } else if (!added && addedScrap.length > Math.floor(weapons / 2)) {
        console.log('removing scrap');
        var scrapToRemove = addedScrap.pop();
        steamTrade.removeItem(scrapToRemove);
      }
    }
  }*/

steamTrade.on('end', function(result) {success('trade', result);});

steamTrade.on('ready', function() {
  info('readying');
  steamTrade.ready(function() {
    info('confirming');
    steamTrade.confirm();
    success('Trade complete');
  });
});

steamTrade.on('chatMsg', function(msg) {
});

steam.on('relationships', function() {
	// add all friend requests
	var friendsToAdd = [];
	for (var i in steam.friends) {
		if (steam.friends[i] == Steam.EFriendRelationship.PendingInvitee) {
			friendsToAdd.push(i);
		}
	}
	friendsToAdd.forEach(function(steamID) {
		info("Adding friend with id " + steamID);
		steam.addFriend(steamID);
	});
});

steam.on('friend', function(id, type) {
	if (type == Steam.EFriendRelationship.PendingInvitee) {
		info("Adding friend with id " + id);
		steam.addFriend(id);
	}
});
