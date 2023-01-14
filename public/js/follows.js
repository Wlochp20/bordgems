const addFollow = document.querySelector('.addFollow');
if(addFollow)
    addFollow.addEventListener('click', async () =>
    {
        const name = prompt("podaj nazwe i hashtag");

        const result = await fetch('/profile/follows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name
            })
        }).then(res => res.json())

        if(result.status != "ok")
            SpawnAlert(3, result.message);
        else
            SpawnAlert(1, result.message);
    });

const followButton = document.querySelector('.follow');
if(followButton)
    followButton.addEventListener('click', async () =>
    {
        const url = location.href;
        const link = url.split("/");
        const name = link[link.length - 1];

        const result = await fetch('/profile/follow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name
            })
        }).then(res => res.json())

        if(result.status != "ok")
            SpawnAlert(3, result.message);
        else
            SpawnAlert(1, result.message);
    });