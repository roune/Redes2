var objectives = [];
var localId = 0;
var headers = [];
var requests = [];
var socket;
var files = [];

function load() {
	
    /*var options = {secure: true};    
    socket = io(options);*/
    
    socket = io();
    //document.getElementById("addId").addEventListener('click', function () {
    //    var newId = document.getElementById("changeId").value;
    //    socket.emit('addNickname', newId, function (state) {
    //        if (state) {
    //            alert("ID cambiado");
    //        } else {
    //            alert("Nombre ya cogido, elija otro");
    //        }
    //    })
    //})

    //Drag and drop script
    
    //socket.io
    createDivDragger('id');

    socket.on('newFile', function (header) {
        files[header.id] = new Object();
        files[header.id].name = header.name;
        files[header.id].type = header.type;
        files[header.id].parts = header.parts;
        files[header.id].chuncks = [];
        if (confirm("Desea aceptar el archivo " + header.name)) {
            socket.emit('accept', header.id, true);
            var progressBar = '<div class="progress">  <div class="progress-bar" id="file-' + header.id + '" role="progressbar" style="width:0"> ' + header.name + '</div></div>';
            document.getElementById("downloads").innerHTML += progressBar;
            //document.getElementById("downloads").style.visibility = "visible";
        } else {
            socket.emit('accept', header.id, false);
            delete files[header.id];
        }
    });
    socket.on('newPart', function (part) {
        files[part.id].chuncks.push(part);
        console.log(files[part.id].chuncks.length / files[part.id].parts);
        document.getElementById("file-" + part.id).style.width = String((files[part.id].chuncks.length / files[part.id].parts)*100) + "%";
        if (files[part.id].chuncks.length == files[part.id].parts) {
            files[part.id].chuncks.sort(function (a, b) {
                return a.order - b.order;
            })
            var blobs = [];
            files[part.id].chuncks.forEach(function (c) {
                blobs.push(c.blob);
            })
            var finalFile = new Blob(blobs, { type: files[part.id].type });
            var type = files[part.id].type;
            var name = files[part.id].name;
            saveAs(finalFile, files[part.id].name);
            delete files[part.id];
        }
    })

    document.getElementById("addReceiver").addEventListener('click', function () {
        objectives.push(document.getElementById('receiver').value);
    });
    //Button script
    document.getElementById("choose-file").addEventListener('click', function () {
        document.getElementById('files').click();
    });
    document.getElementById("files").addEventListener('change', sendFile, false);

    document.getElementById("add-nickname").addEventListener('click', function () {
        var nick = document.getElementById('nickname').value;
        socket.emit("addNickname", nick, function(a) {
            
            if (a) {
                document.getElementById('close-name').click();
                alert("Your name is " + nick + "!");
            } else {
                alert("Please try with another name");
            }
        })
    });

    document.getElementById('new-name').click();
}

//stop effects when events active
function stopHoverEfect(e) {
    e.stopPropagation();
    e.preventDefault();
}

function createDivDragger(id) {
    var dragger = document.getElementById(id);
    dragger.addEventListener("dragover", stopHoverEfect, false);
    dragger.addEventListener("dragleave", stopHoverEfect, false);
    dragger.addEventListener("drop", sendFile, false);
}

function sendChuncks(part) {
    console.log("Emiting part " + part.id);
    socket.emit('newPart', part);
}

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
                setTimeout(sendChuncks(part), 0);
            }
        })
    }    
    objectives = [];
}
