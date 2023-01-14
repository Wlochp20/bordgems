const delay = ms => new Promise(res => setTimeout(res, ms));

const login = document.querySelector('.loginform');
if(login)
    login.addEventListener('submit', async event =>
    {
        event.preventDefault();

        const name = login.querySelector('[name=name]').value;
        const password = login.querySelector('[name=password]').value;

        const result = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                password
            })
        }).then(res => res.json())

        if(result.status != "ok")
            SpawnAlert(3, result.message);
        else
        {
            SpawnAlert(1, result.message);
            await delay(5000);
            location.reload();
        }
    });

const register = document.querySelector('.registerform');
if(register)
    register.addEventListener('submit', async event =>
    {
        event.preventDefault();

        const name = register.querySelector('[name=name]').value;
        const password = register.querySelector('[name=password]').value;
        const email = register.querySelector('[name=email]').value;

        const result = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                password,
                email
            })
        }).then(res => res.json())

        if(result.status != "ok")
            SpawnAlert(3, result.message);
        else
        {
            SpawnAlert(1, result.message);
            document.querySelector('.confirmation').classList.remove('hidden');
        }
    });

const conf = document.querySelector('.confform');
if(conf)
    conf.addEventListener('submit', async event =>
    {
        event.preventDefault();

        const code = conf.querySelector('[name=code]').value;

        const result = await fetch('/conf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        }).then(res => res.json())

        if(result.status != "ok")
            SpawnAlert(3, result.message);
        else
        {
            SpawnAlert(1, result.message);
            document.querySelector('.confirmation').classList.add('hidden');
            await delay(5000);
            location.reload();
        }
    });