const board = document.querySelector('.board'); // cała plansza 

const pawnSelect = document.querySelector('.pawnSelect');

function GameStart(gameOptions)
{
    CheckPlayer();
}
function GameRestart(gameOptions)
{
    for (let i = 0; i < board.children.length; i++) //po dzieciqach planczy
    {
        const row = board.children[i]; //kolumna

        for (let j = 0; j < row.children.length; j++) 
        {
            if(gameOptions.board[i][j] != null)
            {
                row.children[j].firstElementChild.setAttribute('pawn', gameOptions.board[i][j].type);
                row.children[j].firstElementChild.setAttribute('color', gameOptions.board[i][j].color);
                SetIcons(row.children[j]);
            }
            else
            {
                row.children[j].firstElementChild.setAttribute('src', '');
                row.children[j].firstElementChild.setAttribute('pawn', '');
                row.children[j].firstElementChild.setAttribute('color', '');
            }
        }
    }
}

let pawnPosition = { };
for (let i = 0; i < board.children.length; i++) //po dzieciqach planczy
{
    const row = board.children[i]; //kolumna
    for (let j = 0; j < row.children.length; j++) // po dzieciach kolumn
    {
        const element = row.children[j]; 

        SetIcons(element);

        element.addEventListener('click', () =>
        {
            const pos = { x: parseInt(element.getAttribute('x')), y: parseInt(element.getAttribute('y')) };

            if(playerIndex == 0)
            {
                if(element.firstElementChild.getAttribute('color') == "w")
                    pawnPosition = pos; // obiekt z x i y danego pola
            }
            else
            {
                if(element.firstElementChild.getAttribute('color') == "b")
                    pawnPosition = pos; // obiekt z x i y danego pola
            }

            if(pawnPosition != pos && pawnPosition.x != undefined && pawnPosition.y != undefined) // jesli sa zdefiniowanie 
                socket.emit('szachy/move', { code, game, pawn: pawnPosition, pos });
        });
    }
}

socket.on('szachy/move/res', (msg) =>
{
    if(msg.status == "error")
        SpawnAlert(3, msg.message);

    const gameBoard = msg.additional.board;

    for (let i = 0; i < gameBoard.length; i++) //po dzieciqach planczy
    {
        for (let j = 0; j < gameBoard[i].length; j++) 
        {
            const row = board.querySelector(`[y='${8 - (i)}'][x='${j}']`); //kolumna
            if(gameBoard[i][j] != null)
            {
                row.firstElementChild.setAttribute('pawn', gameBoard[i][j].type);
                row.firstElementChild.setAttribute('color', gameBoard[i][j].color);
                SetIcons(row);
            }
            else
            {
                row.firstElementChild.setAttribute('src', '');
                row.firstElementChild.setAttribute('pawn', '');
                row.firstElementChild.setAttribute('color', '');
            }
        }
    }
    
    playerTurnText.innerText = msg.additional.turn.name;
});

let pPawn = undefined;
let pMove = undefined;
socket.on('szachy/pawnOnEnd', (msg) =>
{
    pPawn = msg.additional.pawn;
    pMove = msg.additional.move;
    
    pawnSelect.classList.remove('hidden');
});
for (let i = 0; i < pawnSelect.children.length; i++) 
{
    const div = pawnSelect.children[i];

    div.addEventListener('click', () =>
    {
        if(pPawn == undefined) return;
        if(pMove == undefined) return;

        socket.emit('szachy/choosePawn', { code, game, pawn: pPawn, move: pMove, choice: div.getAttribute('pawn') }); // wysyłam wiadomosc na serwer, z wiadomością jaki pioneczek sobie zamiast tego zwykłego wybrał użytkonik

        pPawn = undefined;
        pMove = undefined;

        pawnSelect.classList.add('hidden');
    });
}

socket.on('szachy/choosePawn/res', (msg) =>
{
    if(msg.status == "error")
    {
        SpawnAlert(3, msg.message);
        pawnSelect.classList.remove('hidden');
    }
});

function CheckPlayer()
{
    const boardContainer = document.querySelector('.boardContainer');

    if(playerIndex == 1)
    {
        for (let i = 1; i < board.childNodes.length; i++)
        {
            for (let j = 1; j < board.childNodes[i].childNodes.length; j++)
                board.childNodes[i].insertBefore(board.childNodes[i].childNodes[j], board.childNodes[i].firstChild);
            board.insertBefore(board.childNodes[i], board.firstChild);
        }
        for (let i = 1; i < boardContainer.childNodes.length; i++)
        {
            for (let j = 1; j < boardContainer.childNodes[i].childNodes.length; j++)
                boardContainer.childNodes[i].insertBefore(boardContainer.childNodes[i].childNodes[j], boardContainer.childNodes[i].firstChild);
            boardContainer.insertBefore(boardContainer.childNodes[i], boardContainer.firstChild);
        }
        for (let i = 0; i < pawnSelect.children.length; i++) 
        {
            const img = pawnSelect.children[i].querySelector('img');
            const splited = img.src.split('/');

            img.src = `../img/games/b${splited[splited.length - 1].slice(1)}`;
        }
    }
}

function SetIcons(element)
{
    let color = element.firstElementChild.getAttribute('color');

    switch (element.firstElementChild.getAttribute('pawn'))
    {
        case 'p':
            element.firstElementChild.setAttribute('src', `../img/games/${color}Pawn.png`);
        break;
        case 'r':
            element.firstElementChild.setAttribute('src', `../img/games/${color}Rook.png`);
        break;
        case 'n':
            element.firstElementChild.setAttribute('src', `../img/games/${color}Knight.png`);
        break;
        case 'b':
            element.firstElementChild.setAttribute('src', `../img/games/${color}Bishop.png`);
        break;
        case 'q':
            element.firstElementChild.setAttribute('src', `../img/games/${color}Queen.png`);
        break;
        case 'k':
            element.firstElementChild.setAttribute('src', `../img/games/${color}King.png`);
        break;
        default:
            element.firstElementChild.setAttribute('src', ``);
    }
}

CheckPlayer();