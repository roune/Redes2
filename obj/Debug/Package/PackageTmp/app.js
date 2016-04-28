var objectives = [];
var localId = 0;
var headers = [];
var requests = [];
//stop effects when events active
function stopHoverEfect(e) {
    e.stopPropagation();
    e.preventDefault();
}

function sendChuncks(chuncks, header, index) {
    chuncks.forEach(function (c, i) {
        var part = new Object();
        part.blob = new Blob([c], { type: header.type });
        part.id = header.id;
        part.order = i + index;
        socket.emit('newPart', objectives, part);
    })
}

//send files
function sendFile(e) {
    stopHoverEfect(e);
    
    var files = e.target.files || e.dataTransfer.files;
        
    for (var z = 0, f; f = files[z]; z++) {
        var parts = Math.ceil(f.size / (1024 * 1024));
        var header = new Object();
        header.parts = parts;
        header.name = f.name;
        header.type = f.type;
        headers[localId] = new Object();
        headers[localId].header = header;
        headers[localId].file = f;
        socket.emit('newFile', objectives, header, localId++, function (loc, id) {
            if (loc === -1 && id === null) {
                return;
            }
            var header = headers[loc].header;
            var f = headers[loc].file;
            var b = new Blob([f], { type: header.type });
            header.id = id;
            for (var i = 0; i < header.parts; i++) {
                var part = new Object();
                if (i + 1 == header.parts) {
                    part.blob = b.slice(i * 1024 * 1024);
                } else {
                    part.blob = b.slice(i * 1024 * 1024, (i + 1) * 1024 * 1024);
                }
                part.id = header.id;
                part.order = i;
                socket.emit('newPart', part);
            }
        })
    }    

    
}