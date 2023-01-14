const socket = io(document.location.origin);

let url = location.pathname.split("/");
const code = url[url.length - 1];
const game = url[url.length - 2];

const playerTurnText = document.querySelector('.currentPlayer');

socket.emit('joinRoom', { code, game });

socket.on('joinLobbyRes', (msg) =>
{
    if(msg.status == "error")
        return console.log(msg.message);

    const playersDiv = document.querySelector(".players > div");
    
    const div = playersDiv.querySelector('.free');
    div.classList.remove('free');
    div.setAttribute('user', msg.message.name);

    const name = div.querySelector('p');
    name.innerText = msg.message.name.split('#')[0];

    const user = div.querySelector('.user');

    const special = document.createElement('p');
    special.classList.add('special');
    special.innerText = `#${msg.message.name.split('#')[1]}`;

    user.appendChild(special);

    const users = document.querySelector('.aside > .users');

    const userDiv = document.createElement('div');
    userDiv.classList.add('user');
    userDiv.setAttribute('user', msg.message.name);

    const nameDiv = document.createElement('div');
    nameDiv.classList.add('name');
    const username = document.createElement('p');
    username.innerText = msg.message.name.split('#')[0];
    const hash = document.createElement('p');
    hash.classList.add('hash');
    hash.innerText = `#${msg.message.name.split('#')[1]}`;

    nameDiv.appendChild(username);
    nameDiv.appendChild(hash);
    
    const avatar = document.createElement('div');
    avatar.classList.add('avatar');

    const time = document.createElement('div');
    time.classList.add('time');
    const p = document.createElement('p');
    p.innerText = "pozostały czas:";
    const timeP = document.createElement('p');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.setAttribute('viewBox', '0 0 512 512');
    path.setAttribute('d', 'M232 120C232 106.7 242.7 96 256 96C269.3 96 280 106.7 280 120V243.2L365.3 300C376.3 307.4 379.3 322.3 371.1 333.3C364.6 344.3 349.7 347.3 338.7 339.1L242.7 275.1C236 271.5 232 264 232 255.1L232 120zM256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256C0 114.6 114.6 0 256 0zM48 256C48 370.9 141.1 464 256 464C370.9 464 464 370.9 464 256C464 141.1 370.9 48 256 48C141.1 48 48 141.1 48 256z');
    const timeAmount = document.createElement('b');
    timeAmount.innerText = `${Math.floor(msg.lobby.times[msg.lobby.players.findIndex(player => player.name == msg.message.name)] / 60)}:${msg.lobby.times[msg.lobby.players.findIndex(player => player.name == msg.message.name)] % 60 <= 9 ? "0" + msg.lobby.times[msg.lobby.players.findIndex(player => player.name == msg.message.name)] % 60 : msg.lobby.times[msg.lobby.players.findIndex(player => player.name == msg.message.name)] % 60}`;

    svg.appendChild(path);
    timeP.appendChild(svg);
    timeP.appendChild(timeAmount);
    time.appendChild(p);
    time.appendChild(timeP);

    userDiv.appendChild(nameDiv);
    userDiv.appendChild(avatar);
    userDiv.appendChild(time);

    users.appendChild(userDiv);
});
socket.on('leaveLobbyRes', (msg) =>
{
    if(msg.status == "error") return;

    const user = document.querySelector('.waiting').querySelector(`[user="${msg.message.user.name}"]`);
    user.classList.add('free');
    user.setAttribute('user', "");
    user.querySelector('.user').innerHTML = "<p>...</p>";

    const uUser = document.querySelector('.users').querySelector(`[user="${msg.message.user.name}"]`);
    uUser.remove();
    
    socket.emit('isHost', { code, game });
});
socket.on('isHost/res', (msg) =>
{
    if(msg.status != "ok") return;
    
    if(!msg.message) return;

    const button = document.createElement("button");
    button.innerHTML = "Zacznij";
    button.classList.add('startGame');
    button.addEventListener("click", async () =>
    {    
        socket.emit('startGame', { code, game });
    });

    document.querySelector(".waiting").children[0].appendChild(button);
});
socket.on('leaveLobbyRes', (msg) =>
{
    if(msg.status == "error")
        return console.log(msg.message);

    const p = document.querySelectorAll("p");
    p.forEach(el => 
    {
        if(el.innerHTML == msg.message.user.name)
            el.remove();
    });

    if(!msg.message.host) return;
    
    const button = document.createElement("button");
    button.innerHTML = "Zacznij";
    button.classList.add('startGame');
    button.addEventListener("click", async () =>
    {    
        socket.emit('startGame', { code, game });
    });

    document.querySelector(".waiting").appendChild(button);
});

const joinLobby = document.querySelector(".joinLobby");
if(joinLobby)
    joinLobby.addEventListener("click", async () => 
    {
        socket.emit('joinLobby', { code, game })
        joinLobby.remove();
    });

const startGame = document.querySelector('.startGame');
if(startGame)
    startGame.addEventListener("click", async () =>
    {    
        socket.emit('startGame', { code, game });
    });
    
const lobbyDiv = document.querySelector('.waiting');
const gameDiv = document.querySelector('.game');
socket.on('startGameRes', (msg) =>
{
    if(msg.status != "ok") return SpawnAlert(3, msg.message);

    GetGameInfo();

    lobbyDiv.classList.add('hidden');
    gameDiv.classList.remove('gameHidden');
    GameStart(msg.gameOptions);
});

socket.on('gameWin', (msg) =>
{
    if(msg.status != "ok") return;

    SpawnAlert(4, `Grę wygrywa ${msg.message.winner.name}`);
});

const chat = document.querySelector('.chat'); //odwołnie do chat
chat.addEventListener("submit", event =>  
{
    event.preventDefault(); // nie odswieza strony

    const input = chat.querySelector('input[type=text]');
    const text = input.value;

    socket.emit('sendMessage', { code, game, text }); // wysyłam wiadomosc do uzytkownika
});

const chatMessages = document.querySelector('.messages'); // div z chatem
socket.on('sendMessageRes', (msg) =>
{
    if(msg.status != "ok") return;
    
    const div = document.createElement('div');
    const avatar = document.createElement('div');
    avatar.classList.add('avatar');

    const user = document.createElement('div');
    const author = document.createElement('p'); // tworze se p
    author.innerText = `${msg.message.author}`; // wpisuje p do message
    const message = document.createElement('p'); // tworze se p
    message.innerText = `${msg.message.msg}`; // wpisuje p do message

    user.appendChild(author);
    user.appendChild(message);
    
    div.appendChild(avatar);
    div.appendChild(user);
    
    chatMessages.appendChild(div);// dodaje te p do chat
}); //łapiesz odp od serwera zawierajaca to cos w inpucie 

async function GetGameInfo()
{
    const result = await fetch(`/api/info/${game}/${code}`, ).then(res => res.json()).then(data => data);

    if(result.status != "ok") return;

    const lobby = result.message.game;

    playerIndex = result.message.playerIndex;

    if(!lobby.started)
    {
        lobbyDiv.classList.remove('hidden');
        gameDiv.classList.add('gameHidden');
        GameRestart(lobby.gameOptions);
    }

    const users = document.querySelectorAll('.users > .user');
    for (let i = 0; i < users.length; i++) 
    {
        const user = users[i];

        const time = user.querySelector('.time p b');
        time.innerText = `${Math.floor(lobby.times[i] / 60)}:${lobby.times[i] % 60 <= 9 ? "0" + lobby.times[i] % 60 : lobby.times[i] % 60}`;
    }
}

setInterval(GetGameInfo, 1000);
GetGameInfo();