var port = process.env.port;
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(port);
//console.log(typeof handleGotHeader);
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
var id = 0;
var clients = [];
var IDs = [];
var nicknames = [];
var relIDNick = [];
var relNickID = [];
var accFun = [];

io.on('connection', function (socket) {
    clients.push(socket.id);
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
        accFun[id] = new Object();
        accFun[id].fn = fn; // funcion de callback
        accFun[id].ids = ids; // destinatarios
        accFun[id].len = c; // numero destinatarios de los que se espera respuesta
        accFun[id].loc = loc; // el id local de archivo (cliente)
        accFun[id].partsSent = 0; // partes enviadas
        accFun[id].totalParts = header.parts; // partes totales del archivo
        accFun[id++].count = 0; // aceptaciones recibidas
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
        if (accFun[part.id].valid) {
            accFun[part.id].ids.forEach(function (id) {
                if (IDs[id]) {
                    socket.to(id).emit('newPart', part);
                } else if (nicknames[id]) {
                    var dest = relNickID[id];
                    socket.to(dest).emit('newPart', part);
                }
            })
            ++accFun[part.id].partsSent;
            if (accFun[part.id].partsSent == accFun[part.id].totalParts)
                delete accFun[part.id];
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

    socket.on('disconnect', function () {
        delete nicknames[relIDNick[socket.id]];
        delete relNickID[relIDNick[socket.id]];
        delete relIDNick[socket.id];
        delete IDs[socket.id];
        console.log("Disconnected: " + socket.id);
    })
    

    console.log("New connection: " + socket.id);
});