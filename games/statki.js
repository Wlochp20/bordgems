require('dotenv').config();

const gameFunctions = require('../functions/gameMisc');
const userFunctions = require('../functions/user');

const height = 10;
const width = 10;

let ioS = undefined;

module.exports = {
    getStartingOptions: () =>
    {
        const normalBoardO = gameFunctions.generateBoards(height, width);
        const normalBoardT = gameFunctions.generateBoards(height, width);
        const secretBoardO = gameFunctions.generateBoards(height, width);
        const secretBoardT = gameFunctions.generateBoards(height, width);

        const options = { boards: [normalBoardO, normalBoardT], ready: [false, false], started: false, maxPlayers: 2, setupTime: 60, secret: { boards: [secretBoardO, secretBoardT], ships: [[], []] } };

        return options;
    },
    addInterval: (lobby, gamesFunctions) =>
    {
        if(ioS === undefined) return;

        if(!lobby.gameOptions.started && lobby.gameOptions.setupTime >= 0)
        {
            lobby.gameOptions.setupTime--;
            return;
        }
        else if(!lobby.gameOptions.started)
        {
            for (let i = 0; i < lobby.players.length; i++) 
            {
                if(lobby.gameOptions.ready[i]) continue;

                const board = lobby.gameOptions.secret.boards[i];

                let shipsPositions = GetRandomizedBoard();
                lobby.gameOptions.secret.ships[i] = shipsPositions;

                for (let i = 0; i < board.length; i++)
                    for (let j = 0; j < Object.keys(board[i]).length; j++)
                        board[i][gameFunctions.alphabet[j]] = 0;
            
                for (let y = 0; y < shipsPositions.length; y++) 
                {
                    for (let x = 0; x < shipsPositions[y].length; x++) 
                    {
                        const ship = shipsPositions[y][x];
                        
                        board[ship.y][gameFunctions.alphabet[ship.x]] = 1;
                    }
                }

                lobby.gameOptions.ready[i] = true;
            }
            
            lobby.gameOptions.started = true;
            
            return ioS.to(`statki#${lobby.code}`).emit("statki/setPositions/res", { status: "ok", message: "Gra rozpoczęta", additional: { started: true } });
        }
        
        gamesFunctions.lowerTime(lobby);

        if(gamesFunctions.checkPlayers(lobby) == 1)
        {
            lobby.winner = lobby.players[lobby.queue];
            return true;
        }

        const otherPlayerIndex = lobby.queue == 0 ? 1 : 0;

        if(!IsAlive(lobby.gameOptions.secret.boards[otherPlayerIndex], lobby.gameOptions.secret.ships[otherPlayerIndex]))
        {
            lobby.winner = lobby.players[lobby.queue];
            return true;
        }
    },
    addExpress: (app, lobbies, gamesFunctions) => 
    { 
        app.get('/api/statki/randomizeBoard', (req, res) =>
        {
            let shipsPositions = GetRandomizedBoard();

            res.json({ status: 'ok', message: { ships: shipsPositions } });
        });
    },
    addSockets: (io, socket, lobbies, gamesFunctions) =>
    {
        ioS = io;

        socket.on('statki/secretBoard', async msg =>
        {
            const code = msg.code;
            const game = msg.game;

            if(code == undefined || !code)
                return socket.emit("statki/secretBoard/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("statki/secretBoard/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("statki/secretBoard/res", { status: "error", message: "Gra nie rozpoczęta" });
                
            let playerIndex = -1;
            for (let i = 0; i < lobby.players.length; i++) 
            {
                const player = lobby.players[i];

                if(JSON.stringify(player) != JSON.stringify(await userFunctions.getUserOrGuest(socket.request))) continue;

                playerIndex = i;
            }

            if(playerIndex == -1)
                return socket.emit("statki/secretBoard/res", { status: "error", message: "Nie jesteś żadnym graczem" });

            const board = lobby.gameOptions.secret.boards[playerIndex];

            return socket.emit("statki/secretBoard/res", { status: "ok", message: "Oto twoje statki", additional: { board } });
        });
        
        socket.on('statki/setPositions', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const allPositions = msg.allPositions;

            if(code == undefined || !code)
                return socket.emit("statki/setPositions/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("statki/setPositions/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("statki/setPositions/res", { status: "error", message: "Gra nie rozpoczęta" });
                
            if(lobby.gameOptions.started) 
                return socket.emit("statki/setPositions/res", { status: "error", message: "Gra już rozpoczęta" });
                
            let playerIndex = -1;
            for (let i = 0; i < lobby.players.length; i++) 
            {
                const player = lobby.players[i];

                if(JSON.stringify(player) != JSON.stringify(await userFunctions.getUserOrGuest(socket.request))) continue;

                playerIndex = i;
            }

            if(playerIndex == -1)
                return socket.emit("statki/setPositions/res", { status: "error", message: "Nie jesteś żadnym graczem" });

            if(!Array.isArray(allPositions))
                return socket.emit("statki/setPositions/res", { status: "error", message: "Nieprawidłowe dane" });
                
            if(allPositions.length != 10)
                return socket.emit("statki/setPositions/res", { status: "error", message: "Nieprawidłowe dane" });
                
            if(allPositions.some(position => position.length <= 0)) 
                return socket.emit("statki/setPositions/res", { status: "error", message: "Nieprawidłowe dane" });

            const positionCount = new Array();
            allPositions.forEach(position => 
            {
                if(positionCount[position.length - 1] == undefined)
                    positionCount[position.length - 1] = 0;

                positionCount[position.length - 1]++;
            });
            if(positionCount[0] != 4 || positionCount[1] != 3 || positionCount[2] != 2 || positionCount[3] != 1)
                return socket.emit("statki/setPositions/res", { status: "error", message: "Nieprawidłowe dane" });

            const board = JSON.parse(JSON.stringify(lobby.gameOptions.secret.boards[playerIndex]));

            let correct = true;
            allPositions.forEach(position => 
            {
                position.forEach(pos => 
                {
                    if(board[pos.y][gameFunctions.alphabet[pos.x]] != 0)
                        correct = false;
                    
                    board[pos.y][gameFunctions.alphabet[pos.x]] = 1;
                });
                position.forEach(pos => RoundShipPosition(board, pos.x, pos.y));
            });
            
            if(!correct)
                return socket.emit("statki/setPositions/res", { status: "error", message: "Statki nieprawidłowo rozmieszczone" });

            for (let i = 0; i < board.length; i++)
                for (let j = 0; j < Object.keys(board[i]).length; j++) 
                {
                    if(board[i][gameFunctions.alphabet[j]] != 1) continue;

                    lobby.gameOptions.secret.boards[playerIndex][i][gameFunctions.alphabet[j]] = 1;
                }

            lobby.gameOptions.ready[playerIndex] = true;
            lobby.gameOptions.secret.ships[playerIndex] = allPositions;

            if(lobby.gameOptions.ready[0] && lobby.gameOptions.ready[1])
                lobby.gameOptions.started = true;

            if(!lobby.gameOptions.started)
                return socket.emit("statki/setPositions/res", { status: "ok", message: "Statki zostały ustawione", additional: { started: false } });
                
            return io.to(`${game}#${code}`).emit("statki/setPositions/res", { status: "ok", message: "Gra rozpoczęta", additional: { started: true } });
        });
        
        socket.on('statki/shoot', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const pos = msg.pos;

            if(code == undefined || !code)
                return socket.emit("statki/shoot/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("statki/shoot/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started || !lobby.gameOptions.started)
                return socket.emit("statki/shoot/res", { status: "error", message: "Gra nie rozpoczęta" });
                
            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("statki/shoot/res", { status: "error", message: "Nie twoja kolej kolego" });
                            
            const otherPlayerIndex = lobby.queue == 0 ? 1 : 0;
            
            if(!IsAlive(lobby.gameOptions.secret.boards[otherPlayerIndex], lobby.gameOptions.secret.ships[otherPlayerIndex]))
                return socket.emit("statki/shoot/res", { status: "error", message: "Gra zakończona" });

            if(pos.x < 0 || pos.x > lobby.gameOptions.boards[otherPlayerIndex].length - 1 || pos.y < 0 || pos.y > lobby.gameOptions.boards[otherPlayerIndex].length - 1)
                return socket.emit("statki/shoot/res", { status: "error", message: "Nie możesz tam strzelić" });
                
            if(lobby.gameOptions.secret.boards[otherPlayerIndex][pos.y][gameFunctions.alphabet[pos.x]] != 1 && lobby.gameOptions.secret.boards[otherPlayerIndex][pos.y][gameFunctions.alphabet[pos.x]] != 0)
                return socket.emit("statki/shoot/res", { status: "error", message: "Nie możesz tam strzelić" });

            let fieldI = -1;
            if(lobby.gameOptions.secret.boards[otherPlayerIndex][pos.y][gameFunctions.alphabet[pos.x]] == 1)
                fieldI = -2;

            lobby.gameOptions.boards[otherPlayerIndex][pos.y][gameFunctions.alphabet[pos.x]] = fieldI;
            lobby.gameOptions.secret.boards[otherPlayerIndex][pos.y][gameFunctions.alphabet[pos.x]] = fieldI == -1 ? fieldI : Math.abs(fieldI);
            
            let positions = [{ x: pos.x, y: pos.y, fieldI }];

            let playerIndex = lobby.queue;

            if(fieldI != -2)
                gamesFunctions.nextPlayer(lobby);
            else
            {
                const ship = lobby.gameOptions.secret.ships[otherPlayerIndex].find(ship => ship.some(part => part.x == pos.x && part.y == pos.y));

                let destroyed = true;
                ship.forEach(shipPos => 
                {
                    if(lobby.gameOptions.secret.boards[otherPlayerIndex][shipPos.y][gameFunctions.alphabet[shipPos.x]] == 1)
                        destroyed = false;
                });

                if(destroyed)
                    ship.forEach(shipPos => 
                    {
                        positions = positions.concat(RoundShipPosition(lobby.gameOptions.secret.boards[otherPlayerIndex], shipPos.x, shipPos.y));
                        positions = positions.concat(RoundShipPosition(lobby.gameOptions.boards[otherPlayerIndex], shipPos.x, shipPos.y));
                    });
            }

            const turn = lobby.players[lobby.queue];

            return io.to(`${game}#${code}`).emit("statki/shoot/res", { status: "ok", message: "Strzelono", additional: { positions, playerIndex, turn } });
        });
    }
}
//pozycje doooła statków
function RoundShipPosition(board, x, y)
{
    const positions = new Array();

    if(y - 1 >= 0)
    {
        if(x - 1 >= 0)
            if(board[y - 1][gameFunctions.alphabet[x - 1]] == 0)
            {
                positions.push({ x: x - 1, y: y - 1 });
                board[y - 1][gameFunctions.alphabet[x - 1]] = -1;
            }
        
        if(board[y - 1][gameFunctions.alphabet[x]] == 0)
        {
            positions.push({ x: x, y: y - 1 });
            board[y - 1][gameFunctions.alphabet[x]] = -1;
        }
        
        if(x + 1 <= Object.keys(board[y - 1]).length - 1)
            if(board[y - 1][gameFunctions.alphabet[x + 1]] == 0)
            {
                positions.push({ x: x + 1, y: y - 1 });
                board[y - 1][gameFunctions.alphabet[x + 1]] = -1;
            }
    }

    if(x - 1 >= 0)
        if(board[y][gameFunctions.alphabet[x - 1]] == 0)
        {
            positions.push({ x: x - 1, y: y });
            board[y][gameFunctions.alphabet[x - 1]] = -1;
        }
    
    if(x + 1 <= Object.keys(board[y]).length - 1)
        if(board[y][gameFunctions.alphabet[x + 1]] == 0)
        {
            positions.push({ x: x + 1, y: y });
            board[y][gameFunctions.alphabet[x + 1]] = -1;
        }

    if(y + 1 <= board.length - 1)
    {
        if(x - 1 >= 0)
            if(board[y + 1][gameFunctions.alphabet[x - 1]] == 0)
            {
                positions.push({ x: x - 1, y: y + 1 });
                board[y + 1][gameFunctions.alphabet[x - 1]] = -1;
            }
        
        if(board[y + 1][gameFunctions.alphabet[x]] == 0)
        {
            positions.push({ x: x, y: y + 1 });
            board[y + 1][gameFunctions.alphabet[x]] = -1;
        }
        
        if(x + 1 <= Object.keys(board[y + 1]).length - 1)
            if(board[y + 1][gameFunctions.alphabet[x + 1]] == 0)
            {
                positions.push({ x: x + 1, y: y + 1 });
                board[y + 1][gameFunctions.alphabet[x + 1]] = -1;
            }
    }

    return positions;
}
//czy trafiony
function IsAlive(board, ships)
{
    for (let i = 0; i < ships.length; i++)
    {
        const shipPos = ships[i];
        for (let j = 0; j < shipPos.length; j++) 
            if(board[shipPos[j].y][gameFunctions.alphabet[shipPos[j].x]] == 1)
                return true;
    }

    return false;
}
//generowanie randomowego ustawiania statków na planszy
function GetRandomizedBoard()
{
    const board = gameFunctions.generateBoards(height, width);

    const possibleShips = [
        [1, 1, 1, 1], 
        [1, 1, 1], [1, 1, 1],
        [1, 1], [1, 1], [1, 1],
        [1], [1], [1], [1]
    ];

    const ships = new Array();

    for (let i = 0; i < possibleShips.length; i++) 
    {
        let xPos = Math.floor(Math.random() * 10);
        let yPos = Math.floor(Math.random() * 10);
        const column = Math.random() > .5 ? true : false;

        while (1) 
        {
            let canSet = true;
            for (let j = 0; j < possibleShips[i].length; j++) 
            {
                if(column)
                {
                    if(yPos + j < 0 || yPos + j > board.length - 1 || board[yPos + j][gameFunctions.alphabet[xPos]] != 0)
                    {
                        canSet = false;
                        xPos = Math.floor(Math.random() * 10);
                        yPos = Math.floor(Math.random() * 10);
                        break;
                    }
                }
                else
                    if(xPos + j < 0 || xPos + j > board.length - 1 || board[yPos][gameFunctions.alphabet[xPos + j]] != 0)
                    {
                        canSet = false;
                        xPos = Math.floor(Math.random() * 10);
                        yPos = Math.floor(Math.random() * 10);
                        break;
                    }
            }

            if(canSet) break;
        }

        const shipPos = new Array();
        for (let j = 0; j < possibleShips[i].length; j++)
        {
            if(column)
            {
                board[yPos + j][gameFunctions.alphabet[xPos]] = 1;
                RoundShipPosition(board, xPos, yPos + j);
    
                shipPos.push({ x: xPos, y: yPos + j });
            }
            else
            {
                board[yPos][gameFunctions.alphabet[xPos + j]] = 1;
                RoundShipPosition(board, xPos + j, yPos);
    
                shipPos.push({ x: xPos + j, y: yPos });
            }
        }

        ships.push(shipPos);
    }

    return ships;
}
