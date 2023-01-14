const createLobby = document.querySelector(".createLobby");
const createLobbyDiv = document.querySelector(".lobbyCreation");

let public = true;

createLobby.addEventListener('click', () => 
{
    createLobbyDiv.classList.remove('hidden');
    public = true;
});

const form = createLobbyDiv.querySelector('form');
form.addEventListener('submit', async event =>
{
    event.preventDefault();

    const name = document.title.toLowerCase();
    const lobbyName = form.querySelector('#name').value;
    const minutes = parseInt(form.querySelector('#minutes').value);
    const seconds = parseInt(form.querySelector('#seconds').value);

    console.log(lobbyName, minutes, seconds);

    const result = await fetch('/createLobby', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            lobbyName,
            time: minutes * 60 + seconds,
            public
        })
    }).then(res => res.json())

    if(result.status != "ok")
        SpawnAlert(3, result.message);
    else
        location.assign(result.link);
})