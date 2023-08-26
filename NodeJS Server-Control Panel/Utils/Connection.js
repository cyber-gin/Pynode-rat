//create a connection class that holds name, ws, and ip
 class Connection {
    constructor(name, ws, ip, admin) {
        this.name = name;
        this.ws = ws;
        this.ip = ip;
        this.admin = admin;
        this.timer = 10000;
    }
    //send a command to the connection
    send(command) {
        this.ws.send(JSON.stringify(command));
    }
    sendBytes(bytes) {
        this.ws.send(bytes, { binary: true });
    }
}

module.exports = Connection;