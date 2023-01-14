require('dotenv').config();

const gameFunctions = require('../functions/gameMisc');

module.exports = {
    getStartingOptions: () =>
    {
        const board = gameFunctions.generateBoards(8, 8);

        for (let i = 0; i < 3; i++)
        {
            for (let j = 0; j < Object.keys(board[i]).length; j++)
            {
                if((j + i) % 2 == 0) continue;

                board[i][gameFunctions.alphabet[j]] = -1;
            }
        }
        for (let i = board.length - 1; i > board.length - 4; i--)
        {
            for (let j = 0; j < Object.keys(board[i]).length; j++)
            {
                if((j + i) % 2 == 0) continue;
                
                board[i][gameFunctions.alphabet[j]] = 1;
            }
        }

        const options = { board: board, maxPlayers: 2 };

        return options;
    },
    addInterval: (lobby, gamesFunctions) =>
    {
        gamesFunctions.lowerTime(lobby);
        
        if(gamesFunctions.checkPlayers(lobby) == 1)
        {
            lobby.winner = lobby.players[lobby.queue];
            return true;
        }

        let firstPlayer = 0;
        let secondPlayer = 0;
        let canMove = false;
        for (let i = 0; i < lobby.gameOptions.board.length; i++) 
        {
            const row = lobby.gameOptions.board[i];

            for (let j = 0; j < Object.keys(row).length; j++) 
            {
                if(row[gameFunctions.alphabet[j]] > 0)
                    firstPlayer++;
                else
                    secondPlayer++;

                if(canMove) continue;
                if(row[gameFunctions.alphabet[j]] == 0) continue;
                if(lobby.queue == 0 && row[gameFunctions.alphabet[j]] < 0) continue;
                if(lobby.queue == 1 && row[gameFunctions.alphabet[j]] > 0) continue;
                //sprawdzamy czy użytkownik przez przypadek nie musi atakować
                if(CheckForAttack(lobby, { x: j, y: i }))
                    canMove = true;
                if(CheckForQueenAttack(lobby, { x: j, y: i }))
                    canMove = true;
                if(CheckForNormalMove(lobby, { x: j, y: i }))
                    canMove = true;
            }
        }

        if(!canMove) 
        {
            lobby.winner = null;
            return true;
        }

        if(firstPlayer == 0)
        {
            lobby.winner = lobby.players[1];
            return true;
        }
        if(secondPlayer == 0)
        {
            lobby.winner = lobby.players[0];
            return true;
        }

        return false;
    },
    addExpress: (app, lobbies, gamesFunctions) => { },
    addSockets: (io, socket, lobbies, gamesFunctions) =>
    {
        socket.on('warcaby/move', async msg =>
        {
            //poruszanie się pioneczków
            const code = msg.code;
            const game = msg.game;

            const pawn = msg.pawn;
            const pos = msg.pos;

            if(code == undefined || !code)
                return socket.emit("warcaby/move/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("warcaby/move/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("warcaby/move/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("warcaby/move/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            const checkMove = CheckMove(lobby, pawn, pos);

            const pawnType = Math.abs(lobby.gameOptions.board[pawn.y][gameFunctions.alphabet[pawn.x]]);

            const normalMove = pawnType == 1 ? CheckMoveNormal(lobby, pawn, pos) : false;
            const attackMove = pawnType == 1 ? CheckMoveAttack(lobby, pawn, pos) : false;
            
            const normalQueenMove = pawnType == 2 ? QueenMove(lobby, pawn, pos) : false;
            const attackQueenMove = pawnType == 2 ? QueenMoveAttack(lobby, pawn, pos) : false;

            let canAttack = false;
            for (let i = 0; i < lobby.gameOptions.board.length; i++) 
                for (let j = 0; j < Object.keys(lobby.gameOptions.board[i]).length; j++) 
                {
                    if(CheckForAttack(lobby, { x: j, y: i }))
                        canAttack = true;
                    if(CheckForQueenAttack(lobby, { x: j, y: i }))
                        canAttack = true;
                }

            switch (pawnType) 
            {
                case 1:
                    if(canAttack && !attackMove)
                        return socket.emit("warcaby/move/res", { status: "error", message: "Nieprawidłowy ruch, musisz atakować!" });

                    if(!checkMove || (!normalMove && !attackMove))
                        return socket.emit("warcaby/move/res", { status: "error", message: "Nieprawidłowy ruch" });
                break;
                case 2:
                    if(canAttack && !attackQueenMove)
                        return socket.emit("warcaby/move/res", { status: "error", message: "Nieprawidłowy ruch, musisz atakować!" });

                    if(!checkMove || (!normalQueenMove || GetQuenMovePositions(lobby, pawn, pos).length > 1))
                        return socket.emit("warcaby/move/res", { status: "error", message: "Nieprawidłowy ruch" });
                break;
            }

            let attack = undefined;

            if(!normalMove && pawnType == 1)
            {
                if(lobby.queue == 0)
                {
                    const xPos = pawn.x - (pawn.x - pos.x) / 2;
                    const yPos = pawn.y - (pawn.y - pos.y) / 2;

                    attack = { x: xPos, y: yPos };

                    lobby.gameOptions.board[yPos][gameFunctions.alphabet[xPos]] = 0;
                }
                else
                {
                    const xPos = pawn.x - (pawn.x - pos.x) / 2;
                    const yPos = pawn.y - (pawn.y - pos.y) / 2;
                    
                    attack = { x: xPos, y: yPos };
                    
                    lobby.gameOptions.board[yPos][gameFunctions.alphabet[xPos]] = 0;
                }
            }
            //pioneczek królowej
            const positions = GetQuenMovePositions(lobby, pawn, pos);
            if(attackQueenMove && pawnType == 2)
            {
                attack = positions[0];

                lobby.gameOptions.board[attack.y][gameFunctions.alphabet[attack.x]] = 0;
            }
            
            gameFunctions.movePawn(lobby.gameOptions.board, pawn, pos);

            if(lobby.queue == 0)
            {
                if(pos.y == 0 && lobby.gameOptions.board[pos.y][gameFunctions.alphabet[pos.x]] == 1)
                    lobby.gameOptions.board[pos.y][gameFunctions.alphabet[pos.x]] = 2;
            } 
            else
            {
                if (pos.y == lobby.gameOptions.board.length - 1 && lobby.gameOptions.board[pos.y][gameFunctions.alphabet[pos.x]] == -1) 
                    lobby.gameOptions.board[pos.y][gameFunctions.alphabet[pos.x]] = -2;
            }

            canAttack = false;
            switch (pawnType) 
            {
                case 1:
                    canAttack = CheckForAttack(lobby, pos);

                    if(normalMove || !canAttack)
                        gamesFunctions.nextPlayer(lobby);
                break;
                case 2:
                    canAttack = CheckForQueenAttack(lobby, pos);

                    if(!attackQueenMove || !canAttack)
                        gamesFunctions.nextPlayer(lobby);
                break;
            }

            const turn = lobby.players[lobby.queue];
            
            return io.to(`${game}#${code}`).emit("warcaby/move/res", { status: "ok", message: "Nastepna osoba", additional: { pawn, pos, turn, pawnI: lobby.gameOptions.board[pos.y][gameFunctions.alphabet[pos.x]], attack: attack } });
        });
    }
}
//czy może się ruszyć
function CheckMove(lobby, pawn, pos)
{
    if(!gameFunctions.checkPawnMove(lobby.gameOptions.board.length, Object.keys(lobby.gameOptions.board[0]).length, pawn, pos))
        return false;
        
    if(lobby.gameOptions.board[pos.y][gameFunctions.alphabet[pos.x]] != 0)
        return false;
    
    if(lobby.queue == 0)
    {
        if(lobby.gameOptions.board[pawn.y][gameFunctions.alphabet[pawn.x]] <= 0) //gracz jeden 
            return false;
    }
    else
    {
        if(lobby.gameOptions.board[pawn.y][gameFunctions.alphabet[pawn.x]] >= 0) //gracz dwa 
            return false;
    }

    return true;
}

function CheckMoveNormal(lobby, pawn, pos)
{
    if(!CheckMove(lobby, pawn, pos))
        return false;

    if(lobby.queue == 0)
    {
        if(pawn.y != pos.y + 1 || (pawn.x != pos.x - 1 && pawn.x != pos.x + 1))
            return false;
    }
    else
    {
        if(pawn.y != pos.y - 1 || (pawn.x != pos.x - 1 && pawn.x != pos.x + 1))
            return false;
    }

    return true;
}

function CheckMoveAttack(lobby, pawn, pos)
{
    const xPos = pawn.x - (pawn.x - pos.x) / 2;
    const yPos = pawn.y - (pawn.y - pos.y) / 2;

    if(Math.round(xPos) != xPos || Math.round(yPos) != yPos)
        return false;

    if(!CheckMove(lobby, pawn, pos))
        return false;

    if((pawn.y != pos.y - 2 && pawn.y != pos.y + 2) || (pawn.x != pos.x - 2 && pawn.x != pos.x + 2))
        return false;

    if(lobby.queue == 0)
    {
        if(lobby.gameOptions.board[yPos][gameFunctions.alphabet[xPos]] >= 0)
            return false;
    }
    else
    {
        if(lobby.gameOptions.board[yPos][gameFunctions.alphabet[xPos]] <= 0)
            return false;
    }

    return true;
}

function CheckForNormalMove(lobby, pawn)
{
    if(lobby.queue == 0)
    {
        if(!CheckMoveNormal(lobby, pawn, { x: pawn.x + 1, y: pawn.y - 1 }) && !CheckMoveNormal(lobby, pawn, { x: pawn.x - 1, y: pawn.y - 1 }))
            return false;
    }
    else
    {
        if(!CheckMoveNormal(lobby, pawn, { x: pawn.x + 1, y: pawn.y + 1 }) && !CheckMoveNormal(lobby, pawn, { x: pawn.x - 1, y: pawn.y + 1 }))
            return false;
    }

    return true;
}
function CheckForAttack(lobby, pos)
{
    if(!CheckMoveAttack(lobby, pos, { x: pos.x - 2, y: pos.y - 2 }) 
    && !CheckMoveAttack(lobby, pos, { x: pos.x + 2, y: pos.y - 2 })
    && !CheckMoveAttack(lobby, pos, { x: pos.x - 2, y: pos.y + 2 }) 
    && !CheckMoveAttack(lobby, pos, { x: pos.x + 2, y: pos.y + 2 }))
        return false;

    return true;
}
//ruch damki
function QueenMove(lobby, pawn, pos)
{
    const moveX = pawn.x - pos.x;
    const moveY = pawn.y - pos.y;
    
    if(Math.abs(moveX) != Math.abs(moveY)) return false;
    
    return true;
}
//pobieramy sobie pozycje naszej damki
function GetQuenMovePositions(lobby, pawn, pos)
{
    const moveX = pawn.x - pos.x;
    const moveY = pawn.y - pos.y;

    let backX = 1;
    let backY = 1;

    if(moveX > 0)
        backX = -1;
    if(moveY > 0)
        backY = -1;
    
    let positions = new Array();
    let x = pawn.x + backX;
    let y = pawn.y + backY;
    while (x != pos.x && y != pos.y)
    {
        if(!CheckMove(lobby, pawn, pos))
            return [];

        if(lobby.queue == 0)
        {
            if(lobby.gameOptions.board[y][gameFunctions.alphabet[x]] > 0) 
                return [];
        }
        else
        {
            if(lobby.gameOptions.board[y][gameFunctions.alphabet[x]] < 0) 
                return [];
        }

        if(lobby.gameOptions.board[y][gameFunctions.alphabet[x]])
            positions.push({ x, y });
        
        x += backX;
        y += backY;
    }

    return positions;
}
//atakowanie damki
function QueenMoveAttack(lobby, pawn, pos)
{
    const movePositions = GetQuenMovePositions(lobby, pawn, pos);

    if(movePositions.length != 1) return false;
    
    return true;
}
function CheckForQueenAttack(lobby, pawn)
{
    if(Math.abs(lobby.gameOptions.board[pawn.y][gameFunctions.alphabet[pawn.x]]) != 2)
        return false;

    const dictionary = [{ x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }];

    for (let i = 0; i < dictionary.length; i++) 
    {
        const backX = dictionary[i].x;
        const backY = dictionary[i].y;

        let x = pawn.x + backX;
        let y = pawn.y + backY;

        while (true)
        {
            if(GetQuenMovePositions(lobby, pawn, { x: x, y: y}).length == 1) return true;

            if(!gameFunctions.checkPawnMove(lobby.gameOptions.board.length, lobby.gameOptions.board.length, pawn, { x: x, y: y }))
                break;
            if(GetQuenMovePositions(lobby, pawn, { x: x, y: y}).length > 1) 
                break;
            
            x += backX;
            y += backY;
        }
    }

    return false;
}