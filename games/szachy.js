require('dotenv').config();

const { Chess } = require('chess.js');
const gameFunctions = require('../functions/gameMisc');

module.exports = {
    getStartingOptions: () =>
    {
        const chess = new Chess();

        const options = { chess: chess, board: chess.board(), maxPlayers: 2 };

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

        const chess = lobby.gameOptions.chess;

        const checkmate = chess.isCheckmate();
        const stalemate = chess.isStalemate();
        const draw = chess.isDraw();
        const repetition = chess.isThreefoldRepetition();
        const insufficient = chess.isInsufficientMaterial();
        
        if(checkmate)
        {
            lobby.winner = lobby.players[lobby.queue == 0 ? 1 : 0];
            return true;
        }
        if(stalemate || draw || repetition || insufficient)
        {
            lobby.winner = null;
            return true;
        }
    },
    addExpress: (app, lobbies, gamesFunctions) => { },
    addSockets: (io, socket, lobbies, gamesFunctions) =>
    {
        //ruszanie się pionkami
        socket.on('szachy/move', async msg =>
        {
            const code = msg.code;
            const game = msg.game;

            const pawn = msg.pawn;
            const pos = msg.pos;

            if(code == undefined || !code)
                return socket.emit("szachy/move/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("szachy/move/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);
            
            if(!lobby.started)
                return socket.emit("szachy/move/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("szachy/move/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            const pawnSquare = `${gameFunctions.alphabet[pawn.x]}${pawn.y}`;
            let posSquare = `${gameFunctions.alphabet[pos.x]}${pos.y}`;

            const chess = lobby.gameOptions.chess;

            const moves = chess.moves({ square: pawnSquare });

            if(!moves.some(move => move.includes("O-O")))
            {
                if(!moves.some(move => move.includes(posSquare)))
                    return socket.emit("szachy/move/res", { status: "error", message: "Nieprawidłowy ruch" });
            }
            else
            {
                if(!moves.some(move => move.includes(posSquare)))
                {
                    if(!Castle(lobby, pos))
                        return socket.emit("szachy/move/res", { status: "error", message: "Nieprawidłowy ruch" });
                    else
                        posSquare = "O-O";
                }
            }
            
            const move = moves.find(move => move.includes(posSquare));
            if(move.includes('='))
                return socket.emit("szachy/pawnOnEnd", { status: "ok", message: "Wybierz piona", additional: { pawn: pawnSquare, move: move.split('=')[0] } });

            chess.move(move);

            lobby.gameOptions.board = chess.board();

            gamesFunctions.nextPlayer(lobby);

            const turn = lobby.players[lobby.queue];

            return io.to(`${game}#${code}`).emit("szachy/move/res", { status: "ok", message: "Nastepna osoba", additional: { board: lobby.gameOptions.board, turn } });
        });

        socket.on('szachy/choosePawn', async msg =>    //użytkonik sobie pioneczek wybiera jaki chce zamiast tego normalnego
        {
            const code = msg.code;
            const game = msg.game;

            const choice = msg.choice;
            const pawn = msg.pawn;
            const move = msg.move;

            if(code == undefined || !code)
                return socket.emit("szachy/choosePawn/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("szachy/choosePawn/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);
            
            const chess = lobby.gameOptions.chess;

            if(!lobby.started)
                return socket.emit("szachy/choosePawn/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("szachy/choosePawn/res", { status: "error", message: "Nie twoja kolej kolego" });

            const moves = chess.moves({ square: pawn });

            if(!moves.some(gMove => gMove.includes(`${move}=${choice}`)))
                return socket.emit("szachy/choosePawn/res", { status: "error", message: "Nie możesz tego zrobić" });

            chess.move(`${move}=${choice}`);
            lobby.gameOptions.board = chess.board();

            gamesFunctions.nextPlayer(lobby);

            const turn = lobby.players[lobby.queue];

            return io.to(`${game}#${code}`).emit("szachy/move/res", { status: "ok", message: "Nastepna osoba", additional: { board: lobby.gameOptions.board, turn } });
        });
    }
}
//roszada
function Castle(lobby, pos)
{
    if(lobby.queue == 0)
    {
        if(pos.x == 6 && pos.y == 1) 
            return true;
        else if(pos.x == 2 && pos.y == 1)
            return true;
        else
            return false;
    }

    if(pos.x == 2 && pos.y == lobby.gameOptions.board.length)
        return true;
    else if(pos.x == 6 && pos.y == lobby.gameOptions.board.length)
        return true;
    else
        return false;
}