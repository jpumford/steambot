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
var admin = "";

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
  
  info('Trading with ' + steam.users[client].playerName + ', id: ' + client);
  steamTrade.open(otherClient);
  steamTrade.loadInventory(440, 2, function(inv) {
    inventory = inv;
    scrap = inv.filter(function(item) { return item.name == 'Summer Claim Check';});
  });
});

steamTrade.on('offerChanged', function(added, item) {
// console.log(item);
  info('they ' + (added ? 'added ' : 'removed ') + item.name);
	if (added) {
		var toAdd = 0;
		switch (item.name) {
			case 'Scrap Metal':
				toAdd = 1;
				break;
			case 'Reclaimed Metal':
				toAdd = 3;
				break;
			case 'Refined Metal':
				toAdd = 9;
				break;
			default:
				steam.sendMessage(client, "Uh, I only accept metal...");
				break;
		}
		if (toAdd > (scrap.length - addedScrap.length)) {
			steam.sendMessage(client, "I don't have enough claim tickets to cover that amount of metal :(");
			info('Not enough scrap for ' + toAdd + ' units of metal');
		} else {
			info('Adding ' + toAdd + ' claim check(s)');
			var newScrap = [];
			for (var i = toAdd; i > 0; i--) {
				newScrap.push(scrap[addedScrap.length]);
				addedScrap.push(newScrap[newScrap.length - 1]);
			}
			steamTrade.addItems(newScrap);
		}
	} else if (!added) {
		var toRemove = 0;
		switch (item.name) {
			case 'Scrap Metal':
				toRemove = 1;
				break;
			case 'Reclaimed Metal':
				toRemove = 3;
				break;
			case 'Refined Metal':
				toRemove = 9;
				break;
			default:
				break;
		}
		info('Removing ' + toRemove + ' claim check(s)');
		for (var i = toRemove; i > 0; i--) {
			var scrapToRemove = addedScrap.pop();
			steamTrade.removeItem(scrapToRemove);
		}
	}
/*
	if (added && item.name == 'Scrap Metal') {
		
		info('Adding a claim check');
		var newScrap = scrap[addedScrap.length];
		steamTrade.addItems([newScrap]);
		addedScrap.push(newScrap);
	} else if (!added && item.name == 'Scrap Metal') {
		info('Removing a claim check');
		var scrapToRemove = addedScrap.pop();
		steamTrade.removeItem(scrapToRemove);
	}

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
});

steamTrade.on('end', function(result) {success('trade', result);});

steamTrade.on('ready', function() {
  info('readying');
  steamTrade.ready(function() {
    info('confirming');
    steamTrade.confirm();
    success('Trade complete');
  });
});

steamTrade.on('chatMsg', function(chatRoomId, message, chatType, steamId) {
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
