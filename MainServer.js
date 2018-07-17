var http = require('http');
var EventEmitter = require("events").EventEmitter;
var express = require("express");
var bodyparser = require("body-parser");
var url = require("url");
var request = require("request");
var port = 80;
var logger = new EventEmitter();
var app = express();
var serverWeb = http.createServer(app);
var socketIO = require("socket.io");
var websocketServer = socketIO(serverWeb);
//  Auth token
var jwt = require("jsonwebtoken");
var socketJWT = require("socketio-jwt");
//  Sessione
var session = require('express-session');

var mySecret = 'random-word';

var users = [];
var users_nickname = [];

var aste = [
    { title: "Asta1", stato: "attiva", utenti: [], fine: "12/12/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta2", stato: "attiva", utenti: [], fine: "03/12/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta3", stato: "conclusa", utenti: [], fine: "05/12/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta4", stato: "attiva", utenti: [], fine: "11/12/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta5", stato: "conclusa", utenti: [], fine: "07/12/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta6", stato: "attiva", utenti: [], fine: "02/05/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta7", stato: "conclusa", utenti: [], fine: "01/08/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta8", stato: "attiva", utenti: [], fine: "03/12/2018", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 },
    { title: "Asta9", stato: "attiva", utenti: [], fine: "15/01/2019", vincitore: "Pippo", rilancio_minimo: 20, valore_attuale: 100 }]

// the session function midleware
var sessionMidleware = session({
    name: 'App-Name',            // Sarà il nome del Cookie
    secret: mySecret,           // Questo segreto è richiesto ed è usato per loggarsi con il cookie.
    resave: false,              // Forza il salvataggio della sessione per ogni richeista
    saveUninitialized: true,    // Salva una sessione che è nuova, ma non è stata modificata
    cookie: {
        //secure: true, //Note be careful when setting this to true, as compliant clients will not send the cookie back to the server in the future if the browser does not have an HTTPS connection. Please note that secure: true is a recommended option. However, it requires an https-enabled website, i.e., HTTPS is necessary for secure cookies
        maxAge: 60000
    }
});

// attach the same session to websocket and web server
websocketServer.use(function (socket, next) {
    sessionMidleware(socket.request, socket.request.res, next);
});
app.use(sessionMidleware);

//manage the get and post data
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

app.use('/', express.static('www'));

//MODULO LOGIN
var checkLoginInput = function (req, res, next) {
    if (req.body.nickname && req.body.password)
        next();
    else
        res.send({ result: false, msg: "mancano i dati" }); // Un controllo lato client permetterà di capire se i dati son presenti nel form o meno. 
}

var checkLoginDb = function (req, res, next) {
    /* Controlliamo se l'username è già presente in un eventuale DataBase*/
    if (users_nickname.indexOf(req.body.nickname) == -1) {
        console.log("Utente non registrato.");
        // Inviare dati per farsi registrare.
        res.send({ notRegistered: true, message: "Utente non registrato. Registrati!" });
        console.log("Utente non in DB ", users_nickname);
    }
    else {
        console.log("Utente presente, quindi puoi accedere all'account.");
        next();
    }
}

var checkLoginRespond = function (req, res) {
    //se login riesce
    req.session.user = {
        nickname: req.body.nickname,
        token: jwt.sign({ nickname: req.body.nickname, ts: Date.now() }, mySecret)
    }

    console.log("checkLoginRespond: Creazione Sessione");
    // Salviamo la sessione
    req.session.save(function (err) {
        if (err)
            console.error(err);

        console.log("checkLoginRespond: Salvataggio Sessione Avvenuto.");
        res.end({ result: true, token: req.session.user.token } + "");
    });
}

var getAste = function (req, res) {
    res.send(aste);
}

var getAsteAttive = function (req, res) {
    var arr = [];
    aste.forEach(function (snap) {

        if (snap.stato == 'attiva') {
            var obj = {
                title: snap.title,
                fine: snap.fine,
                stato: snap.stato
            }
            arr.push(obj);
        }
    })
    setTimeout(function () { res.send(arr); console.log('attendo invio dati') }, 3000)
}

var getAsteTable = function (req, res) {
    var arr = [];
    aste.forEach(function (snap) {

        var obj = {
            title: snap.title,
            fine: snap.fine,
            stato: snap.stato,
            valore_attuale: snap.valore_attuale,
            rilancio_minimo: snap.rilancio_minimo,
            vincitore: snap.vincitore
        }
        arr.push(obj);
    })
    setTimeout(function () { res.send(arr); console.log(arr) }, 3000)
}

app.post('/login', checkLoginInput, checkLoginDb, checkLoginRespond);

var getSession = function (req, res) {
    res.send(req.session.user);
}
app.get("/session", getSession);
app.get("/aste-attive", getAsteAttive);
app.get("/aste-table", getAsteTable);

var destroySession = function (req, res) {
    req.session.destroy(function (err) {
        console.log("Server -> Sessione distrutta.");
        res.send("Deleted");
    });
};

app.post("/logout", destroySession);

websocketServer.on("connection", socketJWT.authorize({
    secret: mySecret,
    timeout: 30000
}));

websocketServer.on("authenticated", function (socketC) {
    console.log("Un Utente si è collegato");
    users[socketC.request.session.user.nickname] = socketC; // Inseriamo nell'Array Users la Socket

    socketC.on("logout_event", function (data) {
        console.log("Server -> socket:", data);
        var nickname = socketC.request.session.user.nickname;
        if (nickname) {
            delete users[nickname];
            console.log("Lista precedente: ", users_nickname);
            users_nickname.splice(users_nickname.indexOf(nickname), 1);
            console.log("Lista successiva: ", users_nickname);
            console.log("Si è disconnesso", nickname);
        }
    });
});

serverWeb.listen(port, function () {
    logger.emit("info", "Server avviato sulla porta", port);
});