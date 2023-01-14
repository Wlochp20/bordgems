require('dotenv').config();

const userFunctions = require('../functions/user');

const fs = require('fs');

const gamesFunctions = { };
const gameFiles = fs.readdirSync(`./games/`).filter(file => file.endsWith('.js'));
for (const file of gameFiles)
    gamesFunctions[file.replace('.js', '')] = require(`../games/${file}`);

module.exports = {
    getAllGames: (extension) =>
    {
        let gamesFiles = fs.readdirSync("./games/").filter(file => file.endsWith(".js"));
        if(!extension)
            gamesFiles = gamesFiles.map(string => string.replace(".js", ""));
        
        return gamesFiles;
    },
    gamesFunctions: gamesFunctions,
    //tworzenie lobby
    getStartingConfig: (game, code, host, options = { time: 10, public: true, lobbyName: "TEST" }, other = { }) =>
    {
        const config = { 
            code: code,
            name: options.lobbyName,
            queue: 0, 
            players: [],
            times: [], 
            chat: [], 
            started: false, 
            host: host, 
            options: options, 
            gameOptions: gamesFunctions[game].getStartingOptions(), 
            winner: undefined 
        };

        for (const key in other)
            config[key] = other[key];
        if(other.players != undefined && other.players.length > 0)
            for (let i = 0; i < other.players.length; i++)
                config.times.push(options.time);

        return config;
    },
    //dołączanie do lobby
    joinLobby: async (req, lobby) =>
    {   
        if(lobby.players.length >= lobby.gameOptions.maxPlayers)
            return false;

        if(await userFunctions.logged(req))
        {
            if(req.session.user.inLobby)
                return false;
            lobby.players.push(req.session.user);
            lobby.times.push(lobby.options.time);
            req.session.user.inLobby = true;
            req.session.save();
        }
        else
        {
            if(req.session.guest.inLobby)
                return false;
            lobby.players.push(req.session.guest);
            lobby.times.push(lobby.options.time);
            req.session.guest.inLobby = true;
            req.session.save();
        }

        return true;
    },
    leaveLobby: async (req, lobbies, game, lobby) =>
    {   
        if(await userFunctions.logged(req))
        {
            if(!req.session.user.inLobby)
                return false;
            lobby.players = lobby.players.filter(player => player.name != req.session.user.name);
            lobby.times = lobby.times.splice(lobby.players.find(player => player.name != req.session.user.name), 1);
            req.session.user.inLobby = false;
            req.session.save();
        }
        else
        {
            if(!req.session.guest || !req.session.guest.inLobby)
                return false;
            lobby.players = lobby.players.filter(player => player.name != req.session.guest.name);
            lobby.times = lobby.times.splice(lobby.players.find(player => player.name != req.session.guest.name), 1);
            req.session.guest.inLobby = false;
            req.session.save();
        }
        
        if(lobby.players.length <= 0)
        {
            lobbies[game] = lobbies[game].filter(lob => JSON.stringify(lob) != JSON.stringify(lobby));
            return true;
        }

        if(!lobby.players.some(player => player == lobby.host))
            lobby.host = lobby.players[0];

        return true;
    },
    //timer użytkowników
    lowerTime: (lobby) =>
    {
        if(!lobby.started) return;

        lobby.times[lobby.queue]--;
    },
    //który gracz ma teraz się ruszać
    isCurrentPlayer: async (req, lobby) =>
    {
        const user = await userFunctions.getUserOrGuest(req);

        return (JSON.stringify(lobby.players[lobby.queue]) == JSON.stringify(user));
    },
    nextPlayer: (lobby) =>
    {
        const playersAmount = lobby.players.length;

        lobby.queue = (lobby.queue + 1) % playersAmount;
        while (lobby.times[lobby.queue] <= 0)
            lobby.queue = (lobby.queue + 1) % playersAmount;
    },
    //sprawdzanie czy ziomeczki sobie grają
    checkPlayers: (lobby) =>
    {
        if(!lobby.started) return 2022;
        
        const playersAmount = lobby.players.length;

        let amount = 0;
        lobby.times.forEach(time => 
        {
            if(time <= 0)
            {
                while(lobby.times[lobby.queue] <= 0)
                    lobby.queue = (lobby.queue + 1) % playersAmount;
                return;
            }

            amount++;    
        });
        
        return amount;
    }
}