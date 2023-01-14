const inGame = document.querySelector('.ingame');

const boards = inGame.querySelector('.boards');

let playerBoard = boards.querySelector('.playerBoard');
let enemyBoard = boards.querySelector('.enemyBoard');

const preparation = document.querySelector('.preparation');
const prepBoard = preparation.querySelector('.board');
const submitBtn = preparation.querySelector('.submit');
const randomBtn = preparation.querySelector('.random');

let ships = document.querySelector('.ships');
const possibleShips = [
    [1, 1, 1, 1], 
    [1, 1, 1], [1, 1, 1],
    [1, 1], [1, 1], [1, 1],
    [1], [1], [1], [1]
];

let draggedShip = null;
let onBoard = false;
let shipPos = null;

window.addEventListener('keydown', event =>
{
    if(event.code == "KeyR")
    {
        if(draggedShip == null)
        {
            for (let i = 0; i < ships.children.length; i++) 
            {
                if(ships.children[i].classList.contains('dragged')) continue;

                if(!ships.children[i].classList.contains('rotated'))
                    ships.children[i].classList.add('rotated');
                else
                    ships.children[i].classList.remove('rotated');
            }
        }
        else
        {
            if(!draggedShip.classList.contains('rotated'))
                draggedShip.classList.add('rotated');
            else
                draggedShip.classList.remove('rotated');
        }
    }
});

randomBtn.addEventListener('click', async () =>
{
    const result = await fetch(`/api/statki/randomizeBoard`, ).then(res => res.json()).then(data => data);

    if(result.status != "ok") return;

    const shipsPos = result.message.ships;

    for (let i = 0; i < prepBoard.children.length; i++) 
    {
        const row = prepBoard.children[i];

        for (let j = 0; j < row.children.length; j++)
            row.children[j].setAttribute('fieldI', 0);
    }

    for (let i = 0; i < shipsPos.length; i++) 
    {
        let rotated = false;

        if(shipsPos[i].length > 1)
            rotated = shipsPos[i][0].y != shipsPos[i][1].y ? false : true;

        let positions = new Array();
        for (let j = 0; j < shipsPos[i].length; j++) 
        {
            const ship = shipsPos[i][j];
            
            positions.push({ x: shipsPos[i][j].x, y: shipsPos[i][j].y });
            
            prepBoard.children[ship.y].children[ship.x].setAttribute('fieldI', 1);
            RoundShipPosition(prepBoard, ship.x, ship.y, -1);
        }
        clientRect = prepBoard.children[shipsPos[i][0].y].children[shipsPos[i][0].x].getBoundingClientRect();

        ships.children[i].style.left = `${clientRect.left}px`;
        ships.children[i].style.top = `${clientRect.top}px`;

        ships.children[i].classList.add('dragged');
        if(rotated)
            ships.children[i].classList.add('rotated');
        else if(ships.children[i].classList.contains('rotated'))
            ships.children[i].classList.remove('rotated');

        ships.children[i].setAttribute('positions', JSON.stringify(positions));
    }
});

submitBtn.addEventListener('click', async () =>
{
    const allPositions = new Array();

    for (let i = 0; i < ships.children.length; i++) 
    {
        const ship = ships.children[i];

        const shipPosition = JSON.parse(ship.getAttribute('positions'));
        allPositions.push(shipPosition);
    }

    socket.emit('statki/setPositions', { game, code, allPositions });
});

socket.on('statki/setPositions/res', (msg) =>
{
    if(msg.status == "error")
        SpawnAlert(3, msg.message);
        
    const gameStarted = msg.additional.started;

    started = gameStarted;

    CheckPlayer();

    SpawnAlert(1, "Statki zostały rozstawione");
});

function GameStart(gameOptions)
{
    CheckPlayer();
}
function GameRestart(gameOptions)
{
    for (let i = 0; i < enemyBoard.children.length; i++) 
    {
        const row = enemyBoard.children[i];
        for (let j = 0; j < row.children.length; j++)
            row.children[j].setAttribute('fieldI', 0)
    }
    for (let i = 0; i < playerBoard.children.length; i++) 
    {
        const row = playerBoard.children[i];
        for (let j = 0; j < row.children.length; j++)
            row.children[j].setAttribute('fieldI', 0)
    }

    started = false;

    inGame.classList.add('hidden');

    preparation.classList.remove('hidden');
}

function CheckPlayer()
{
    if(playerIndex == 1)
    {
        enemyBoard.classList.remove('enemyBoard');
        playerBoard.classList.remove('playerBoard');
        
        enemyBoard.classList.add('playerBoard');
        playerBoard.classList.add('enemyBoard');

        const enemyBoardCopy = enemyBoard;
        enemyBoard = playerBoard;
        playerBoard = enemyBoardCopy;

        boards.insertBefore(playerBoard.parentNode, enemyBoard.parentNode);
    }

    if(playerIndex != -1 && !started)
    {
        preparation.classList.remove('hidden');

        if(ships.children.length > 0) return;

        for (let i = 0; i < possibleShips.length; i++) 
            ships.appendChild(GenerateShip(i));

        for (let i = 0; i < prepBoard.children.length; i++) 
        {
            const row = prepBoard.children[i];
            for (let j = 0; j < row.children.length; j++) 
            {
                row.children[j].addEventListener('mouseover', event => PlaceShip(prepBoard, row, i, j));
                row.children[j].addEventListener('mouseup', event => PlaceShip(prepBoard, row, i, j));
                row.children[j].addEventListener('mouseleave', () => 
                {
                    onBoard = false;
                    onPositions = [];
                    shipPos = null;
                });
            }
        }
    }
    else if(started)
    {
        preparation.classList.add('hidden');
        inGame.classList.remove('hidden');

        if(playerIndex == -1) return;

        socket.emit('statki/secretBoard', { code, game });

        for (let i = 0; i < enemyBoard.children.length; i++) 
        {
            const row = enemyBoard.children[i];
            for (let j = 0; j < row.children.length; j++) 
            {
                row.children[j].addEventListener('click', () =>
                {
                    socket.emit('statki/shoot', { code, game, pos: { x: j, y: i } });
                });
            }
        }
    }
}

socket.on('statki/secretBoard/res', (msg) =>
{
    if(msg.status == "error")
        SpawnAlert(3, msg.message);

    const board = msg.additional.board;
    for (let i = 0; i < playerBoard.children.length; i++) 
    {
        const row = playerBoard.children[i];
        for (let j = 0; j < row.children.length; j++)
            row.children[j].setAttribute('fieldI', board[i][Object.keys(board[i])[j]]);
    }
});

socket.on('statki/shoot/res', (msg) =>
{
    if(msg.status == "error")
        SpawnAlert(3, msg.message);

    const pos = msg.additional.positions;
    const playerI = msg.additional.playerIndex;
    
    playerTurnText.innerText = msg.additional.turn.name;

    if(playerI != -1 && playerI == playerIndex)
    {
        pos.forEach(currentPos => 
        {
            const fieldI = currentPos.fieldI === undefined ? -1 : currentPos.fieldI;

            enemyBoard.children[currentPos.y].children[currentPos.x].setAttribute('fieldI', fieldI);
        });
    }
    else
        socket.emit('statki/secretBoard', { code, game });
});

function GenerateShip(index)
{
    const div = document.createElement('div');
    div.setAttribute('positions', "[]");

    div.addEventListener('mousedown', event =>
    {
        document.querySelector('body').style.userSelect = 'none';

        draggedShip = div;
        draggedShip.classList.add('dragging');
        
        const positions = JSON.parse(draggedShip.getAttribute('positions'));
        if(positions.length > 0)
            for (let i = 0; i < positions.length; i++)
            {
                prepBoard.children[positions[i].y].children[positions[i].x].setAttribute('fieldI', 0);
                
                for (let y = 0; y < prepBoard.children.length; y++) 
                {
                    const row = prepBoard.children[y];

                    for (let x = 0; x < row.children.length; x++)
                    {
                        if(row.children[x].getAttribute('fieldI') == -1)
                            row.children[x].setAttribute('fieldI', 0);
                    }
                }
                for (let y = 0; y < prepBoard.children.length; y++) 
                {
                    const row = prepBoard.children[y];

                    for (let x = 0; x < row.children.length; x++)
                    {
                        if(row.children[x].getAttribute('fieldI') == 1)
                            RoundShipPosition(prepBoard, x, y, -1);
                    }
                }
            }
    });
    window.addEventListener('mouseup', event =>
    {
        if(draggedShip == null) return;
        
        const positions = JSON.parse(draggedShip.getAttribute('positions'));

        if(shipPos != null)
        {
            draggedShip.classList.add('dragged');
            draggedShip.style.left = `${shipPos.left}px`;
            draggedShip.style.top = `${shipPos.top}px`;

            for (let i = 0; i < positions.length; i++)
            {
                prepBoard.children[positions[i].y].children[positions[i].x].setAttribute('fieldI', 1);
                RoundShipPosition(prepBoard, positions[i].x, positions[i].y, -1);
            }
        }
        else
        {
            draggedShip.setAttribute('positions', "[]");
            draggedShip.classList.remove('dragged');
            draggedShip.style.left = `unset`;
            draggedShip.style.top = `unset`;
        }

        draggedShip.classList.remove('dragging');
        
        document.querySelector('body').style.userSelect = '';

        draggedShip = null;
    });
    window.addEventListener('mousemove', event =>
    {
        if(draggedShip == null) return;

        if(!onBoard)
        {
            draggedShip.style.left = `${event.clientX}px`;
            draggedShip.style.top = `${event.clientY}px`;
        }
    });

    for (let i = 0; i < possibleShips[index].length; i++) 
    {
        const shipPart = document.createElement('div');
        div.appendChild(shipPart);
    }

    return div;
}

function PlaceShip(board, row, i, j)
{
    if(draggedShip == null) return;
    if(row.children[j].getAttribute('fieldI') != 0) return;

    let biggest = draggedShip.classList.contains('rotated') ? j : i;
    
    const positions = new Array();
    if(!draggedShip.classList.contains('rotated'))
        positions.push({ x: j, y: biggest });
    else
        positions.push({ x: biggest, y: i });

    let iDown = draggedShip.classList.contains('rotated') ? j : i;
    let iUp = draggedShip.classList.contains('rotated') ? j : i;
    
    let counter = 0;
    let index = 0;
    while (index < draggedShip.children.length - 1)
    {
        let checkPosDown = -1;
        let checkPosUp = -1;
        if(iDown < board.children.length - 1)
            checkPosDown = draggedShip.classList.contains('rotated') ? parseInt(board.children[i].children[iDown + 1].getAttribute('fieldI')) : parseInt(board.children[iDown + 1].children[j].getAttribute('fieldI'));
        if(iUp > 1)
            checkPosUp = draggedShip.classList.contains('rotated') ? parseInt(board.children[i].children[iUp - 1].getAttribute('fieldI')) : parseInt(board.children[iUp - 1].children[j].getAttribute('fieldI'));

        if(iDown < board.children.length - 1 && checkPosDown == 0)
        {
            iDown++;

            if(!draggedShip.classList.contains('rotated'))
                positions.push({ x: j, y: iDown });
            else
                positions.push({ x: iDown, y: i });

            counter++;
        }
        else if(iUp > 1 && checkPosUp == 0)
        {
            iUp--;

            if(!draggedShip.classList.contains('rotated'))
                positions.push({ x: j, y: iUp });
            else
                positions.push({ x: iUp, y: i });

            counter++;
        }
        
        if(biggest > iDown)
            biggest = iDown;
        if(biggest > iUp)
            biggest = iUp;

        index++;
    }

    if(counter != index) return;

    let clientRect = board.children[biggest].children[j].getBoundingClientRect()
    if(draggedShip.classList.contains('rotated'))
        clientRect = board.children[i].children[biggest].getBoundingClientRect();

    shipPos = clientRect;

    draggedShip.style.left = `${clientRect.left}px`;
    draggedShip.style.top = `${clientRect.top}px`;

    draggedShip.setAttribute('positions', JSON.stringify(positions));
    onBoard = true;
}

function RoundShipPosition(board, x, y, value)
{
    if(y - 1 >= 0)
    {
        if(x - 1 >= 0)
            if(board.children[y - 1].children[x - 1].getAttribute('fieldI') != 1)
                board.children[y - 1].children[x - 1].setAttribute('fieldI', value);
        
        if(board.children[y - 1].children[x].getAttribute('fieldI') != 1)
            board.children[y - 1].children[x].setAttribute('fieldI', value);
        
        if(x + 1 <= board.children[y - 1].children.length - 1)
            if(board.children[y - 1].children[x + 1].getAttribute('fieldI') != 1)
                board.children[y - 1].children[x + 1].setAttribute('fieldI', value);
    }

    if(x - 1 >= 0)
        if(board.children[y].children[x - 1].getAttribute('fieldI') != 1)
            board.children[y].children[x - 1].setAttribute('fieldI', value);
    
    if(x + 1 <= board.children[y].children.length - 1)
        if(board.children[y].children[x + 1].getAttribute('fieldI') != 1)
            board.children[y].children[x + 1].setAttribute('fieldI', value);

    if(y + 1 <= board.children.length - 1)
    {
        if(x - 1 >= 0)
            if(board.children[y + 1].children[x - 1].getAttribute('fieldI') != 1)
                board.children[y + 1].children[x - 1].setAttribute('fieldI', value);
        
        if(board.children[y + 1].children[x].getAttribute('fieldI') != 1)
            board.children[y + 1].children[x].setAttribute('fieldI', value);
        
        if(x + 1 <= board.children[y + 1].children.length - 1)
            if(board.children[y + 1].children[x + 1].getAttribute('fieldI') != 1)
                board.children[y + 1].children[x + 1].setAttribute('fieldI', value);
    }
}

CheckPlayer();