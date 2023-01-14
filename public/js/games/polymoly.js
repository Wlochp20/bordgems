const container = document.querySelector('.container');
//zabawa z obsługą pól specjalnych
container.querySelectorAll('.choice').forEach(choice => 
{
    choice.addEventListener('click', () =>
    {
        const property = JSON.parse(container.querySelector('.buyProperty').getAttribute('property'));
        const pChoice = choice.getAttribute('choice');

        if(property == undefined) return;
        if(pChoice == undefined) return;
        
        socket.emit('polymoly/buyProperty', { game, code, property: property, choice: pChoice });
    });
});

container.querySelector('.buyProperty').querySelector('.close').addEventListener('click', () =>
{
    const property = JSON.parse(container.querySelector('.buyProperty').querySelector('.close').getAttribute('property'));

    if(property == undefined) return;

    socket.emit('polymoly/buyProperty', { game, code, property: property, choice: -1 });
});

container.querySelector('.island').querySelector('.buy').addEventListener('click', () =>
{
    const property = JSON.parse(container.querySelector('.island').getAttribute('property'));

    if(property == undefined) return;

    socket.emit('polymoly/buyProperty', { game, code, property: property, choice: 0 });
});
container.querySelector('.island').querySelector('.close').addEventListener('click', () =>
{
    const property = JSON.parse(container.querySelector('.island').getAttribute('property'));

    if(property == undefined) return;

    socket.emit('polymoly/buyProperty', { game, code, property: property, choice: -1 });
});

let desiredPosition = 0;

container.querySelector('.jail').querySelectorAll('div').forEach(choice =>
{
    choice.addEventListener('click', () =>
    {
        const pChoice = choice.getAttribute('choice');
        
        if(pChoice == undefined) return;

        socket.emit('polymoly/move', { game, code, newPosition: desiredPosition, choice: pChoice });
    });
});

container.querySelector('.tradeW').querySelector('.cancel').addEventListener('click', () =>
{
    socket.emit('polymoly/tradeAccept', { game, code, choice: 0, playerI: playerIndex });
});
container.querySelector('.tradeW').querySelector('.accept').addEventListener('click', () =>
{
    socket.emit('polymoly/tradeAccept', { game, code, choice: 1, playerI: playerIndex });
});

const board = document.querySelector('.board');

const moneyDiv = document.querySelector('.money');
const moveBtn = document.querySelector('.move');

const trade = document.querySelector('.trade');
const showBtn = trade.querySelector('.show');
const tradeSelect = trade.querySelector('select');

const trades = trade.querySelector('.trades');

const pawnColors = ['green', 'red', 'blue', 'yellow'];

let currentField = 6;

for (let i = 0; i < board.children.length; i++) 
{
    const row = board.children[i];

    for (let j = 0; j < row.children.length; j++)
    {
        if(row.children[j].getAttribute('index') == undefined) continue;

        row.children[j].addEventListener('click', () => desiredPosition = parseInt(row.children[j].getAttribute('index')));
    }
}

let inJail = false;
let closeContainer = true;
moveBtn.addEventListener('click', () =>
{
    let choice = 0;
    if(currentField == 4)
    {
        inJail = true;

        container.classList.remove('hidden');
        const jail = container.querySelector('.jail');
        jail.classList.remove('hidden');

        return;
    }
    
    socket.emit('polymoly/move', { game, code, newPosition: desiredPosition, choice });
});

showBtn.addEventListener('click', async () =>
{
    const playerI = tradeSelect.children[tradeSelect.selectedIndex].value;

    const result = await fetch('/api/polymoly/getTradables', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            game, code,
            playerI
        })
    }).then(res => res.json())

    if(result.status == "error")
        return console.log(result);

    const reqPlayerTradables = result.message.reqPlayerTradables;
    const playerTradables = result.message.playerTradables;

    trades.innerHTML = "";

    const tradeFrom = document.createElement('div');
    tradeFrom.innerHTML = GenerateTradeDiv(reqPlayerTradables).innerHTML;
    
    const tradeFor = document.createElement('div');
    tradeFor.innerHTML = GenerateTradeDiv(playerTradables).innerHTML;
    
    const tradeBtn = document.createElement('button');
    tradeBtn.innerText = "Handluj"
    
    tradeBtn.addEventListener('click', () =>
    {
        const from = new Array();

        const checkboxesFrom = tradeFrom.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxesFrom.length; i++) 
        {
            const checkbox = checkboxesFrom[i];

            if(!checkbox.checked) continue;

            from.push(JSON.parse(checkbox.value));
        }

        const moneyFrom = parseInt(tradeFrom.querySelector('.moneyInput').value);
        if(!isNaN(moneyFrom))
            from.push({ type: 3, amount: moneyFrom });
        
        const to = new Array();

        const checkboxesFor = tradeFor.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxesFor.length; i++) 
        {
            const checkbox = checkboxesFor[i];

            if(!checkbox.checked) continue;

            to.push(JSON.parse(checkbox.value));
        }
        
        const moneyTo = parseInt(tradeFor.querySelector('.moneyInput').value);
        if(!isNaN(moneyTo))
            to.push({ type: 3, amount: moneyTo });

        socket.emit('polymoly/trade', { game, code, playerI, from, to });
    });

    trades.appendChild(tradeFrom);
    trades.appendChild(tradeFor);
    trades.appendChild(tradeBtn);
});
socket.on('polymoly/trade/res', (msg) =>
{
    if(msg.status == "error")
        return SpawnAlert(3, msg.message);

    const playerI = msg.additional.trade.to;
    const from = msg.additional.trade.from;
    const offer = msg.additional.trade.offer;

    if(playerI != playerIndex && from != playerIndex)
        SpawnAlert(0, `${msg.additional.players[from].name} wysłał oferte do ${msg.additional.players[playerI].name}`);
    else if(playerI == playerIndex)
    {
        SpawnAlert(0, `${msg.additional.players[from].name} wysyła ci oferte`);

        container.classList.remove('hidden');
        const tradeW = container.querySelector('.tradeW');
        tradeW.classList.remove('hidden');

        const fromO = tradeW.querySelector('.from');
        offer.from.forEach(el => 
        {
            const li = document.createElement('li');

            switch (parseInt(el.type)) {
                case 1:
                    li.innerText = `${msg.additional.board[el.index].name}`;
                    fromO.querySelector('.props').querySelector('.content').appendChild(li);
                break;
                case 2:
                    li.innerText = el.name;
                    fromO.querySelector('.chances').querySelector('.content').appendChild(li);
                break;
                case 3:
                    li.innerText = `${el.amount}k`;
                    fromO.querySelector('.moneyO').querySelector('.content').appendChild(li);
                break;
            }
        });

        const forO = tradeW.querySelector('.for');
        offer.for.forEach(el => 
        {
            const li = document.createElement('li');

            switch (parseInt(el.type)) {
                case 1:
                    li.innerText = msg.additional.board[el.index].name;
                    forO.querySelector('.props').querySelector('.content').appendChild(li);
                break;
                case 2:
                    li.innerText = el.name;
                    forO.querySelector('.chances').querySelector('.content').appendChild(li);
                break;
                case 3:
                    li.innerText = `${el.amount}k`;
                    forO.querySelector('.moneyO').querySelector('.content').appendChild(li);
                break;
            }
        });
    }
});
socket.on('polymoly/tradeAccept/res', (msg) =>
{
    if(msg.status == "error")
        return SpawnAlert(3, msg.message);

    const accept = msg.additional.accept;
    
    if(!accept)
        SpawnAlert(3, msg.message);
    else
        SpawnAlert(1, msg.message);

    container.classList.add('hidden');
    const tradeW = container.querySelector('.tradeW');
    tradeW.classList.add('hidden');

    if(!accept) return;
    
    const boardI = msg.additional.boardI;
    const price = msg.additional.prices;
    const pawnI = msg.additional.pawnI;
    
    for (let i = 0; i < boardI.length; i++) 
    {
        const field = board.querySelector(`[index='${boardI[i]}']`);
        field.querySelector('.price').innerText = `${price[i]}$`;
        field.querySelector('.price').style.cssText = `--pawn-color: ${pawnColors[pawnI[i]]};`;
    }

    for (let i = 0; i < playersAmount; i++) 
    {
        const money = msg.additional.money;
        playersMoney = money;
        ChangeMoney(i);
    }
});

function GenerateTradeDiv(tradables)
{
    const div = document.createElement('div');

    const checkboxes = tradables.filter(tradable => tradable.type <= 2);
    for (let i = 0; i < checkboxes.length; i++) 
    {
        const wraper = document.createElement('div');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = i;
        checkbox.value = JSON.stringify({ type: checkboxes[i].type, index: checkboxes[i].index });

        const label = document.createElement('label');
        label.setAttribute('for', i);
        label.innerText = checkboxes[i].tradable.name;

        wraper.appendChild(checkbox);
        wraper.appendChild(label);
        
        div.appendChild(wraper);
    }

    const moneyInput = document.createElement('input');
    moneyInput.classList.add('moneyInput');
    moneyInput.placeholder = "Ilość pieniędzy w tysiącach";
    
    div.appendChild(moneyInput);

    return div;
}

socket.on('polymoly/move/res', (msg) =>
{
    if(msg.status == "error")
        return SpawnAlert(3, msg.message);

    SpawnAlert(1, `${msg.additional.firstDice == msg.additional.secondDice ? "Wyrzucono dublet!" : "Nie wyrzucono dubletu!"}`);
    
    if(inJail)
    {
        if(closeContainer)
            container.classList.add('hidden');
        const jail = container.querySelector('.jail');
        jail.classList.add('hidden');
    }
    closeContainer = true;
    inJail = false;

    playerTurnText.innerText = msg.additional.turn.name;

    const oldPos = msg.additional.oldPosition;
    const newPos = msg.additional.newPosition;
    const pawnI = msg.additional.pawnI;
    const electricity = msg.additional.electricity;

    for (let i = 0; i < electricity.length; i++) 
    {
        const field = board.querySelector(`[index="${electricity[i].index}"]`);

        if(electricity[i].amount > 0)
            field.classList.add('electricityOff');
        else
            field.classList.remove('electricityOff');
    }

    const money = msg.additional.money;
    playersMoney = money;
    
    const fields = msg.additional.onField;
    playersField = fields;
    
    const turn = msg.additional.turn;
    playerTurn = turn;

    SetPawnPositions(oldPos, newPos, pawnI);
    for (let i = 0; i < playersAmount; i++)
        ChangeMoney(i);
    CheckField(playersField);
});

socket.on('polymoly/championship', (msg) =>
{
    const properties = msg.additional.properties;

    for (let i = 0; i < board.children.length; i++) 
    {
        const row = board.children[i];
    
        for (let j = 0; j < row.children.length; j++)
        {
            if(row.children[j].getAttribute('index') == undefined) continue;
            
            row.children[j].classList.add('invisible');

            if(!properties.some(property => parseInt(row.children[j].getAttribute('index')) == property)) continue;
        
            row.children[j].classList.add('canClick');
            row.children[j].classList.remove('invisible');

            row.children[j].addEventListener('click', SelectChampionship);
            
            function SelectChampionship()
            {
                const desPos = parseInt(row.children[j].getAttribute('index'));
                
                socket.emit('polymoly/selectChampionship', { game, code, property: desPos });
                
                for (let x = 0; x < board.children.length; x++) 
                {
                    for (let y = 0; y < board.children[x].children.length; y++)
                    {
                        board.children[x].children[y].classList.remove('canClick');
                        board.children[x].children[y].classList.remove('invisible');
                        
                        board.children[x].children[y].removeEventListener('click', SelectChampionship);
                    }
                }
            }
        }
    }

    socket.emit('polymoly/selectChampionship', { game, code, property: desiredPosition });
});
socket.on('polymoly/selectChampionship/res', (msg) =>
{
    if(msg.status == "error")
        return console.log(msg);
        
    playerTurnText.innerText = msg.additional.turn.name;

    const pawnI = msg.additional.pawnI;
    const boardI = msg.additional.boardI;
    const price = msg.additional.price;
    const lastChampions = msg.additional.lastChampions;

    for (let i = 0; i < lastChampions.length; i++) 
    {
        const field = board.querySelector(`[index='${boardI[i]}']`);
        field.querySelector('.price').innerText = `${price[i]}$`;
        field.classList.remove('champions');
    }

    const field = board.querySelector(`[index='${boardI}']`);
    field.querySelector('.price').innerText = `${price}$`;
    field.classList.add('champions');
});

socket.on('polymoly/chanceDestroy', (msg) =>
{
    const properties = msg.additional.properties;

    for (let i = 0; i < board.children.length; i++) 
    {
        const row = board.children[i];
    
        for (let j = 0; j < row.children.length; j++)
        {
            if(row.children[j].getAttribute('index') == undefined) continue;
            
            row.children[j].classList.add('invisible');

            if(!properties.some(property => parseInt(row.children[j].getAttribute('index')) == property)) continue;
        
            row.children[j].classList.add('canClick');
            row.children[j].classList.remove('invisible');
            
            row.children[j].addEventListener('click', SelectChance);
            
            function SelectChance()
            {
                const desPos = parseInt(row.children[j].getAttribute('index'));
                
                socket.emit('polymoly/selectChanceDestroy', { game, code, property: desPos });

                for (let x = 0; x < board.children.length; x++) 
                {
                    const row = board.children[x];
                
                    for (let y = 0; y < row.children.length; y++)
                    {
                        row.children[y].removeEventListener('click', SelectChance);
                        board.children[x].children[y].classList.remove('canClick');
                        board.children[x].children[y].classList.remove('invisible');
                    }
                }
            }
        }
    }
});
socket.on('polymoly/selectChanceDestroy/res', (msg) =>
{
    if(msg.status == "error")
        return console.log(msg);
        
    playerTurnText.innerText = msg.additional.turn.name;

    const pawnI = msg.additional.pawnI;
    const boardI = msg.additional.boardI;
    const price = msg.additional.price;
    const action = msg.additional.action;

    for (let i = 0; i < boardI.length; i++) 
    {
        const field = board.querySelector(`[index='${boardI[i]}']`);
        field.querySelector('.price').innerText = `${price[i]}$`;
    }

    if(action == 1)
        field.classList.add('electricityOff');
});
socket.on('polymoly/chance', (msg) =>
{
    if(msg.status == "error") return;
        
    const chance = document.querySelector('.chance');
    chance.classList.remove('hidden');

    chance.querySelector('h2').innerText = `Szansa \n(${msg.additional.title})`;
    chance.querySelector('.text').innerText = `${msg.additional.desc}`;

    setTimeout(() => chance.classList.add('hidden'), 5000);
});

socket.on('polymoly/propertyStand', (msg) =>
{
    const property = msg.additional.info;

    closeContainer = false;
    if(property.type == 1)
    {
        container.classList.remove('hidden');
        const buyProperty = container.querySelector('.buyProperty');
        buyProperty.classList.remove('hidden');
        buyProperty.setAttribute('property', JSON.stringify(property));
        buyProperty.querySelector('.close').setAttribute('property', JSON.stringify(property));

        buyProperty.querySelector('h2').innerText = property.name;
        buyProperty.style.cssText = `--field-color: ${property.additional.color}`;

        const choices = buyProperty.querySelectorAll('.choice');
        for (let i = 0; i < choices.length; i++) 
        {
            const choice = choices[i];
            
            choice.querySelector('.cost').innerText = `Kwota: ${property.additional.prices[i]}k`;
            choice.querySelector('.price').innerText = `Czynsz: ${property.additional.rent[i]}k`;

            if(property.additional.amountLodges < i) 
            {
                choice.classList.remove('bought');
                continue;
            }
            
            choice.classList.add('bought');
        }
        if(!msg.additional.threwStart)
            choices[choices.length - 2].classList.add('locked');
        else
            choices[choices.length - 2].classList.remove('locked');

        if(property.additional.amountLodges != 3)
            choices[choices.length - 1].classList.add('locked');
        else
            choices[choices.length - 1].classList.remove('locked');
    }
    if(property.type == 2)
    {
        container.classList.remove('hidden');
        const island = container.querySelector('.island');
        island.classList.remove('hidden');
        island.setAttribute('property', JSON.stringify(property));

        island.querySelector('h2').innerText = property.name;

        island.querySelector('.cost').innerText = `Kwota: ${property.additional.prices[property.additional.amountLodges + 1]}k`;
        island.querySelector('.price').innerText = `Czynsz: ${property.additional.rent[0]}k`;
        island.querySelector('.amount').innerText = `Posiadane: ${property.additional.amountLodges + 1}/4`;
    }
});
socket.on('polymoly/buyProperty/res', (msg) =>
{
    if(msg.status == "error")
        return SpawnAlert(3, msg.message);

    SpawnAlert(1, msg.message);
    
    container.classList.add('hidden');
    const buyProperty = container.querySelector('.buyProperty');
    buyProperty.classList.add('hidden');
    const island = container.querySelector('.island');
    island.classList.add('hidden');
    
    playerTurnText.innerText = msg.additional.turn.name;

    const pawnI = msg.additional.pawnI;
    const boardI = msg.additional.boardI;
    const price = msg.additional.price;

    for (let i = 0; i < boardI.length; i++) 
    {
        const field = board.querySelector(`[index='${boardI[i]}']`);
        field.querySelector('.price').innerText = `${price[i]}$`;
        field.querySelector('.price').style.cssText = `--pawn-color: ${pawnColors[pawnI]};`;
    }

    const money = msg.additional.money;
    playersMoney = money;
    ChangeMoney(pawnI);
});

let bankrupcyProperties = undefined;
socket.on('polymoly/bankrupcy', (msg) =>
{
    bankrupcyProperties = msg.additional.properties;

    const property = JSON.parse(prompt(`Wybierz z ${JSON.stringify(bankrupcyProperties)}?`));
    
    socket.emit('polymoly/sellProperty', { game, code, properties: property });
});
socket.on('polymoly/sellProperty/res', (msg) =>
{
    if(msg.status == "error")
    {
        if(bankrupcyProperties == undefined) return console.log(msg);

        const property = JSON.parse(prompt(`Wybierz z ${JSON.stringify(bankrupcyProperties)}?`));
    
        socket.emit('polymoly/sellProperty', { game, code, properties: property });
    }
    
    bankrupcyProperties = undefined;
        
    playerTurnText.innerText = msg.additional.turn.name;

    const pawnI = msg.additional.pawnI;
    const boardI = msg.additional.boardI;
    const price = msg.additional.price;

    for (let i = 0; i < boardI.length; i++) 
    {
        const field = board.querySelector(`[index='${boardI[i]}']`);
        field.querySelector('.price').innerText = `${price[i]}$`;
    }

    const money = msg.additional.money;
    playersMoney = money;
    ChangeMoney(pawnI);
});

function GameStart(gameOptions)
{
    playersPosition = gameOptions.gameOptions.positions;
    playersAmount = gameOptions.players.length;
    playersMoney = gameOptions.gameOptions.money;
    playersField = gameOptions.gameOptions.onField;
    
    tradeSelect.innerHTML = "";
    for (let i = 0; i < gameOptions.players.length; i++) 
    {
        if(i == playerIndex) continue;

        const option = document.createElement('option');
        option.value = i;
        option.innerText = gameOptions.players[i].name;

        tradeSelect.appendChild(option);
    }

    CheckPlayer();
}
function GameRestart(gameOptions)
{
    trades.innerHTML = "";
    
    for (let i = 0; i < gameOptions.board.length; i++) 
    {
        const field = gameOptions.board[i];
        if(field.type > 2) continue;
        
        const fieldDiv = board.querySelector(`[index='${i}']`);
        fieldDiv.classList.remove('champions');
        fieldDiv.classList.remove('festival');

        fieldDiv.querySelector('.players').innerHTML = "";
        
        if(field.additional.isFestival) fieldDiv.classList.add('festival');

        fieldDiv.querySelector('.price').innerText = "";
    }
}

function CheckPlayer()
{
    for (let i = 0; i < playersAmount; i++) 
    {
        ChangeMoney(i);

        const field = board.querySelector(`[index='${playersPosition[i]}']`);

        const players = field.querySelector('.players');
        if(players.querySelector(`.${pawnColors[i]}`) != undefined)
            continue;

        SetPawnPositions(-1, playersPosition[i], i);
    }

    SetFieldColors();
}

CheckPlayer();

function SetPawnPositions(oldPosition, newPosition, pawnIndex)
{
    if(oldPosition != -1)
    {
        const oldField = board.querySelector(`[index='${oldPosition}']`);
        const oldPlayers = oldField.querySelector('.players');
        oldPlayers.querySelector(`.${pawnColors[pawnIndex]}`).remove();
    }

    const field = board.querySelector(`[index='${newPosition}']`);

    const players = field.querySelector('.players');

    const div = document.createElement('div');
    div.classList.add(pawnColors[pawnIndex]);
    div.style.cssText = `--pawn-color: ${pawnColors[pawnIndex]};`;
    players.appendChild(div);
}
function SetFieldColors()
{
    const prices = board.querySelectorAll('.price')

    for (let i = 0; i < prices.length; i++) 
    {
        if(prices[i].getAttribute('owner') == undefined) continue;

        prices[i].style.cssText = `--pawn-color: ${pawnColors[parseInt(prices[i].getAttribute('owner'))]};`;
    }
}

function ChangeMoney(pawnIndex)
{
    const player = moneyDiv.querySelector(`.${pawnColors[pawnIndex]}`);

    if(player != undefined)
    {
        player.innerText = `${pawnColors[pawnIndex]} - ${playersMoney[pawnIndex]}`;
        return;
    }
        
    const div = document.createElement('div');
    div.classList.add(pawnColors[pawnIndex]);
    div.innerText = `${pawnColors[pawnIndex]} - ${playersMoney[pawnIndex]}`;

    moneyDiv.appendChild(div);
}

CheckField(playersField);
function CheckField(fields)
{
    if(playerIndex == playerTurn) return;

    currentField = fields[playerIndex];

    for (let i = 0; i < board.children.length; i++) 
    {
        const row = board.children[i];

        for (let j = 0; j < row.children.length; j++)
        {
            if(row.children[j].getAttribute('index') == undefined) continue;
            
            if(currentField == 7)
            {
                if(row.children[j].getAttribute('type') > 2 || (!isNaN(parseInt(row.children[j].querySelector('.price').getAttribute('owner'))) && parseInt(row.children[j].querySelector('.price').getAttribute('owner')) != playerIndex))
                    row.children[j].classList.add('invisible');
                else
                {
                    row.children[j].classList.add('canClick');
                    row.children[j].classList.remove('invisible');
                }
            }
            else if(currentField == 5) { }
            else if(currentField == 3) { }
            else
            {
                row.children[j].classList.remove('invisible');
                row.children[j].classList.remove('canClick');
            }
        }
    }
}