const misc = require('../functions/misc');
const userFunctions = require('../functions/user');
const gameFunctions = require('../functions/games');
const { gamesFunctions } = require('../functions/games');

const gameFiles = gameFunctions.getAllGames(false);

const lobbies = { };
let users = new Array();

gameFiles.forEach(file => lobbies[file] = new Array());

let gIo = undefined;

setInterval(() => 
{
    for (const file of gameFiles)
    {
        const game = lobbies[file];

        game.forEach(lobby =>
        {
            if(!lobby.started) return;

            gameFunctions.gamesFunctions[file.replace('.js', '')].addInterval(lobby, gameFunctions);

            if(lobby.winner === undefined) return;

            console.log(`${file}#${lobby.code}`)

            gIo.to(`${file}#${lobby.code}`).emit("gameWin", { status: "ok", message: { winner: lobby.winner } });

            const config = gameFunctions.getStartingConfig(file.replace('.js', ''), lobby.code, lobby.host, lobby.options, { chat: lobby.chat, players: lobby.players });
            for (const key in lobby)
                lobby[key] = config[key];
        });
    }
}, 1000);

module.exports = 
{
    express: (app) =>
    {
        for (const file of gameFiles)
        {
            app.get(`/${file}(/:id)?`, async (req, res) =>
            {
                if(req.params.id == undefined || !req.params.id)
                    return res.render('lobby', { games: gameFiles, game: file, lobbies: lobbies[file] });

                if(!lobbies[file].some(lobby => lobby.code == req.params.id))
                    return res.redirect(`/${file}`);

                const game = JSON.parse(JSON.stringify(lobbies[file].find(games => games.code == req.params.id)));
                delete game.gameOptions.secret;

                let user = await userFunctions.getUserOrGuest(req);
                const inGame = game.players.some(player => JSON.stringify(player) == JSON.stringify(user));
                
                let playerIndex = -1;
                for (let i = 0; i < game.players.length; i++) 
                {
                    const player = game.players[i];

                    if(JSON.stringify(player) != JSON.stringify(await userFunctions.getUserOrGuest(req))) continue;

                    playerIndex = i;
                }

                let logged = await userFunctions.logged(req);
                let currUser = undefined;
                if(logged)
                    currUser = await userFunctions.getUser({ name: req.session.user.name });

                res.render(`games/${file}`, { layout: 'layouts/gameLayout', gameName: file, games: gameFiles, logged: logged, currUser, lobby: game, isHost: JSON.stringify(game.host) == JSON.stringify(user), inGame: inGame, playerIndex: playerIndex });
            });
            app.get(`/api/info/${file}(/:id)`, async (req, res) =>
            {
                if(req.params.id == undefined || !req.params.id)
                    return res.json({ status: "error", message: 'Taka gra nie istnieje' });

                if(!lobbies[file].some(lobby => lobby.code == req.params.id))
                    return res.json({ status: "error", message: 'Takie lobby nie istnieje' });

                const game = JSON.parse(JSON.stringify(lobbies[file].find(games => games.code == req.params.id)));
                delete game.gameOptions.secret;

                let playerIndex = -1;
                for (let i = 0; i < game.players.length; i++) 
                {
                    const player = game.players[i];

                    if(JSON.stringify(player) != JSON.stringify(await userFunctions.getUserOrGuest(req))) continue;

                    playerIndex = i;
                }

                res.json({ status: 'ok', message: { game: game, playerIndex: playerIndex } });
            });
        }

        app.post("/createLobby", async (req, res) =>
        {
            const logged = await userFunctions.logged(req);

            const game = req.body.name;
            if(!(game in lobbies)) 
                return res.json({ status: "error", message: 'Taka gra nie istnieje' });
            
            let code = misc.numberGen(6);
            while(lobbies[game].some(lobby => lobby.code == code))
                code = misc.numberGen(6);

            if(!logged) userFunctions.createGuest(req);

            let user = await userFunctions.getUserOrGuest(req);

            if(user.inLobby) return res.json({ status: "error", message: 'Jesteś już w lobby' });
            
            const lobbyName = req.body.lobbyName;
            if(lobbies[game].some(lobby => lobby.name == lobbyName))
                return res.json({ status: "error", message: 'Gra o takiej nazwie już istnieje' });

            const time = req.body.time;
            if(time < 60 || time > 1800)
                return res.json({ status: "error", message: 'Podałeś nieprawidłowy czas' });
                
            const public = req.body.public;
            if(public != 0 && public != 1)
                return res.json({ status: "error", message: 'Czy to ma być publiczne czy nie?' });

            lobbies[game].push(gameFunctions.getStartingConfig(game, code, user, { time: time, public: public, lobbyName: lobbyName }));
            
            if(!await gameFunctions.joinLobby(req, lobbies[game].find(lobby => lobby.code == code)))
                return res.json({ status: "error", message: 'Nie można dołączyć do lobby' });

            const link = `/${game}/${code}`;

            return res.json({ status: "ok", message: 'Lobby zostało stworzone', link: link });
        });
        
        for (const game in gameFunctions.gamesFunctions) 
        {
            gameFunctions.gamesFunctions[game].addExpress(app, lobbies[game], gameFunctions);
        }
    },
    socket: async (io, socket) =>
    {
        gIo = io;

        let req = socket.request;

        socket.on('joinRoom', async msg => 
        {
            const code = msg.code;
            const game = msg.game;

            let user = await userFunctions.getUserOrGuest(req);
            if(user != undefined)
                if(lobbies[game].find(lobby => lobby.code == code).players.some(player => player.name == user.name))
                    users.push({ user: user, room: `${game}#${code}` });

            socket.join(`${game}#${code}`);
        });

        socket.on("disconnecting", async reason => 
        {
            let user = await userFunctions.getUserOrGuest(req);
            if(!user) return;

            if(!users.some(u => u.user.name == user.name)) return;

            const game = users.find(u => u.user.name == user.name).room.split("#")[0];
            const code = users.find(u => u.user.name == user.name).room.split("#")[1];
                        
            if(!lobbies[game].some(lobby => lobby.code == code)) return;
            if(!lobbies[game].find(lobby => lobby.code == code).players.some(player => player.name == user.name))
            return;
            
            users = users.filter(u => u.user.name != user.name);

            let i = 0;
            let interval = setInterval(async () => 
            {
                if(users.some(u => u.user.name == user.name))
                    clearInterval(interval);

                i++;

                if(i < 30) return;
                
                clearInterval(interval);

                if(!lobbies[game].some(lobby => lobby.code == code)) return;

                user = await userFunctions.getUserOrGuest(req);

                await gameFunctions.leaveLobby(req, lobbies, game, lobbies[game].find(lobby => lobby.code == code))
                return io.to(`${game}#${code}`).emit("leaveLobbyRes", { status: "ok", message: { user } });
            }, 1000);
        });
        
        socket.on("isHost", async msg => 
        {
            const code = msg.code;
            const game = msg.game;
            
            if(code == undefined || !code)
                return socket.emit("isHost/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies[game].some(lobby => lobby.code == code))
                return socket.emit("isHost/res", { status: "error", message: "Takie lobby nie istnieje" });

            if(lobbies[game].find(lobby => lobby.code == code).started)
                return socket.emit("isHost/res", { status: "error", message: "Gra została rozpoczęta" });

            let user = await userFunctions.getUserOrGuest(req);
            if(user == undefined)
                return socket.emit("isHost/res", { status: "error", message: "Nie rozpoznaje cię" });

            const host = lobbies[game].find(lobby => lobby.code == code).host.name == user.name;

            return io.to(`${game}#${code}`).emit("isHost/res", { status: "ok", message: host });
        });

        socket.on('joinLobby', async msg => 
        {
            const code = msg.code;
            const game = msg.game;
            
            if(code == undefined || !code)
                return socket.emit("startGameRes", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies[game].some(lobby => lobby.code == code))
                return socket.emit("startGameRes", { status: "error", message: "Takie lobby nie istnieje" });

            if(lobbies[game].find(lobby => lobby.code == code).started)
                return socket.emit("joinLobbyRes", { status: "error", message: "Gra została rozpoczęta" });

            const logged = await userFunctions.logged(req);

            if(!logged) userFunctions.createGuest(req);

            if(!await gameFunctions.joinLobby(req, lobbies[game].find(lobby => lobby.code == code)))
                return socket.emit("joinLobbyRes", { status: "error", message: "Nie można dołączyć do lobby" });
                
            let user = await userFunctions.getUserOrGuest(req);
            if(user != undefined)
                if(lobbies[game].find(lobby => lobby.code == code).players.some(player => player.name == user.name))
                    users.push({ user: user, room: `${game}#${code}` });

            return io.to(`${game}#${code}`).emit("joinLobbyRes", { status: "ok", message: user, lobby: lobbies[game].find(lobby => lobby.code == code) });
        });
        
        socket.on('startGame', async msg => 
        {
            const code = msg.code;
            const game = msg.game;

            if(code == undefined || !code)
                return socket.emit("startGameRes", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies[game].some(lobby => lobby.code == code))
                return socket.emit("startGameRes", { status: "error", message: "Takie lobby nie istnieje" });

            const lobby = lobbies[game].find(games => games.code == code);
            
            if(lobby.players.length <= 1)
                return socket.emit("startGameRes", { status: "error", message: "Zbyt mało graczy" });

            lobby.started = true;
            
            return io.to(`${game}#${code}`).emit("startGameRes", { status: "ok", message: true, gameOptions: lobby });
        });

        socket.on('sendMessage', async msg => // odbieramy to co wysłane w game.js
        {
            const code = msg.code;
            const game = msg.game;

            if(!await userFunctions.logged(req)) userFunctions.createGuest(req);

            if(msg.text.length <= 0)
                return socket.emit("sendMessageRes", { status: "error", message: "Za krótka wiadomość" });

            let user = await userFunctions.getUserOrGuest(req);
            const message = { author: user.name, msg: msg.text };//obiekt wiadomosc 

            lobbies[game].find(lobby => lobby.code == code).chat.push(message); 

            return io.to(`${game}#${code}`).emit("sendMessageRes", { status: "ok", message: message });//wysyłam tekst
        });

        for (const game in gameFunctions.gamesFunctions) 
        {
            gameFunctions.gamesFunctions[game].addSockets(io, socket, lobbies[game], gameFunctions);
        }
    }
}
