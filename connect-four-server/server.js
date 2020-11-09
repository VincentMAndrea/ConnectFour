const Client = require("./client").Client;
const PacketBuilder = require("./packet-builder.js").PacketBuilder;

exports.Server = {
    port:320,
    clients:[],
    maxConnectedUsers:8,
    start(game){
        this.game = game;
        this.socket = require("net").createServer({}, c=>this.onClientConnect(c));
        this.socket.on("error", e=>this.onError(e));
        this.socket.listen({port:this.port}, ()=>this.onStartListen());
    },
    onClientConnect(socket){
        console.log("New connection from " + socket.localAddress);

        if(this.isServerFull()){ // server is full
            
            const packet = PacketBuilder.join(9);
            socket.end(packet);

        } else { // server is not full
            // instantiate clients
            const client = new Client(socket, this);
            this.clients.push(client);
        }
        
        
    },
    onClientDisconnect(client){
        if(this.game.clientRed == client) this.game.clientRed = null;
        if(this.game.clientBlue == client) this.game.clientBlue = null;

        const index = this.clients.indexOf(client);
        if(index >= 0) this.clients.splice(index, 1); //remove from array. Negative if can't find.

        if(this.game.clientRed == null){
            this.clients.forEach(c => {
                if(c != this.game.clientRed && c != this.game.clientBlue) {
                    this.game.clientRed = c;
                    return; // set as clientRed
                } 
            });
        }

        if(this.game.clientBlue == null){
            this.clients.forEach(c => {
                if(c != this.game.clientRed && c != this.game.clientBlue) {
                    this.game.clientBlue = c;
                    return; // set as clientBlue
                } 
            });
        }
    },
    onError(e){
        console.log("ERROR with listener: "+e);
    },
    onStartListen(){
        console.log("Server is now listening on port " + this.port);
    },
    isServerFull(){
        return (this.clients.length >= this.maxConnectedUsers);
    },
    generateResponseID(desiredUsername, client){
        //this function returns a response id

        if (desiredUsername.length < 3) return 4; // username too short!
        if (desiredUsername.length > 16) return 5; // username too long!

        const regex1 = /^[a-zA-Z0-9]+$/; // literal regex in JavaScript
        if(!regex1.test(desiredUsername)) return 6; // uses invalid characters

        let isUsernameTaken = false;
        this.clients.forEach(c => {
            if(c == client) return;
            if(c.username == desiredUsername) isUsernameTaken = true;
        });

        if(isUsernameTaken) return 7; // username taken

        const regex2 = /(fuck|fvck|fuk|shit|damn|faggot|nigger|cunt|bitch|spic)/i;
        if(regex2.test(desiredUsername)) return 8; // username contains profanity

        if(this.game.clientRed == client) {
            return 1; // keep as clientRed
        } 
        
        if(this.game.clientBlue == client) {
            return 2; // keep as clientBlue
        }

        if(!this.game.clientRed) {
            this.game.clientRed = client;
            return 1; // set as clientRed
        } 
        
        if(!this.game.clientBlue) {
            this.game.clientBlue = client;
            return 2; // set as clientBlue
        }

        return 3; // set as spectator
    },
    broadcastPacket(packet){
        this.clients.forEach(c=>{
            c.sendPacket(packet);
        })
    }
};
// the object that can be referenced with "require"

console.log("server.js is running...");