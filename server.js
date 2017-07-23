var http = require('http');
var fs = require('fs');
var url = require('url');
var gamecode = generateGameCode();
var players = [];
var err404;
//var home = '/home/bitnami/KeepTalking/game/';
var home = 'C:/Users/justin/GitHub/its-the-bomb/';
var debugmode = true;
var ticking = false
var exploded = false


http.createServer(function(request, response) {
	var body = "";
	request.on('readable', function() {
		var buffer = request.read();
		if (buffer) { body += buffer; }
	});
	request.on('end', function() {
		if (debugmode) { console.log(request.method, request.url, "**", body, "**"); }
		requestHandlerFactory(request.url, executeHandler);

		function executeHandler(requestHandler) {
			requestHandler(request.method.toLowerCase(), request.url.toLowerCase(), body, response);
		}
	});
}).listen(80);



console.log('running');
fs.readFile(home + 'error/404.html', function(err, data) {
	if (err) { err404 ="fatal error"; }
	else { err404 = data; }
});

//-----------------------------------------------------------------------

function fileHandler(method, page, body, response) {
	var pathname = url.parse(page).pathname;
	if (pathname == '/') {
		pathname = '/index.html';
	}
	pathname = home + '/wwwroot' + pathname;

	fs.readFile(pathname, function(err, data) {
		if (err) {
			response.writeHead (404, {'Content-Type': 'text/html'});
			response.write (err404);
			response.end ();
		}
		else {
			var mime = 'text/html';
			switch(pathname.substr((~-pathname.lastIndexOf(".") >>> 0) + 2))
			{
				case 'svg':
					mime = 'image/svg+xml';
					break;
				case 'css':
					mime = 'text/css';
					break;
				case 'js':
					mime = 'application/javascript';
					break;
				case 'png':
					mime = 'image/png';
					break;
				case 'ttf':
					mime = 'application/font-sfnt';
					break;
				case 'mp3':
					mime = 'audio/mpeg';
					break;
				case 'ogg':
					mime = 'audio/ogg';
					break;
			}
			response.writeHead (200, {'Content-Type': mime});
			response.write (data);
			response.end();
		}	
	});
}

function apiHostHandler(method, page, body, response) {

	var pathname = url.parse(page).pathname;

	if (pathname.toLowerCase().startsWith ('/api/host/kill')) {
		throw new Error('forced termination');
	}

	if (pathname.toLowerCase().startsWith ('/api/host/newgame')) {
		gamecode = generateGameCode();
		players = [];
	}

	try {
		var parms = url.parse(page, true).query;
		ticking = (parms.ticking == 'true');
		exploded = (parms.exploded == 'true');
	}
	catch (err) { }

	var data = {};
	data.gamecode = gamecode;
	data.players = players;
	
	response.writeHead (200, {'Content-Type': 'application/json' });
	response.end(JSON.stringify(data));
}

function apiPlayerHandler(method, page, body, response) {
	var pathname = url.parse(page).pathname;

	if (pathname.toLowerCase().startsWith ('/api/player/register')) {
		try {
			jsonBody = JSON.parse(body);
			if (debugmode) { console.log(jsonBody.gamecode, jsonBody.player); }
			if (jsonBody.gamecode != gamecode) {
				throw new Error("game code");
			}

			if (jsonBody.player == "") {
				throw new Error("name missing");
			}

			players.forEach( function (item) {
				if (jsonBody.player == item) {
					throw new Error("name collision");
				}
			});

			players.push (jsonBody.player);
			console.log('new player:' + jsonBody.player);
		}
		catch (err) {
			if (debugmode) { console.log(500, err.message); }
			response.writeHead (500, {'Content-Type': 'application/json' });
			response.end('{ "error" : "' + err.message + '" }');
			return;
		}
	}

	var data = {};
	data.ticking = ticking;
	data.exploded = exploded;

	response.writeHead (200, {'Content-Type': 'application/json' });
	response.end(JSON.stringify(data));
}

function nullHandler(method, page, body, response) {
	response.writeHead(500);
	response.end();	
	return;
};

function requestHandlerFactory(url, callback) {
	if (url.toLowerCase().startsWith ('/api/host')) {
		callback(apiHostHandler);
		return;
	}
	if (url.toLowerCase().startsWith ('/api/player')) {
		callback(apiPlayerHandler);
		return;
	}
	return callback(fileHandler);
}        

//-----------------------------------------------------------------------

function generateGameCode() {
	return Math.floor(Math.random() * (1000000 - 100000) + 100000);
}    