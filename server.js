"use strict";

var args            = process.argv.slice(2);
var PORT            = args[0] || 8888;
var SPI_OUT         = args[1] || "/dev/spidev0.0";
var child_process   = require('child_process');
var exec            = child_process.exec;
var http            = require('http');
var fs              = require('fs');
var server          = null;
var check_sync      = true;

var data = {
    "-": "\\x01\"",
    "0": "\\x7e\"",
    "1": "\\x30\"",
    "2": "\\x6d\"",
    "3": "\\x79\"",
    "4": "\\x33\"",
    "5": "\\x5b\"",
    "6": "\\x5f\"",
    "7": "\\x70\"",
    "8": "\\x7f\"",
    "9": "\\x7b\""
};

/**
 *
 * Test of SPI Display MAX7219 and Node.js version v0.10.29
 *
 */
function send(cmd) {
    console.log("send command: " + cmd + " - check_sync: " + check_sync);
    if (cmd !== null && cmd.length > 0) {

        if (check_sync) {
            cmd += " && > my_out.txt";
        }

        exec(cmd, function(err, out, code) {
            if (err instanceof Error)
                throw err;
        });

        while (check_sync) {
            try {
                var status = fs.readFileSync('my_out.txt', 'utf8');
                fs.unlinkSync("my_out.txt");
                break;
            } catch (err) {}
        }
    }
}

function performOperation(a, b, o) {
    var result = "---";
    console.log("performOperation: %s, %s, %s", a, b, o);
    switch (Number(o)) {
        case 0:
            result = Number(a) + Number(b);
            break;
        case 1:
            result = Number(a) - Number(b);
            break;
        case 2:
            result = Number(a) * Number(b);
            break;
        case 3:
            result = Number(a) / Number(b);
            break;
    }
    displayResult(Math.round(result));
}

function displayResult(value) {
    console.log("RESULT: " + value);
    if (value === null || value.toString() === 'NaN')
        value = "---";
    var rs = value.toString().split("");
    resetDisplay();
    var j = 1;
    for (var i = rs.length - 1; i >= 0; i--) {
        console.log("part: " + rs[i] + " i: " + i);
        send("sudo echo -ne \"\\x0" + j + data[rs[i]] + " > " + SPI_OUT);
        j++;
    }
}

function handleRequest(request, response) {

    var url = request.url || 'error';
    console.log("url: " + url);

    switch (url) {
        case "/":
            {
                fs.readFile('./index.html', function(err, data) {
                    if (!err) {
                        response.setHeader('Content-type', 'text/html');
                        response.end(data);
                    } else {
                        console.log('file not found: ' + request.url);
                        response.writeHead(404, "Not Found");
                        response.end();
                    }
                });
                break;
            }
        default:
            {
                if (url !== null && url.indexOf("a") > -1 && url.indexOf("b") > -1) {
                    var a = null;
                    var b = null;
                    var o = null;
                    url = url.substring(1);
                    var p = url.split("&&");
                    for (var i = 0; i < p.length; i++) {
                        if (a === null) {
                            a = p[i].substring(2);
                        } else if (b === null) {
                            b = p[i].substring(2);
                        } else if (o === null) {
                            o = p[i].substring(2);
                        }
                    }
                    performOperation(a, b, o);
                }
            }
    }
}

function resetDisplay() {
    send("sudo echo -ne \"\\x0c\\x00\" > " + SPI_OUT);
    for (var i = 0; i <= 8; i++) {
        send("sudo echo -ne \"\\x0" + i + "\\x00\" > " + SPI_OUT);
    }
    send("sudo echo -ne \"\\x0c\\x01\" > " + SPI_OUT);
}

function init() {
    send("sudo echo -ne \"\\x0f\\x00\" > " + SPI_OUT);
    send("sudo echo -ne \"\\x0b\\x07\" > " + SPI_OUT);
    resetDisplay();
}

server = http.createServer(handleRequest);
server.listen(PORT, function() {
    init();
    console.log("Listening on: http://localhost:%s", PORT);
});
