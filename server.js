var express = require('express');
var http = require('http');
var https = require('https');
var pem = require('pem');

const httpPort = process.env.PORT||1337;

pem.createCertificate({ days:1, selfSigned:true }, function(err, keys) {
    var app = express();
    app.use(express.static('_site/.'));

    var httpsServer = https.createServer({
        key: keys.serviceKey,
        cert: keys.certificate
    }, app).listen(0);

    http.createServer(app).listen(httpPort);

    console.log(`serving on http://localhost:${httpPort}`);
});
