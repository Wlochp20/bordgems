const board = document.querySelector('.board'); // cała plansza 

function GameStart(gameOptions)
{
    CheckPlayer();
}
function GameRestart(gameOptions)
{
    for (let i = 0; i < gameOptions.board.length; i++)
    {
        let j = 0;
        for (const key in gameOptions.board[i]) 
        {
            board.querySelector(`[x="${j}"][y="${i}"]`).firstElementChild.setAttribute('pawn', gameOptions.board[i][key]);

            j++;
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

        element.addEventListener('click', () =>
        {
            const pos = { x: parseInt(element.getAttribute('x')), y: parseInt(element.getAttribute('y')) };

            if(playerIndex == 0)
            {
                if(element.firstElementChild.getAttribute('pawn') > 0)
                    pawnPosition = pos; // obiekt z x i y danego pola
            }
            else
            {
                if(element.firstElementChild.getAttribute('pawn') < 0)
                    pawnPosition = pos; // obiekt z x i y danego pola
            }
            
            if(element.firstElementChild.getAttribute('pawn') == 0 && pawnPosition.x != undefined && pawnPosition.y != undefined) // jesli sa zdefiniowanie 
                socket.emit('warcaby/move', { code, game, pawn: pawnPosition, pos });
        });
    }
}

socket.on('warcaby/move/res', (msg) =>
{
    if(msg.status == "error")
        SpawnAlert(3, msg.message);

    const pawn = msg.additional.pawn;
    const pos = msg.additional.pos;
    const pawnI = msg.additional.pawnI;
    const attack = msg.additional.attack;

    board.querySelector(`[x="${pos.x}"][y="${pos.y}"]`).firstElementChild.setAttribute('pawn', pawnI);
    board.querySelector(`[x="${pawn.x}"][y="${pawn.y}"]`).firstElementChild.setAttribute('pawn', 0);
    
    playerTurnText.innerText = msg.additional.turn.name;

    if(attack == undefined) return;

    board.querySelector(`[x="${attack.x}"][y="${attack.y}"]`).firstElementChild.setAttribute('pawn', 0);
});

function CheckPlayer()
{
    const boardContainer = document.querySelector('.boardContainer');

    if(playerIndex == 1)
    {
        if(board.childNodes[1].childNodes[1].getAttribute('y') != 0) return;

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
    }
}

CheckPlayer();