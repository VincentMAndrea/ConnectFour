const PacketBuilder = require("./packet-builder.js").PacketBuilder;
const Server = require("./server.js").Server;

const Game = {
    whoseTurn:1,
    whoHasWon:0,
    board:[ 
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0]
    ],
    clientRed:null, // player 1
    clientBlue:null, // player 2
    playMove(client, x, y){
        //someone already won:
        if(this.whoHasWon > 0) return;

        //ignore move packets from everyone but clientRed on clientRed's turn:
        if(this.whoseTurn == 1 && client != this.clientRed) return;

        //ignore move packets from everyone but clientBlue on clientBlue's turn:
        if(this.whoseTurn == 2 && client != this.clientBlue) return;

        if(x < 0) return; // ignore illegal moves
        if(y < 0) return; // ignore illegal moves

        if(y >= this.board.length) return; // ignore illegal moves
        if(x >= this.board[y].length) return; // ignore illegal moves

        if(this.board[y][x] > 0) return; // ignore moves on taken spaces

        if(!this.checkPlacement(x)) return; // validate piece placement and update the board

        this.checkStateAndUpdate();  
    },
    checkStateAndUpdate(){
        this.checkWin();
        this.whoseTurn = (this.whoseTurn == 1) ? 2 : 1; // toggles the turn
        const packet = PacketBuilder.update(this);
        Server.broadcastPacket(packet);
    },
    checkWin(){

        yMax = this.board.length;
        xMax = this.board[0].length;
        i = 0;
        for (y = 0; y < yMax; y++) { 
            for (x = 0; x < xMax; x++) { 
                player = this.board[y][x];                
                if (player == 0)
                    continue;
                    // check right
                if (x + 3 < xMax && player == this.board[y][x+1] && player == this.board[y][x+2] && player == this.board[y][x+3])
                    this.whoHasWon = player;

                    // check up
                if (y + 3 < yMax) {
                    if (player == this.board[y+1][x] && player == this.board[y+2][x] && player == this.board[y+3][x])
                        this.whoHasWon = player;

                        // check diag right
                    if (x + 3 < xMax && player == this.board[y+1][x+1] && player == this.board[y+2][x+2] && player == this.board[y+3][x+3])
                        this.whoHasWon = player;

                        // check diag left
                    if (x - 3 >= 0 && player == this.board[y+1][x-1] && player == this.board[y+2][x-2] && player == this.board[y+3][x-3])
                        this.whoHasWon = player;
                 }
                
                 // check cats-game
                 i++;
                 if(i == yMax * xMax && this.whoHasWon == 0)
                 {
                     this.whoHasWon = 3;
                 }
 
            }
        }
    },
    checkPlacement(x){
        // place piece at the highest available row for the given column (lowest on board);
        yMax = this.board.length - 1;
        for (y = yMax; y >= 0; y--){
            if(this.board[y][x] == 0){
                this.board[y][x] = this.whoseTurn;
                return true;
            }
        }
        return false;
    },
    reset(){
        console.log("Rematch called");
        this.whoseTurn = 2;
        this.whoHasWon = 0;
        this.board = [ 
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0]
        ];

        this.checkStateAndUpdate();
    }       
};

Server.start(Game);