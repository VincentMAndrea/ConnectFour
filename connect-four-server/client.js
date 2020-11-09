const PacketBuilder = require("./packet-builder").PacketBuilder;

exports.Client = class Client {
    constructor(socket, server){
        this.socket = socket;
        this.server = server;
        this.username = "";

        this.buffer = Buffer.alloc(0);

        this.socket.on("error", (e)=>{this.onError(e)});
        this.socket.on("close", ()=>{this.onClose()});
        this.socket.on("data", (d)=>{this.onData(d)});
    }
    onError(errMsg){
        console.log("ERROR with client: "+errMsg);
    }
    onClose(){
        this.server.onClientDisconnect(this);
    }
    onData(data){
        // add new data to buffer:
        this.buffer = Buffer.concat([this.buffer, data]);
        //const lengthOfUsername = this.buffer.readUInt8(4); //gets one byte 4 bytes into the buffer
        // parse buffer for packets:
        if(this.buffer.length < 4) return; // not enough data to process
        
        const packetIdentifier = this.buffer.slice(0, 4).toString();

        switch(packetIdentifier){
            case "JOIN":
                if(this.buffer.length < 5) return; // not enough data to process
                const lengthOfUsername = this.buffer.readUInt8(4);

                if(this.buffer.length < 5 + lengthOfUsername) return; // not enough data to process

                const desiredUsername = this.buffer.slice(5, 5+lengthOfUsername).toString();

                // check username
                let responseId = this.server.generateResponseID(desiredUsername, this);

                
                this.buffer = this.buffer.slice(5 + lengthOfUsername); // consume data out of the buffer
                
                console.log("user wants to change name: '"+desiredUsername+"' ");
                
                //build and send packet:
                const packet = PacketBuilder.join(responseId);
                this.sendPacket(packet);

                if (responseId <= 3 && responseId > 0) 
                {
                    this.username = desiredUsername;
                    const packet2 = PacketBuilder.update(this.server.game);
                    this.sendPacket(packet2);
                }

                 break;
            case "CHAT": 
                if(this.buffer.length < 6) return; // not enough data...
                const msgLength = this.buffer.readUInt8(4);
                const msg = this.buffer.slice(5, 5+msgLength).toString();
                this.buffer = this.buffer.slice(5 + msgLength);
                const msgPacket = PacketBuilder.chat(this.username, msg);
                console.log(this.username + ": " + msg);
                this.server.broadcastPacket(msgPacket);
            break;
            case "PLAY": 
                if(this.buffer.length < 6) return; // not enough data...
                const x = this.buffer.readUInt8(4);
                const y = this.buffer.readUInt8(5);
                if(this == this.server.game.clientRed || this == this.server.game.clientBlue){
                    console.log("user wants to play at: "+x+","+y);
                }
                else{
                    console.log("spectator wants to play at: "+x+","+y);
                }

                this.buffer = this.buffer.slice(6);
                this.server.game.playMove(this, x, y);
                break;
            case "RMCH":
                this.buffer = this.buffer.slice(4);
                this.server.game.reset();
                break;
            default:
                console.log("ERROR: Packet identifier NOT recognized("+packetIdentifier+")");
                this.buffer = Buffer.alloc(0); // wipe the buffer (might cause issues).
                break;
        }
        // process packets (and consume data from buffer)
    }
    sendPacket(packet){
        this.socket.write(packet);
    }
};