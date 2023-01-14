require('dotenv').config();

const gameFunctions = require('../functions/gameMisc');
const userFunctions = require('../functions/user');
const misc = require('../functions/misc');

const cloneDeep = require('lodash.clonedeep')

/*
    typy:
    1 - nieruchomość
    2 - wyspa
    3 - szansa
    4 - wiezienie
    5 - mistrzostwa
    6 - start
    7 - podróż
    8 - podatek
*/

const colors = { "W": "#28991E", "P": "#D73822", "S": "#2D40E8", "G": "#FFE156", "H": "#70D068", "A": "#FA5D5D", "F": "#7433FF", "N": "#E9A800" };

// Wszystkie posiadłości znajdujące się na planszy
const properties = new Array();

// Włoszech
properties.push(CreateProperty("Rzym", [2, 25, 50, 75, 150], [60, 110, 160, 210, 360], 'W'));
properties.push(CreateProperty("Mediolan", [2, 28, 55, 83, 165], [60, 110, 160, 210, 360], 'W'));
properties.push(CreateProperty("Neapol", [4, 30, 60, 90, 180], [60, 110, 160, 210, 360], 'W'));

// Wyspa nr. 1
properties.push(CreateIsland("Majorka"));

// Polska
properties.push(CreateProperty("Wadowice", [6, 33, 75, 105, 210], [100, 150, 200, 250, 400], 'P'));
properties.push(CreateProperty("Warszawa", [6, 35, 75, 105, 210], [100, 150, 200, 250, 400], 'P'));
properties.push(CreateProperty("Gliwice", [8, 38, 75, 113, 225], [120, 170, 220, 270, 420], 'P'));

// Szwecja
properties.push(CreateProperty("Sztokholm", [10, 70, 140, 210, 385], [140, 240, 340, 440, 690], 'S'));
properties.push(CreateProperty("Gotenberg", [10, 75, 150, 225, 413], [140, 240, 340, 440, 690], 'S'));
properties.push(CreateProperty("Malmo", [12, 80, 160, 240, 440], [160, 260, 360, 460, 710], 'S'));

// Grecja (część 1)
properties.push(CreateProperty("Ateny", [14, 85, 170, 255, 468], [180, 280, 380, 480, 730], 'G'));

// Wyspa nr. 2
properties.push(CreateIsland("Ibiza"));

// Grecja (część 2)
properties.push(CreateProperty("Saloniki", [16, 90, 180, 270, 495], [200, 300, 400, 500, 750], 'G'));

// Hiszpania (część 1)
properties.push(CreateProperty("Madryt", [18, 113, 225, 338, 619], [220, 370, 520, 670, 1045], 'H'));

// Wyspa nr. 3
properties.push(CreateIsland("Kreta"));

// Hiszpania (część 2)
properties.push(CreateProperty("Barcelona", [20, 120, 240, 360, 660], [240, 390, 540, 690, 1065], 'H'));

// Anglia
properties.push(CreateProperty("Londyn", [22, 128, 255, 383, 701], [260, 410, 560, 710, 1085], 'A'));
properties.push(CreateProperty("Brighton", [22, 135, 270, 405, 743], [260, 410, 560, 710, 1085], 'A'));
properties.push(CreateProperty("Oksford", [24, 143, 285, 428, 784], [280, 430, 590, 730, 1105], 'A'));

// Wyspa nr. 4
properties.push(CreateIsland("Zakintos"));

// Francja
properties.push(CreateProperty("Paryż", [26, 170, 340, 510, 935], [300, 500, 700, 900, 1400], 'F'));
properties.push(CreateProperty("Marsylia", [28, 180, 360, 540, 990], [320, 520, 720, 920, 1420], 'F'));

// Niemcy
properties.push(CreateProperty("Hamburg", [35, 190, 380, 570, 1045], [350, 550, 750, 950, 1450], 'N'));
properties.push(CreateProperty("Berlin", [50, 200, 400, 600, 1100], [370, 570, 770, 970, 1470], 'N'));


//zwykła posiadłość
function CreateProperty(name, rent, prices, country)
{
    const property = {
        name: name,
        type: 1,
        additional: {
            rent: rent,
            prices: prices,
            color: colors[country],
            country: country,
            amountLodges: -1,
            multiplier: 1,
            electricityOff: 0,
            isFestival: false,
            isChampions: false,
            owner: undefined
        },
        standFunc: (io, socket, lobby, newPosition, gamesFunctions) => PropertyStand(io, socket, lobby, newPosition, gamesFunctions)
    }

    return property;
}
//wyspy
function CreateIsland(name)
{
    const island = {
        name: name,
        type: 2,
        additional: {
            rent: [25, 50, 100, 200],
            prices: [200],
            amountLodges: -1,
            multiplier: 1,
            electricityOff: 0,
            isFestival: false,
            isChampions: false,
            owner: undefined
        },
        standFunc: (io, socket, lobby, newPosition, gamesFunctions) => IslandStand(io, socket, lobby, newPosition, gamesFunctions)
    }

    return island;
}

/*
    typy:
    1 - niezachowywalna
    2 - zachowywalna
*/

// Wszystkie karty szansy znajdujące się w grze
const chances = new Array();

chances.push(CreateChance(1, "Losowe miasto", "Wybierz losowe miasto do, którego chcesz się udać", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    const possiblePos = lobby.gameOptions.board.filter(field => field.type <= 2);
    
    const pos = possiblePos[Math.floor(misc.random(0, possiblePos.length - 1))];
    newPosition = lobby.gameOptions.board.indexOf(pos);

    lobby.gameOptions.board[newPosition].standFunc(io, socket, lobby, newPosition, gamesFunctions);

    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Pobierasz pieniądze", "Otrzymujesz dodatkowe środki", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    const money = Math.floor(misc.random(10, 100)) * 1000;

    lobby.gameOptions.money[lobby.queue] += money;

    return { canGo: { move: false, stand: false }, newPosition };
}));
chances.push(CreateChance(1, "Płacisz pieniądze", "Opłacasz dodatkowy podatek", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    let money = Math.floor(misc.random(10, 100)) * 1000;

    const good = RemoveMoney(socket, lobby, money);
    lobby.gameOptions.money[lobby.queue] += money;
    
    if(lobby.gameOptions.nextPlayer && good)
        gamesFunctions.nextPlayer(lobby);
    else if(!good)
        lobby.gameOptions.stopped = true;

    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Pobierz od każdego gracza", "Pobierasz dodatkowe środki od przeciwników", 
(io, socket, lobby, newPosition, gamesFunctions) =>
{
    const amount = (90 / (lobby.players.length - 1)) * 1000;

    const good = !lobby.gameOptions.money.some(money => money < amount)

    return good;
},
(io, socket, lobby, newPosition, gamesFunctions) =>
{
    const amount = (90 / (lobby.players.length - 1)) * 1000;

    for (let i = 0; i < lobby.gameOptions.money.length; i++) 
    {
        if(i == lobby.queue) continue;

        lobby.gameOptions.money[i] -= amount;
    }

    lobby.gameOptions.money[lobby.queue] += 90000;

    return { canGo: { move: false, stand: false }, newPosition };
}));
chances.push(CreateChance(1, "Idziesz do tyłu", "Cofasz się do tyłu", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    const amount = Math.floor(misc.random(1, 4));

    newPosition -= amount;
    
    lobby.gameOptions.board[newPosition].standFunc(io, socket, lobby, newPosition, gamesFunctions);
    
    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Płacisz podatek", "Musisz zapłacić podatek", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    let propertyMoney = 0;
    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
    {
        if(lobby.gameOptions.board[i].type > 2) continue;

        if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
        {
            if(lobby.gameOptions.board[i].type == 1)
                propertyMoney += lobby.gameOptions.board[i].additional.prices[lobby.gameOptions.board[i].additional.amountLodges] * 1000;
            else if(lobby.gameOptions.board[i].type == 2)
                propertyMoney += lobby.gameOptions.board[i].additional.prices[0] * 1000;
        }
    }

    const tax = propertyMoney * .1;
    
    const good = RemoveMoney(socket, lobby, tax);

    if(lobby.gameOptions.nextPlayer && good)
        gamesFunctions.nextPlayer(lobby);
    else if(!good)
        lobby.gameOptions.stopped = true;

    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Płacisz każdemu graczowi", "Musi zapłacić każdemu ze swoich przewciwników", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    let amount = (90 / (lobby.players.length - 1)) * 1000;
    
    const good = RemoveMoney(socket, lobby, 90000);

    let propertyMoney = 0;
    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
    {
        if(lobby.gameOptions.board[i].type > 2) continue;

        if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
        {
            if(lobby.gameOptions.board[i].type == 1)
                propertyMoney += lobby.gameOptions.board[i].additional.prices[lobby.gameOptions.board[i].additional.amountLodges] * 1000;
            else if(lobby.gameOptions.board[i].type == 2)
                propertyMoney += lobby.gameOptions.board[i].additional.prices[0] * 1000;
        }
    }

    amount = Math.min(amount, propertyMoney + lobby.gameOptions.money[lobby.queue]);

    for (let i = 0; i < lobby.gameOptions.money.length; i++) 
    {
        if(i == lobby.queue) continue;

        lobby.gameOptions.money[i] += amount;
    }

    if(lobby.gameOptions.nextPlayer && good)
        gamesFunctions.nextPlayer(lobby);
    else if(!good)
        lobby.gameOptions.stopped = true;

    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Wyłącz prąd", "Wyłącz prąd w jednej z nieruchomości twoich przeciwników", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    const properties = new Array();
    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
    {
        if(lobby.gameOptions.board[i].type > 2) continue;

        if(lobby.gameOptions.board[i].additional.owner != undefined && lobby.gameOptions.board[i].additional.owner != lobby.queue)
            properties.push(i);
    }

    if(properties.length > 0)
    {
        socket.emit("polymoly/chanceDestroy", { status: "ok", message: "Wybierz gdzie chcesz wyłączyć prąd", additional: { properties } });

        lobby.gameOptions.stopped = true;
        lobby.gameOptions.chanceDestroy = 1;
    }
    else if(lobby.gameOptions.nextPlayer)
        gamesFunctions.nextPlayer(lobby);

    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Zniszcz budynek", "Zniszcz wybrany budynek przeciwnika", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    const properties = new Array();
    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
    {
        if(lobby.gameOptions.board[i].type > 1) continue;

        if(lobby.gameOptions.board[i].additional.owner != undefined && lobby.gameOptions.board[i].additional.owner != lobby.queue)
            properties.push(i);
    }

    if(properties.length > 0)
    {
        socket.emit("polymoly/chanceDestroy", { status: "ok", message: "Wybierz gdzie chcesz zniszczyć budynek", additional: { properties } });

        lobby.gameOptions.stopped = true;
        lobby.gameOptions.chanceDestroy = 2;
    }
    else if(lobby.gameOptions.nextPlayer)
        gamesFunctions.nextPlayer(lobby);
    
    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Zniszcz posiadłość", "Zniszcz wybrane, miasto przeciwnika", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    const properties = new Array();
    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
    {
        if(lobby.gameOptions.board[i].type > 2) continue;

        if(lobby.gameOptions.board[i].additional.owner != undefined && lobby.gameOptions.board[i].additional.owner != lobby.queue)
            properties.push(i);
    }

    if(properties.length > 0)
    {
        socket.emit("polymoly/chanceDestroy", { status: "ok", message: "Wybierz gdzie chcesz zniszczyć posiadłość", additional: { properties } });

        lobby.gameOptions.stopped = true;
        lobby.gameOptions.chanceDestroy = 3;
    }
    else if(lobby.gameOptions.nextPlayer)
        gamesFunctions.nextPlayer(lobby);

    return { canGo: { move: false, stand: true }, newPosition };
}));
chances.push(CreateChance(1, "Idziesz na pole specjalne", "Wybierz pole specjalne(start, podróż, więzeienie, mistrzostwa świata), na które chcesz się udać", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    const possible = [8, 16, 24];

    const random = Math.floor(Math.random() * possible.length);
    newPosition = possible[random];

    return lobby.gameOptions.board[newPosition].standFunc(io, socket, lobby, newPosition, gamesFunctions);
}));
chances.push(CreateChance(2, "Ucieknij z więzienia", "Tą karte zachowaj na później, pozwoli Ci bezpłatnie opuścić więzienie ", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    lobby.gameOptions.cards[lobby.queue].push({ card: 0, name: "Ucieknij z więzienia" });

    return { canGo: { move: false, stand: false }, newPosition };
}));
chances.push(CreateChance(2, "Rabat na następne płacenie", "Następny czynsz, który będziesz musiał opłacić przeciwnikowi zostanie zmniejszony o ... %", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    lobby.gameOptions.cards[lobby.queue].push({ card: 1, name: "Rabat na następne płacenie" });

    return { canGo: { move: false, stand: false }, newPosition };
}));
chances.push(CreateChance(2, "Podwyżka na następne płacenie", "Następny czynsz, który będziesz musiał opłacić przeciwnikowi zostanie zwiększony o ... %", null, (io, socket, lobby, newPosition, gamesFunctions) =>
{
    lobby.gameOptions.cards[lobby.queue].push({ card: 2, name: "Podwyżka na następne płacenie" });

    return { canGo: { move: false, stand: false }, newPosition };
}));

function CreateChance(type, name, description, condition, func)
{
    const chance = {
        type: type,
        name: name,
        description: description,
        condition: condition,
        func: func
    }

    return chance;
}

module.exports = {
    //generowanie planszy
    getStartingOptions: () =>
    {
        const board = GenerateBoard();

        const options = { board, maxPlayers: 4, stopped: false, chanceDestroy: 0, nextPlayer: true, lastPlayer: -1, threwStart: [false, false, false, false], bankrupcy: [0, 0, 0, 0], positions: [0, 0, 0, 0], onField: [6, 6, 6, 6], inJail: [0, 0, 0, 0], money: [2000000, 2000000, 2000000, 2000000], cards: [[], [], [], []], trade: undefined };

        return options;
    },
    addInterval: (lobby, gamesFunctions) =>
    {        
        gamesFunctions.lowerTime(lobby);    //czas gry

        if(gamesFunctions.checkPlayers(lobby) == 1)
        {
            lobby.winner = lobby.players[lobby.queue];
            return true;
        }
        //sprawdzanie czy użytkownik posiada monopol
        for (let i = 0; i < lobby.players.length; i++) 
        {
            let islandsAmount = 0;
            let monopols = 0;
            for (let j = 0; j < lobby.gameOptions.board.length; j++) 
            {
                const field = lobby.gameOptions.board[j];

                if(field.type > 2) continue;
                if(field.additional.owner == undefined) continue;

                if(field.type == 2 && field.additional.owner == j) 
                    islandsAmount++;

                if(field.type != 1) continue;

                let monopol = true;
                for (let b = 0; b < lobby.gameOptions.board.length; b++) 
                {
                    const fieldB = lobby.gameOptions.board[b];
                    
                    if(fieldB.type > 1) continue;
                    if(fieldB.additional.country != field.additional.country) continue;
                    if(fieldB.additional.owner == field.additional.owner) continue;

                    monopol = false;
                }

                if(monopol)
                    monopols++;
            }
            //jeżeli użytkownik posiada wszystkie wyspy -> wygrywa
            if(islandsAmount >= 4)
            {
                lobby.winner = lobby.players[i];
                return true;
            }
            //jeżeli użytkownik posiada 3 monopole -> wygrywa
            if(monopols >= 3)
            {
                lobby.winner = lobby.players[i];
                return true;
            }
        }
    },
    addExpress: (app, lobbies, gamesFunctions) => 
    { 
        //obsługa lobby
        app.post('/api/polymoly/getTradables', async (req, res) =>
        {
            const code = req.body.code;
            const game = req.body.game;
            const playerIndex = parseInt(req.body.playerI);

            if(code == undefined || !code)
                return res.json({ status: 'error', message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return res.json({ status: 'error', message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return res.json({ status: 'error', message: "Gra nie rozpoczęta" });
                
            if(!await gamesFunctions.isCurrentPlayer(req, lobby))
                return res.json({ status: 'error', message: "Nie twoja kolej kolego" });
                
            if(lobby.gameOptions.stopped)
                return res.json({ status: 'error', message: "Musisz poczekać" });

            if(playerIndex < 0 || playerIndex > lobby.players.length - 1)
                return res.json({ status: 'error', message: "Nieprawidłowy gracz" });
                
            if(lobby.queue == playerIndex)
                return res.json({ status: 'error', message: "Nie możesz siebie wskazać" });

            const playerTradables = new Array();
            const reqPlayerTradables = new Array();
            for (let i = 0; i < lobby.gameOptions.board.length; i++) 
            {
                if(lobby.gameOptions.board[i].type > 2) continue;

                if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
                    reqPlayerTradables.push({ type: 1, tradable: lobby.gameOptions.board[i], index: i });
                if(lobby.gameOptions.board[i].additional.owner == playerIndex)
                    playerTradables.push({ type: 1, tradable: lobby.gameOptions.board[i], index: i });
            }
            for (let i = 0; i < lobby.gameOptions.cards[lobby.queue].length; i++) 
                reqPlayerTradables.push({ type: 2, tradable: lobby.gameOptions.cards[lobby.queue][i], index: i });
            for (let i = 0; i < lobby.gameOptions.cards[playerIndex].length; i++) 
                playerTradables.push({ type: 2, tradable: lobby.gameOptions.cards[playerIndex][i], index: i });

            return res.json({ status: 'ok', message: { reqPlayerTradables, playerTradables } });
        });
    },
    addSockets: (io, socket, lobbies, gamesFunctions) =>
    {
        socket.on('polymoly/move', async msg =>
        {
            //poruszanie się użytkownika
            const code = msg.code;
            const game = msg.game;
            const choice = msg.choice;

            if(code == undefined || !code)
                return socket.emit("polymoly/move/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("polymoly/move/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("polymoly/move/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("polymoly/move/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            if(lobby.gameOptions.stopped)
                return socket.emit("polymoly/move/res", { status: "error", message: "Musisz poczekać" });
            
            let additional = {  };

            const pawnI = lobby.queue;
            additional.pawnI = pawnI;

            let oldPosition = lobby.gameOptions.positions[pawnI];
            let newPosition = 0;

            let standFunc = undefined;

            let firstDice = Math.floor(misc.random(1, 6));
            let secondDice = Math.floor(misc.random(1, 6));

            const electricity = new Array();
            if(lobby.gameOptions.lastPlayer != lobby.queue)
            {
                lobby.gameOptions.board.forEach(field => 
                {
                    if(field.type > 2) return;
                    if(field.additional.electricityOff == 0) return;

                    field.additional.electricityOff--;
                    electricity.push({ index: lobby.gameOptions.board.indexOf(field), amount: field.additional.electricityOff })
                });
            }

            additional.electricity = electricity;
            //obsługa pól, co użytkownik może gdzie zrobić
            lobby.gameOptions.nextPlayer = true;
            switch(lobby.gameOptions.onField[pawnI])
            {
                case 4:
                    if(choice < 0 && choice > 2)
                        return socket.emit("polymoly/move/res", { status: "error", message: "Nie możesz tego wybrać" });
                    
                    if(choice == 0)
                    {
                        if(firstDice != secondDice && lobby.gameOptions.inJail[lobby.queue] > 0)
                        {
                            newPosition = oldPosition;
                            lobby.gameOptions.inJail[lobby.queue]--;
                        }
                        if(firstDice == secondDice || lobby.gameOptions.inJail[lobby.queue] <= 0)
                        {
                            newPosition = (oldPosition + firstDice + secondDice) % lobby.gameOptions.board.length;
                            lobby.gameOptions.inJail[lobby.queue] = 0;
                        }
                    }
                    else if(choice == 1)
                    {
                        if(lobby.gameOptions.money[lobby.queue] < 200000)
                            return socket.emit("polymoly/move/res", { status: "error", message: "Nie masz tyle pieniędzy" });
                            
                        lobby.gameOptions.money[lobby.queue] -= 200000;
                        
                        newPosition = (oldPosition + firstDice + secondDice) % lobby.gameOptions.board.length;
                        lobby.gameOptions.inJail[lobby.queue] = 0;
                    }
                    else if(choice == 2)
                    {
                        if(!lobby.gameOptions.cards[lobby.queue].some(card => card.card == 0))
                            return socket.emit("polymoly/move/res", { status: "error", message: "Nie masz karty ucieczki" });
                            
                        const index = lobby.gameOptions.cards[lobby.queue].findIndex(card => card.card == 0);
                        lobby.gameOptions.cards[lobby.queue].splice(index, 1);

                        newPosition = (oldPosition + firstDice + secondDice) % lobby.gameOptions.board.length;
                        lobby.gameOptions.inJail[lobby.queue] = 0;
                    }
                    
                    if(firstDice == secondDice)
                        lobby.gameOptions.nextPlayer = false;

                    standFunc = lobby.gameOptions.board[newPosition].standFunc(io, socket, lobby, newPosition, gamesFunctions);
                    newPosition = standFunc.newPosition;

                    if((firstDice != secondDice && !standFunc.canGo.stand) || standFunc.canGo.move)
                    {
                        lobby.gameOptions.lastPlayer = lobby.queue;
                        gamesFunctions.nextPlayer(lobby);
                    }

                    additional.firstDice = firstDice;
                    additional.secondDice = secondDice;
                break;
                case 7:
                    newPosition = msg.newPosition;
                    
                    if(newPosition < 0 || newPosition > lobby.gameOptions.board.length - 1)
                        return socket.emit("polymoly/move/res", { status: "error", message: "Nieprawidłowe miejsce" });
                        
                    if(lobby.gameOptions.board[newPosition].type > 2)
                        return socket.emit("polymoly/move/res", { status: "error", message: "Nieprawidłowe miejsce" });
                        
                    if(lobby.gameOptions.board[newPosition].additional.owner != undefined && lobby.gameOptions.board[newPosition].additional.owner != lobby.queue)
                        return socket.emit("polymoly/move/res", { status: "error", message: "Nieprawidłowe miejsce" });
                    
                    lobby.gameOptions.nextPlayer = false;

                    standFunc = lobby.gameOptions.board[newPosition].standFunc(io, socket, lobby, newPosition, gamesFunctions);
                    newPosition = standFunc.newPosition;
                break;
                default:
                    newPosition = (oldPosition + firstDice + secondDice) % lobby.gameOptions.board.length;
                    
                    if(firstDice == secondDice)
                        lobby.gameOptions.nextPlayer = false;

                    standFunc = lobby.gameOptions.board[newPosition].standFunc(io, socket, lobby, newPosition, gamesFunctions);
                    newPosition = standFunc.newPosition;

                    if((firstDice != secondDice && !standFunc.canGo.stand) || standFunc.canGo.move)
                    {
                        lobby.gameOptions.lastPlayer = lobby.queue;
                        gamesFunctions.nextPlayer(lobby);
                    }

                    additional.firstDice = firstDice;
                    additional.secondDice = secondDice;
            }

            lobby.gameOptions.positions[pawnI] = newPosition;

            if(oldPosition > newPosition)
            {
                lobby.gameOptions.threwStart[pawnI] = true;
                lobby.gameOptions.money[pawnI] += 300000;
            }
                
            additional.newPosition = newPosition;
            additional.oldPosition = oldPosition;
            additional.onField = lobby.gameOptions.onField;
            additional.money = lobby.gameOptions.money;
            
            additional.turn = lobby.players[lobby.queue];
            
            return io.to(`${game}#${code}`).emit("polymoly/move/res", { status: "ok", message: "Ruch Wykonany", additional });
        });
        //wybieranie jakie miasto będzie organizować mistrzostwa świata
        socket.on('polymoly/selectChampionship', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const property = msg.property;

            if(code == undefined || !code)
                return socket.emit("polymoly/selectChampionship/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("polymoly/selectChampionship/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("polymoly/selectChampionship/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("polymoly/selectChampionship/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            if(!lobby.gameOptions.stopped)
                return socket.emit("polymoly/selectChampionship/res", { status: "error", message: "Nie wybierasz teraz" });
                
            if(property < 0 || property > lobby.gameOptions.board.length)
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie da się tego wybrać" });
                
            if(lobby.gameOptions.board[property].additional.owner != undefined && lobby.gameOptions.board[property].additional.owner != lobby.queue)
                return socket.emit("polymoly/selectChampionship/res", { status: "error", message: "Nie możesz tego wybrać" });
            
            if(lobby.gameOptions.board[property].type > 2)
                return socket.emit("polymoly/selectChampionship/res", { status: "error", message: "Nie możesz tego wybrać" });

            const lastChampions = new Array();
            for (let i = 0; i < lobby.gameOptions.board.length; i++) 
            {
                if(lobby.gameOptions.board[i].type > 2) continue;
                if(!lobby.gameOptions.board[i].isChampions) continue;

                lastChampions.push(i);
                lobby.gameOptions.board[i].isChampions = false;
            }

            const pawnI = lobby.queue;
            const boardI = lobby.gameOptions.board.indexOf(lobby.gameOptions.board[property]);

            lobby.gameOptions.board[property].additional.isChampions = true;
            SetMultiplier(lobby.gameOptions.board, boardI);
            
            const price = lobby.gameOptions.board[property].additional.rent[lobby.gameOptions.board[property].additional.amountLodges] * lobby.gameOptions.board[property].additional.multiplier;
            
            if(lobby.gameOptions.nextPlayer)
            {
                lobby.gameOptions.lastPlayer = lobby.queue;
                gamesFunctions.nextPlayer(lobby);
            }
            lobby.gameOptions.stopped = false;
            
            const turn = lobby.players[lobby.queue];

            return io.to(`${game}#${code}`).emit("polymoly/selectChampionship/res", { status: "ok", message: "Wybrano", additional: { pawnI, price, turn, boardI, lastChampions } });
        });

        socket.on('polymoly/selectChanceDestroy', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const property = msg.property;

            if(code == undefined || !code)
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            if(!lobby.gameOptions.stopped)
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Nie wybierasz teraz" });
                
            if(lobby.gameOptions.chanceDestroy == 0)
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Nie możesz tego zrobić" });
                
            if(property < 0 || property > lobby.gameOptions.board.length)
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie da się tego wybrać" });
                
            if(lobby.gameOptions.board[property].additional.owner == undefined || lobby.gameOptions.board[property].additional.owner == lobby.queue)
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Nie możesz tego wybrać" });
            
            if(lobby.gameOptions.board[property].type > 2)
                return socket.emit("polymoly/selectChanceDestroy/res", { status: "error", message: "Nie możesz tego wybrać" });

            const pawnI = lobby.queue;
            const boardI = new Array();
            const price = new Array();

            const owner = lobby.gameOptions.board[property].additional.owner;
            switch (lobby.gameOptions.chanceDestroy) 
            {
                case 1:
                    lobby.gameOptions.board[property].additional.electricityOff = lobby.players.length * 3;

                    boardI.push(lobby.gameOptions.board.indexOf(lobby.gameOptions.board[property]));
                    price.push(lobby.gameOptions.board[property].additional.rent[lobby.gameOptions.board[property].additional.amountLodges] * lobby.gameOptions.board[property].additional.multiplier);
                break;
                case 2:
                    lobby.gameOptions.board[property].additional.amountLodges--;
                    
                    if(lobby.gameOptions.board[property].additional.amountLodges == -1)
                        lobby.gameOptions.board[property].additional.owner = undefined;

                    SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.indexOf(lobby.gameOptions.board[property]));

                    let indexes = new Array();
                    let hasMonopol = true;
                    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
                    {
                        if(lobby.gameOptions.board[i].type != 1) continue;
                        if(lobby.gameOptions.board[i].additional.country != lobby.gameOptions.board[property].additional.country) continue;
                        if(lobby.gameOptions.board[i].name == lobby.gameOptions.board[property].name) continue;
            
                        if(lobby.gameOptions.board[i].additional.owner != owner)
                            hasMonopol = false;
            
                        indexes.push(i);
                    }
                    if(hasMonopol)
                    {
                        indexes.forEach(index => 
                        {
                            SetMultiplier(lobby.gameOptions.board, index);

                            boardI.push(index);
                            price.push(lobby.gameOptions.board[index].additional.rent[lobby.gameOptions.board[index].additional.amountLodges] * lobby.gameOptions.board[index].additional.multiplier);
                        });
                    }
                                    
                    boardI.push(lobby.gameOptions.board.indexOf(lobby.gameOptions.board[property]));
                    price.push(lobby.gameOptions.board[property].additional.rent[lobby.gameOptions.board[property].additional.amountLodges] * lobby.gameOptions.board[property].additional.multiplier);
                break;
                case 3:

                    lobby.gameOptions.board[property].additional.owner = undefined;
                    
                    if(lobby.gameOptions.board[property].type == 1)
                    {
                        let indexes = new Array();
                        let hasMonopol = true;
                        for (let i = 0; i < lobby.gameOptions.board.length; i++) 
                        {
                            if(lobby.gameOptions.board[i].type != 1) continue;
                            if(lobby.gameOptions.board[i].additional.country != lobby.gameOptions.board[property].additional.country) continue;
                            if(lobby.gameOptions.board[i].name == lobby.gameOptions.board[property].name) continue;
                
                            if(lobby.gameOptions.board[i].additional.owner != owner)
                                hasMonopol = false;
                
                            indexes.push(i);
                        }
                        if(hasMonopol)
                        {
                            indexes.forEach(index => 
                            {
                                SetMultiplier(lobby.gameOptions.board, index);    
                                
                                boardI.push(index);
                                price.push(lobby.gameOptions.board[index].additional.rent[lobby.gameOptions.board[index].additional.amountLodges] * lobby.gameOptions.board[index].additional.multiplier);
                            });
                        }
                        lobby.gameOptions.board[property].additional.amountLodges = -1;
                    }
                    else if(lobby.gameOptions.board[property].type == 2)
                    {
                        let amountLodges = lobby.gameOptions.board[property].additional.amountLodges;

                        lobby.gameOptions.board.forEach(field => 
                        {
                            if(field.type != 2) return;

                            if(field.additional.owner == lobby.queue)
                            {
                                field.additional.amountLodges--;
                                amountLodges = field.additional.amountLodges;
                                
                                SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.indexOf(field));

                                price.push(field.additional.rent[field.additional.amountLodges] * field.additional.multiplier);
                            }
                        });
                        
                        lobby.gameOptions.board[property].additional.amountLodges = amountLodges;
                    }
                    
                    SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.indexOf(lobby.gameOptions.board[property]));
                    
                    boardI.push(lobby.gameOptions.board.indexOf(lobby.gameOptions.board[property]));
                    price.push("");
                break;
            }
                        
            if(lobby.gameOptions.nextPlayer)
            {
                lobby.gameOptions.lastPlayer = lobby.queue;
                gamesFunctions.nextPlayer(lobby);
            }
            lobby.gameOptions.stopped = false;
            
            const turn = lobby.players[lobby.queue];

            return io.to(`${game}#${code}`).emit("polymoly/selectChanceDestroy/res", { status: "ok", message: "Wybrano", additional: { pawnI, price, turn, boardI, action: lobby.gameOptions.chanceDestroy } });
        });
        //kupowanie posiadłości
        socket.on('polymoly/buyProperty', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const property = msg.property;
            const choice = parseInt(msg.choice);

            if(code == undefined || !code)
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            if(!lobby.gameOptions.stopped)
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie kupujesz teraz" });
                
            if(lobby.gameOptions.onField[lobby.queue] > 2)
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie kupujesz teraz" });
                
            if(!lobby.gameOptions.board.some(prop => JSON.stringify(prop) == JSON.stringify(property)))
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie da się tego kupić" });
                
            if(JSON.stringify(lobby.gameOptions.board[lobby.gameOptions.positions[lobby.queue]]) != JSON.stringify(property))
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie stoisz tu cwaniaku" });

            const desProperty = lobby.gameOptions.board.find(prop => JSON.stringify(prop) == JSON.stringify(property));
          
            if(desProperty.additional.owner != undefined && desProperty.additional.owner != lobby.queue)
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie możesz tego kupić" });
            
            if(desProperty.type > 2)
                return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie możesz tego kupić" });

            const pawnI = lobby.queue;

            const prices = new Array();
            const boardI = new Array();

            switch (desProperty.type)
            {
                case 1:
                    if(choice < -1 || choice > 4)
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie możesz tak zrobić" });
                        
                    if(choice == -1) break;
                    
                    if(!lobby.gameOptions.threwStart[lobby.queue] && choice > 2)
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie możesz tego kupić" });
                    
                    const price = desProperty.additional.amountLodges != -1 ? desProperty.additional.prices[desProperty.additional.amountLodges] : 0;

                    if(price != desProperty.additional.prices[desProperty.additional.prices.length - 2] && choice == desProperty.additional.prices.length - 1)
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie możesz tego kupić" });

                    if(price >= desProperty.additional.prices[choice])
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Masz już to kupione" });

                    if(lobby.gameOptions.money[lobby.queue] < (desProperty.additional.prices[choice] - price) * 1000)
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie masz tyle pieniędzy" });

                    desProperty.additional.owner = lobby.queue;
                    lobby.gameOptions.money[lobby.queue] -= (desProperty.additional.prices[choice] - price) * 1000;
                    desProperty.additional.amountLodges = choice;

                    SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.findIndex(prop => prop.name == desProperty.name));
                    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
                    {
                        if(lobby.gameOptions.board[i].type != 1) continue;
                        if(lobby.gameOptions.board[i].additional.country != desProperty.additional.country) continue;

                        if(lobby.gameOptions.board[i].additional.owner != desProperty.additional.owner)
                            continue;

                        prices.push(lobby.gameOptions.board[i].additional.rent[lobby.gameOptions.board[i].additional.amountLodges] * lobby.gameOptions.board[i].additional.multiplier);
                        boardI.push(i);
                    }
                break;
                case 2:
                    if(choice < -1 || choice > 1)
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie możesz tak zrobić" });
                        
                    if(choice == -1) break;
                    
                    if(desProperty.additional.owner == lobby.queue)
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Masz już to kupione" });

                    if(lobby.gameOptions.money[lobby.queue] < desProperty.additional.prices[0])
                        return socket.emit("polymoly/buyProperty/res", { status: "error", message: "Nie masz tyle pieniędzy" });

                    lobby.gameOptions.money[lobby.queue] -= desProperty.additional.prices[0] * 1000;

                    let amountLodges = 0;

                    lobby.gameOptions.board.forEach(field => 
                    {
                        if(field.type != 2) return;

                        if(field.additional.owner == lobby.queue)
                        {
                            field.additional.amountLodges++;
                            amountLodges = field.additional.amountLodges;
                            
                            SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.findIndex(prop => prop.name == field.name));

                            prices.push(field.additional.rent[field.additional.amountLodges] * field.additional.multiplier);
                            boardI.push(lobby.gameOptions.board.findIndex(prop => prop.name == field.name));
                        }
                    });

                    desProperty.additional.owner = lobby.queue;
                    desProperty.additional.amountLodges = amountLodges;
                    
                    SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.findIndex(prop => prop.name == desProperty.name));

                    prices.push(desProperty.additional.rent[desProperty.additional.amountLodges] * desProperty.additional.multiplier);
                    boardI.push(lobby.gameOptions.board.findIndex(prop => prop.name == desProperty.name));
                break;
            }
            
            if(lobby.gameOptions.nextPlayer)
            {
                lobby.gameOptions.lastPlayer = lobby.queue;
                gamesFunctions.nextPlayer(lobby);
            }
            lobby.gameOptions.stopped = false;
            
            const turn = lobby.players[lobby.queue];

            return io.to(`${game}#${code}`).emit("polymoly/buyProperty/res", { status: "ok", message: "Wykonano działanie", additional: { money: lobby.gameOptions.money, turn, pawnI, price: prices, boardI } });
        });
        //sprzedaż posiadłości
        socket.on('polymoly/sellProperty', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const desProperties = msg.properties;

            if(code == undefined || !code)
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            if(!lobby.gameOptions.stopped)
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie sprzedajesz teraz" });
                
            if(lobby.gameOptions.bankrupcy[lobby.queue] >= 0)
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie sprzedajesz teraz" });

            if(!Array.isArray(desProperties))
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie da się tego sprzedać" });

            let price = 0;
            for (let i = 0; i < desProperties.length; i++)
            {
                const index = desProperties[i];

                if(index < 0 || index > lobby.gameOptions.board.length)
                    return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie da się tego sprzedać" });
                if(!lobby.gameOptions.board[index].type > 2)
                    return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie da się tego sprzedać" });

                if(lobby.gameOptions.board[index].additional.owner != lobby.queue)
                    return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Nie możesz tego sprzedać" });

                if(lobby.gameOptions.board[index].type == 1)
                    price += lobby.gameOptions.board[index].additional.prices[lobby.gameOptions.board[index].additional.amountLodges] * 1000;
                else if(lobby.gameOptions.board[index].type == 2)
                    price += lobby.gameOptions.board[index].additional.prices[0] * 1000;
            }
            if(price + lobby.gameOptions.bankrupcy[lobby.queue] < 0)
                return socket.emit("polymoly/sellProperty/res", { status: "error", message: "Sprzedałeś za mało" });
                
            const pawnI = lobby.queue;

            const boardI = new Array();
            const prices = new Array();
            for (let i = 0; i < desProperties.length; i++)
            {
                const index = desProperties[i];

                const owner = lobby.gameOptions.board[property].additional.owner;
                lobby.gameOptions.board[index].additional.owner = undefined;

                if(lobby.gameOptions.board[index].type == 1)
                {
                    let indexes = new Array();
                    let hasMonopol = true;
                    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
                    {
                        if(lobby.gameOptions.board[i].type != 1) continue;
                        if(lobby.gameOptions.board[i].additional.country != lobby.gameOptions.board[property].additional.country) continue;
                        if(lobby.gameOptions.board[i].name == lobby.gameOptions.board[property].name) continue;
            
                        if(lobby.gameOptions.board[i].additional.owner != owner)
                            hasMonopol = false;
            
                        indexes.push(i);
                    }
                    if(hasMonopol)
                    {
                        indexes.forEach(index => 
                        {
                            SetMultiplier(lobby.gameOptions.board, index);
                            
                            boardI.push(index);
                            prices.push(lobby.gameOptions.board[index].additional.rent[lobby.gameOptions.board[index].additional.amountLodges] * lobby.gameOptions.board[index].additional.multiplier);
                        });
                    }

                    lobby.gameOptions.board[index].additional.amountLodges = -1;
                }
                else if(lobby.gameOptions.board[index].type == 2)
                {
                    let amountLodges = lobby.gameOptions.board[index].additional.amountLodges;

                    lobby.gameOptions.board.forEach(field => 
                    {
                        if(field.type != 2) return;

                        if(field.additional.owner == lobby.queue)
                        {
                            field.additional.amountLodges--;
                            amountLodges = field.additional.amountLodges;
                            
                            SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.findIndex(prop => prop.name == field.name));
                            prices.push(field.additional.rent[field.additional.amountLodges] * field.additional.multiplier);
                        }
                    });
                    
                    lobby.gameOptions.board[index].additional.amountLodges = amountLodges;
                }
                
                SetMultiplier(lobby.gameOptions.board, index);
                                
                boardI.push(index);
                prices.push("");
            }

            lobby.gameOptions.money[lobby.queue] = price + lobby.gameOptions.bankrupcy[lobby.queue];
            lobby.gameOptions.bankrupcy[lobby.queue] = 0;
            
            if(lobby.gameOptions.nextPlayer)
            {
                lobby.gameOptions.lastPlayer = lobby.queue;
                gamesFunctions.nextPlayer(lobby);
            }
            lobby.gameOptions.stopped = false;

            const turn = lobby.players[lobby.queue];

            return io.to(`${game}#${code}`).emit("polymoly/sellProperty/res", { status: "ok", message: "Sprzedano", additional: { money: lobby.gameOptions.money, turn, price: prices, pawnI, boardI } });
        });
        //handlowanie między użytkownikami
        socket.on('polymoly/trade', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const playerI = msg.playerI;
            const from = msg.from;
            const to = msg.to;

            if(code == undefined || !code)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("polymoly/trade/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(!lobby.started)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Gra nie rozpoczęta" });

            if(!await gamesFunctions.isCurrentPlayer(socket.request, lobby))
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nie twoja kolej kolego" });
                
            if(lobby.gameOptions.stopped)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Musisz poczekać" });

            if(lobby.gameOptions.trade != undefined)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Oferta została już wysłana" });

            if(playerI < 0 || playerI > lobby.players.length - 1)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nieprawidłowy gracz" });
                
            if(lobby.queue == playerI)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nie możesz siebie wskazać" });

            if(!Array.isArray(from))
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nie możesz tego zaoferować" });

            if(!Array.isArray(to))
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nie możesz tego chcieć" });

            if(from.length <= 0 && to.length <= 0)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nie możesz wysłać pustej oferty" });

            let good = true;
            from.forEach(el => 
            {
                if(el.type > 3) return good = false;
                
                switch (el.type) 
                {
                    case 1:
                        if(el.index == undefined) return good = false;
                        if(el.index < 0) return good = false;
                        if(el.index > lobby.gameOptions.board.length - 1) return good = false;
                        if(lobby.gameOptions.board[el.index].type > 2) return good = false;
                        if(lobby.gameOptions.board[el.index].additional.owner != lobby.queue) return good = false;
                    break;
                    case 2:
                        if(el.index == undefined) return good = false;
                        if(el.index < 0) return good = false;
                        if(el.index > lobby.gameOptions.cards[lobby.queue].length - 1) return good = false;
                    break;
                    case 3:
                        if(el.amount == undefined) return good = false;
                        if(el.amount < 0) return good = false;
                        if(el.amount * 1000 > lobby.gameOptions.money[lobby.queue]) return good = false;
                    break;
                }
            });
            if(!good)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nie możesz tego zaoferować" });
                
            to.forEach(el => 
            {
                if(el.type > 3) return good = false;
                
                switch (el.type) 
                {
                    case 1:
                        if(el.index == undefined) return good = false;
                        if(el.index < 0) return good = false;
                        if(el.index > lobby.gameOptions.board.length - 1) return good = false;
                        if(lobby.gameOptions.board[el.index].type > 2) return good = false;
                        if(lobby.gameOptions.board[el.index].additional.owner != playerI) return good = false;
                    break;
                    case 2:
                        if(el.index == undefined) return good = false;
                        if(el.index < 0) return good = false;
                        if(el.index > lobby.gameOptions.cards[playerI].length - 1) return good = false;
                    break;
                    case 3:
                        if(el.amount == undefined) return good = false;
                        if(el.amount < 0) return good = false;
                        if(el.amount * 1000 > lobby.gameOptions.money[playerI]) return good = false;
                    break;
                }
            });
            if(!good)
                return socket.emit("polymoly/trade/res", { status: "error", message: "Nie możesz tego chcieć" });

            const trade = { from: lobby.queue, to: playerI, offer: { from, for: to } };
            
            lobby.gameOptions.trade = trade;

            return io.to(`${game}#${code}`).emit("polymoly/trade/res", { status: "ok", message: "Otrzymano oferte", additional: { trade, players: lobby.players, board: lobby.gameOptions.board } });
        });
        
        socket.on('polymoly/tradeAccept', async msg =>
        {
            const code = msg.code;
            const game = msg.game;
            const choice = parseInt(msg.choice);
            const playerI = msg.playerI;

            if(code == undefined || !code)
                return socket.emit("polymoly/tradeAccept/res", { status: "error", message: "Taka gra nie istnieje" });

            if(!lobbies.some(lobby => lobby.code == code))
                return socket.emit("polymoly/tradeAccept/res", { status: "error", message: "Takie lobby nie istnieje" });
            
            const lobby = lobbies.find(games => games.code == code);

            if(lobby.gameOptions.trade == undefined)
                return socket.emit("polymoly/tradeAccept/res", { status: "error", message: "Oferta nie została wysłana" });

            if(lobby.gameOptions.trade.to != playerI)
                return socket.emit("polymoly/tradeAccept/res", { status: "error", message: "Nieprawidłowy gracz" });
                
            if(choice != 0 && choice != 1)
                return socket.emit("polymoly/tradeAccept/res", { status: "error", message: "Nieprawidłowa odpowiedź" });

            const prices = new Array();
            const boardI = new Array();
            const pawnI = new Array();

            lobby.gameOptions.trade.offer.from.forEach(el => 
            {
                switch (el.type)
                {
                    case 1:
                        lobby.gameOptions.board[el.index].additional.owner = lobby.gameOptions.trade.to;

                        if(lobby.gameOptions.board[el.index].type == 2)
                        {
                            amountLodges = lobby.gameOptions.board[el.index].additional.amountLodges;
                            lobby.gameOptions.board.forEach(field => 
                            {
                                if(field.type != 2) return;
        
                                if(field.additional.owner == lobby.queue)
                                {
                                    field.additional.amountLodges--;
                                    amountLodges = field.additional.amountLodges;
                                    
                                    SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.findIndex(prop => prop.name == field.name));
        
                                    prices.push(field.additional.rent[field.additional.amountLodges] * field.additional.multiplier);
                                    boardI.push(lobby.gameOptions.board.findIndex(prop => prop.name == field.name));
                                    pawnI.push(field.additional.owner);
                                }
                            });

                            lobby.gameOptions.board[el.index].additional.amountLodges = amountLodges;
                        }

                        SetMultiplier(lobby.gameOptions.board, el.index);
                        
                        prices.push(lobby.gameOptions.board[el.index].additional.rent[lobby.gameOptions.board[el.index].additional.amountLodges] * lobby.gameOptions.board[el.index].additional.multiplier);
                        boardI.push(lobby.gameOptions.board.indexOf(lobby.gameOptions.board[el.index]));
                        pawnI.push(lobby.gameOptions.trade.to);
                    break;
                    case 2:
                        lobby.gameOptions.cards[lobby.gameOptions.trade.to].push(lobby.gameOptions.cards[lobby.gameOptions.trade.from][el.index]);
                        lobby.gameOptions.cards[lobby.gameOptions.trade.from].splice(el.index, 1);
                    break;
                    case 3:
                        lobby.gameOptions.money[lobby.gameOptions.trade.from] -= el.amount * 1000;
                        lobby.gameOptions.money[lobby.gameOptions.trade.to] += el.amount * 1000;
                    break;
                }
            });
                
            lobby.gameOptions.trade.offer.for.forEach(el => 
            {
                switch (el.type) 
                {
                    case 1:
                        lobby.gameOptions.board[el.index].additional.owner = lobby.gameOptions.trade.from;

                        if(lobby.gameOptions.board[el.index].type == 2)
                        {
                            amountLodges = lobby.gameOptions.board[el.index].additional.amountLodges;
                            lobby.gameOptions.board.forEach(field => 
                            {
                                if(field.type != 2) return;
        
                                if(field.additional.owner == lobby.queue)
                                {
                                    field.additional.amountLodges--;
                                    amountLodges = field.additional.amountLodges;
                                    
                                    SetMultiplier(lobby.gameOptions.board, lobby.gameOptions.board.findIndex(prop => prop.name == field.name));
        
                                    prices.push(field.additional.rent[field.additional.amountLodges] * field.additional.multiplier);
                                    boardI.push(lobby.gameOptions.board.findIndex(prop => prop.name == field.name));
                                    pawnI.push(field.additional.owner);
                                }
                            });

                            lobby.gameOptions.board[el.index].additional.amountLodges = amountLodges;
                        }

                        SetMultiplier(lobby.gameOptions.board, el.index);
                        
                        prices.push(lobby.gameOptions.board[el.index].additional.rent[lobby.gameOptions.board[el.index].additional.amountLodges] * lobby.gameOptions.board[el.index].additional.multiplier);
                        boardI.push(lobby.gameOptions.board.indexOf(lobby.gameOptions.board[el.index]));
                        pawnI.push(lobby.gameOptions.trade.from);
                    break;
                    case 2:
                        lobby.gameOptions.cards[lobby.gameOptions.trade.from].push(lobby.gameOptions.cards[lobby.gameOptions.trade.to][el.index]);
                        lobby.gameOptions.cards[lobby.gameOptions.trade.to].splice(el.index, 1);
                    break;
                    case 3:
                        lobby.gameOptions.money[lobby.gameOptions.trade.from] += el.amount * 1000;
                        lobby.gameOptions.money[lobby.gameOptions.trade.to] -= el.amount * 1000;
                    break;
                }
            });
            
            lobby.gameOptions.trade = undefined;

            if(!choice)
                return io.to(`${game}#${code}`).emit("polymoly/tradeAccept/res", { status: "ok", message: "Oferta odrzucona", additional: { accept: false } });

            return io.to(`${game}#${code}`).emit("polymoly/tradeAccept/res", { status: "ok", message: "Oferta zaakceptowana", additional: { accept: true, money: lobby.gameOptions.money, prices, boardI, pawnI } });
        });
    }
}

//generowanie planszy

function GenerateBoard()
{
    const board = new Array();

    board.push({ name: "Start", type: 6, additional: { }, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => StartStand(io, socket, lobby, newPosition, gamesFunctions) });

    for (let i = 0; i < 7; i++) 
        board.push(cloneDeep(properties[i]));

    board.push({ name: "Więzienie", type: 4, additional: { }, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => JailStand(io, socket, lobby, newPosition, gamesFunctions) });
    
    for (let i = 7; i < 10; i++)
        board.push(cloneDeep(properties[i]));

    board.push({ name: "Szansa", type: 3, additional: {}, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => ChanceStand(io, socket, lobby, newPosition, gamesFunctions) });
    
    for (let i = 10; i < 13; i++)
        board.push(cloneDeep(properties[i]));

    board.push({ name: "Mistrzostwa świata", type: 5, additional: {}, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => ChampionsStand(io, socket, lobby, newPosition, gamesFunctions) });
    
    for (let i = 13; i < 16; i++)
        board.push(cloneDeep(properties[i]));

    board.push({ name: "Szansa", type: 3, additional: {}, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => ChanceStand(io, socket, lobby, newPosition, gamesFunctions) });
    
    for (let i = 16; i < 19; i++)
        board.push(cloneDeep(properties[i]));

    board.push({ name: "Podróż", type: 7, additional: {}, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => TravelStand(io, socket, lobby, newPosition, gamesFunctions) });
    
    for (let i = 19; i < 22; i++)
        board.push(cloneDeep(properties[i]));

    board.push({ name: "Szansa", type: 3, additional: {}, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => ChanceStand(io, socket, lobby, newPosition, gamesFunctions) });
    
    board.push(cloneDeep(properties[22]));

    board.push({ name: "Podatek", type: 8, additional: {}, standFunc: (io, socket, lobby, newPosition, gamesFunctions) => TaxStand(io, socket, lobby, newPosition, gamesFunctions) });
    
    board.push(cloneDeep(properties[23]));

    SetFestivals(board, 3);

    return board;
}

//ustawiamy festiwale

function SetFestivals(board, amount)
{
    const indexes = new Array();

    for (let i = 0; i < board.length; i++) 
    {
        if(board[i].type > 2) continue;

        indexes.push(i);
    }

    if(amount > indexes.length) amount = indexes.length - 1;

    for (let i = 0; i < amount; i++) 
    {
        let festival = Math.floor(misc.random(0, indexes.length - 1));
        
        while (board[indexes[festival]].isFestival)
            festival = Math.floor(misc.random(0, indexes.length - 1));
            
        board[indexes[festival]].additional.isFestival = true;
        SetMultiplier(board, indexes[festival]);
    }
}


function SetMultiplier(board, index, first = true)
{
    board[index].additional.multiplier = 0;

    if(board[index].additional.isFestival)
        board[index].additional.multiplier += 2;
    if(board[index].additional.isChampions)
        board[index].additional.multiplier += 3;

    let hasMonopol = true;
    let indexes = new Array();
    if(board[index].type == 1)
    {
        for (let i = 0; i < board.length; i++) 
        {
            if(board[i].type != 1) continue;
            if(board[i].additional.country != board[index].additional.country) continue;

            if(board[i].additional.owner == undefined || board[index].additional.owner == undefined || board[i].additional.owner != board[index].additional.owner)
                hasMonopol = false;

            indexes.push(i);
        }
        if(hasMonopol)
        {
            board[index].additional.multiplier += 2;
            if(first) indexes.forEach(index => SetMultiplier(board, index, false));
        }
    }


    if(board[index].additional.multiplier == 0)
        board[index].additional.multiplier = 1;
}
//bankrut
function RemoveMoney(socket, lobby, amount)
{
    lobby.gameOptions.money[lobby.queue] -= amount;

    if(lobby.gameOptions.money[lobby.queue] < 0)
    {
        lobby.gameOptions.bankrupcy[lobby.queue] = lobby.gameOptions.money[lobby.queue];

        lobby.gameOptions.money[lobby.queue] += amount;

        const properties = new Array();
        let propertyMoney = 0;
        for (let i = 0; i < lobby.gameOptions.board.length; i++) 
        {
            if(lobby.gameOptions.board[i].type > 2) continue;

            if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
            {
                if(lobby.gameOptions.board[i].type == 1)
                    propertyMoney += lobby.gameOptions.board[i].additional.prices[lobby.gameOptions.board[i].additional.amountLodges] * 1000;
                else if(lobby.gameOptions.board[i].type == 2)
                    propertyMoney += lobby.gameOptions.board[i].additional.prices[0] * 1000;

                properties.push(lobby.gameOptions.board[i]);
            }
        }

        if(propertyMoney + lobby.gameOptions.bankrupcy[lobby.queue] > 0)
            socket.emit("polymoly/bankrupcy", { status: "ok", message: "Co chcesz sprzedać?", additional: { properties } });
        else
            lobby.times[lobby.queue] = 0;

        return false;
    }

    return true;
}

function PropertyStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 1;
    const property = lobby.gameOptions.board[newPosition];

    if(property.additional.owner == undefined || property.additional.owner == lobby.queue)
    {
        socket.emit("polymoly/propertyStand", { status: "ok", message: "Chcesz kupić?", additional: { info: property, threwStart: lobby.gameOptions.threwStart[lobby.queue] } });

        lobby.gameOptions.stopped = true;
    }
    else if(property.additional.owner != undefined && property.additional.owner != lobby.queue && property.additional.electricityOff == 0)
    {
        let multiplier = 1;
        if(lobby.gameOptions.cards[lobby.queue].some(card => card.card == 1))
        {
            multiplier = .5;
            const index = lobby.gameOptions.cards[lobby.queue].findIndex(card => card.card == 1);
            lobby.gameOptions.cards[lobby.queue].splice(index, 1);
        }
        else if(lobby.gameOptions.cards[lobby.queue].some(card => card.card == 2))
        {
            multiplier = 2;
            const index = lobby.gameOptions.cards[lobby.queue].findIndex(card => card.card == 2);
            lobby.gameOptions.cards[lobby.queue].splice(index, 1);
        }

        let amount = property.additional.rent[property.additional.amountLodges] * 1000 * property.additional.multiplier * multiplier;
        
        const good = RemoveMoney(socket, lobby, amount);
        lobby.gameOptions.money[property.additional.owner] += amount;
        
        let propertyMoney = 0;
        for (let i = 0; i < lobby.gameOptions.board.length; i++) 
        {
            if(lobby.gameOptions.board[i].type > 2) continue;
    
            if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
            {
                if(lobby.gameOptions.board[i].type == 1)
                    propertyMoney += lobby.gameOptions.board[i].additional.prices[lobby.gameOptions.board[i].additional.amountLodges] * 1000;
                else if(lobby.gameOptions.board[i].type == 2)
                    propertyMoney += lobby.gameOptions.board[i].additional.prices[0] * 1000;
            }
        }

        amount = Math.min(amount, propertyMoney + lobby.gameOptions.money[lobby.queue]);

        if(lobby.gameOptions.nextPlayer && good)
            gamesFunctions.nextPlayer(lobby);
        else if(!good)
            lobby.gameOptions.stopped = true;
    }
    
    return { canGo: { move: false, stand: true }, newPosition };
}
function IslandStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 2;
    const property = lobby.gameOptions.board[newPosition];

    if(property.additional.owner == undefined || property.additional.owner == lobby.queue)
    {
        socket.emit("polymoly/propertyStand", { status: "ok", message: "Chcesz kupić?", additional: { info: property } });
        
        lobby.gameOptions.stopped = true;
    }
    else if(property.additional.owner != undefined && property.additional.owner != lobby.queue && property.additional.electricityOff == 0)
    {
        let multiplier = 1;
        if(lobby.gameOptions.cards[lobby.queue].some(card => card.card == 1))
        {
            multiplier = .5;
            const index = lobby.gameOptions.cards[lobby.queue].findIndex(card => card.card == 1);
            lobby.gameOptions.cards[lobby.queue].splice(index, 1);
        }
        else if(lobby.gameOptions.cards[lobby.queue].some(card => card.card == 2))
        {
            multiplier = 2;
            const index = lobby.gameOptions.cards[lobby.queue].findIndex(card => card.card == 2);
            lobby.gameOptions.cards[lobby.queue].splice(index, 1);
        }

        let amount = property.additional.rent[property.additional.amountLodges] * 1000 * property.additional.multiplier * multiplier;

        const good = RemoveMoney(socket, lobby, amount);
        
        let propertyMoney = 0;
        for (let i = 0; i < lobby.gameOptions.board.length; i++) 
        {
            if(lobby.gameOptions.board[i].type > 2) continue;
    
            if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
            {
                if(lobby.gameOptions.board[i].type == 1)
                    propertyMoney += lobby.gameOptions.board[i].additional.prices[lobby.gameOptions.board[i].additional.amountLodges] * 1000;
                else if(lobby.gameOptions.board[i].type == 2)
                    propertyMoney += lobby.gameOptions.board[i].additional.prices[0] * 1000;
            }
        }

        amount = Math.min(amount, propertyMoney + lobby.gameOptions.money[lobby.queue]);

        lobby.gameOptions.money[property.additional.owner] += amount;
        
        if(lobby.gameOptions.nextPlayer && good)
            gamesFunctions.nextPlayer(lobby);
        else if(!good)
            lobby.gameOptions.stopped = true;
    }
    
    return { canGo: { move: false, stand: true }, newPosition };
}
function StartStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 6;
    
    return { canGo: { move: false, stand: false }, newPosition };
}
function JailStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 4;

    if(lobby.gameOptions.inJail[lobby.queue] == 0)
        lobby.gameOptions.inJail[lobby.queue] += 3;

    return { canGo: { move: true, stand: true }, newPosition };
}
function ChanceStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 3;
    
    const random = Math.floor(Math.random() * chances.length);
    
    let chance = chances[random];
    
    if(chance.condition != null)
        if(!chance.condition(io, socket, lobby, newPosition, gamesFunctions))
            chance = chances[1];
    
    io.to(`polymoly#${lobby.code}`).emit("polymoly/chance", { status: "ok", message: "Stanięto na szanse", additional: { title: chance.name, desc: chance.description } });
            
    return chance.func(io, socket, lobby, newPosition, gamesFunctions);
}
function ChampionsStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 5;

    const properties = new Array();
    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
    {
        if(lobby.gameOptions.board[i].type > 2) continue;

        if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
            properties.push(i);
    }

    if(properties.length > 0)
    {
        socket.emit("polymoly/championship", { status: "ok", message: "Wybierz mistrzostwa", additional: { properties } });

        lobby.gameOptions.stopped = true;
    }
    else if(lobby.gameOptions.nextPlayer)
        gamesFunctions.nextPlayer(lobby);

    return { canGo: { move: false, stand: true }, newPosition };
}
function TravelStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 7;

    return { canGo: { move: true, stand: false }, newPosition };
}
function TaxStand(io, socket, lobby, newPosition, gamesFunctions)
{
    lobby.gameOptions.onField[lobby.queue] = 8;

    let propertyMoney = 0;
    for (let i = 0; i < lobby.gameOptions.board.length; i++) 
    {
        if(lobby.gameOptions.board[i].type > 2) continue;

        if(lobby.gameOptions.board[i].additional.owner == lobby.queue)
        {
            if(lobby.gameOptions.board[i].type == 1)
                propertyMoney += lobby.gameOptions.board[i].additional.prices[lobby.gameOptions.board[i].additional.amountLodges] * 1000;
            else if(lobby.gameOptions.board[i].type == 2)
                propertyMoney += lobby.gameOptions.board[i].additional.prices[0] * 1000;
        }
    }

    let multiplier = 1;
    if(lobby.gameOptions.cards[lobby.queue].some(card => card.card == 1))
    {
        multiplier = .5;
        const index = lobby.gameOptions.cards[lobby.queue].findIndex(card => card.card == 1);
        lobby.gameOptions.cards[lobby.queue].splice(index, 1);
    }
    else if(lobby.gameOptions.cards[lobby.queue].some(card => card.card == 2))
    {
        multiplier = 2;
        const index = lobby.gameOptions.cards[lobby.queue].findIndex(card => card.card == 2);
        lobby.gameOptions.cards[lobby.queue].splice(index, 1);
    }

    const tax = propertyMoney * .1 * multiplier;
    
    const good = RemoveMoney(socket, lobby, tax);

    if(lobby.gameOptions.nextPlayer && good)
        gamesFunctions.nextPlayer(lobby);
    else if(!good)
        lobby.gameOptions.stopped = true;

    return { canGo: { move: false, stand: true }, newPosition };
}