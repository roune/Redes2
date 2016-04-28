var port = process.env.port || 80;
var app = require('express')();

var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(port);

console.log("Escuchando en el puerto: " + port);

app.get('/', function (req, res) {
res.sendFile(__dirname + '/index.html');
});

app.get('/app.js', function (req, res) {
res.sendFile(__dirname + '/app.js');
});

app.get('/FileSaver.js', function (req, res) {
res.sendFile(__dirname + '/FileSaver.js');
});

app.get('/Blob.js', function (req, res) {
res.sendFile(__dirname + '/Blob.js');
});

app.get('/socket.io-1.3.7.js', function (req, res) {
res.sendFile(__dirname + '/socket.io-1.3.7.js');
});

app.get('/jquery.js', function (req, res) {
res.sendFile(__dirname + '/jquery-2.1.4.min.js');
});

app.get('/bootstrap.min.css', function (req, res) {
res.sendFile(__dirname + '/bootstrap.min.css');
});

app.get('/bootstrap.min.js', function (req, res) {
res.sendFile(__dirname + '/bootstrap.min.js');
});

var id = 0;
var IDs = [];
var nicknames = [];
var relIDNick = [];
var relNickID = [];
var accFun = {};
var userTransfer = {};
//********************************************************************************************************
//REVISAR TODO TEMA SOCKETS
//********************************************************************************************************
io.on('connection', function (socket) {
	IDs[socket.id] = true;
	socket.on('newFile', function (ids, header, loc, fn) {
		console.log("New header: " + id);
		header.id = id;
		var c = 0;
		ids.forEach(function (dest) {
		    ++c;
		    if (IDs[dest]) {
		        socket.to(dest).emit('newFile', header);
		    } else if (nicknames[dest]) {
		        var dest = relNickID[dest];
		        socket.to(dest).emit('newFile', header);
		    }
		})
		if (typeof userTransfer[socket.id] === 'undefined') {
		    userTransfer[socket.id] = new Object();
		    userTransfer[socket.id].fileIDs = [];
		}
		accFun[id] = new Object();
		accFun[id].fn = fn; // funcion de callback
		accFun[id].ids = ids; // destinatarios
		accFun[id].len = c; // numero destinatarios de los que se espera respuesta
		accFun[id].loc = loc; // el id local de archivo (cliente)
		accFun[id].partsSent = 0; // partes enviadas
		accFun[id].totalParts = header.parts; // partes totales del archivo
		accFun[id].valid = false;
		accFun[id].count = 0; // aceptaciones recibidas
		if (typeof userTransfer[socket.id] === 'undefined') {
		    userTransfer[socket.id] = new Object();
		    userTransfer[socket.id].fileIDs = [];
		}
		userTransfer[socket.id].fileIDs.push(id++);
	})

	socket.on('accept', function (fileID, answer) {
		var id = accFun[fileID].ids.indexOf(socket.id);
		var nickname = accFun[fileID].ids.indexOf(relIDNick[socket.id]);
		if (id === -1 && nickname === -1) {
		    fn(-1, null);
		} else {
		    accFun[fileID].count++;
		    if (!answer) {
		        if (id === -1) {
		            accFun[fileID].ids.splice(nickname, 1);
		        } else {
		            accFun[fileID].ids.splice(id, 1);
		        }
		    }
		    if (accFun[fileID].len == accFun[fileID].count) {
		        accFun[fileID].valid = true;
		        accFun[fileID].fn(accFun[fileID].loc, fileID);
		    }
		}
	})

	socket.on('newPart', function (part) {
		console.log("New Part: id = " + part.id + " order: " + part.order);
		if (typeof part === 'undefinded' || typeof part.id === 'undefinded' || typeof part.order === 'undefinded' || typeof accFun[part.id] === 'undefinded')            ;
		else if (accFun[part.id].valid) {
		    accFun[part.id].ids.forEach(function (id) {
		        if (IDs[id]) {
		            socket.to(id).emit('newPart', part);
		        } else if (nicknames[id]) {
		            var dest = relNickID[id];
		            socket.to(dest).emit('newPart', part);
		        }
		    })
		    ++accFun[part.id].partsSent;
		    if (accFun[part.id].partsSent == accFun[part.id].totalParts) {
		        userTransfer[socket.id].fileIDs.splice(userTransfer[socket.id].fileIDs.indexOf(part.id), 1);
		        if (userTransfer[socket.id].fileIDs.length == 0) {
		            delete userTransfer[socket.id];
		        }
		        delete accFun[part.id];
		    }
		}
	})

	socket.on('addNickname', function (newId, fn) {
		if (IDs[newId] || nicknames[newId]) {
		    console.log("Nombre cogido: " + newId);
		    fn(false);
		} else {
		    console.log("Nombre cambiado: " + socket.id + "-" + newId);
		    nicknames[newId] = true;
		    relIDNick[socket.id] = newId;
		    relNickID[newId] = socket.id;
		    fn(true);
		}
	})

	socket.on('searchUser', function (name) {
		if (name != null)
		    setTimeout(searchName(name, socket.id, socket), 0);
	})

	socket.on('disconnect', function (reason) {
		console.log("Disconnected: " + socket.id + " nombre: " + relIDNick[socket.id]);
		console.log("Because " + reason);
		if (typeof userTransfer[socket.id] !== 'undefined') {
		    var ids = userTransfer[socket.id].fileIDs;
		    ids.forEach(function (id) {
		        delete accFun[id];
		    })
		}
		delete nicknames[relIDNick[socket.id]];
		delete relNickID[relIDNick[socket.id]];
		delete relIDNick[socket.id];
		delete IDs[socket.id];
	})

	console.log("New connection: " + socket.id);
});

function searchName(name, socketid, socket) {
	var re = new RegExp("^" + name);
	var userNames = [];
	for (var prop in nicknames) {
	    if (re.test(prop))
        userNames.push(prop);
	}
	socket.to(socketid).emit('usernames', userNames);
}

