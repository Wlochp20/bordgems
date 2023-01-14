const bcrypt = require('bcrypt');

const userModel = require('../mongoSchemas/userSchema');

const misc = require('../functions/misc');
const userFunctions = require('../functions/user');
const gameFunctions = require('../functions/games');

const usersWaiting = new Array();

const games = gameFunctions.getAllGames(false);

module.exports = 
{
    express: (app) =>
    {
        app.get('/login', async (req, res) =>
        {
            let logged = await userFunctions.logged(req);
            let currUser = undefined;
            if(logged)
                currUser = await userFunctions.getUser({ name: req.session.user.name });

            res.render('login', { games: games, logged: logged, currUser });
        });
        
        app.post('/login', async (req, res) =>
        {
            try 
            {
                if(await userFunctions.logged(req)) 
                    return res.json({ status: "error", message: 'Jesteś już zalogowany' });

                let profileData = await userFunctions.getUser({ name: req.body.name });

                if(!profileData) 
                    return res.json({ status: "error", message: 'Taki użytkownik nie istnieje' });
                else
                {
                    if(!await bcrypt.compare(req.body.password, profileData.password))
                        return res.json({ status: "error", message: 'Niepoprawne hasło' });
                    
                    req.session.user = profileData;
                    req.session.save();

                    return res.json({ status: "ok", message: 'Zalogowano' });
                }
            }
            catch(err)
            {
                console.error(err);
            }
        });

        app.get('/register', async (req, res) =>
        {
            let logged = await userFunctions.logged(req);
            let currUser = undefined;
            if(logged)
                currUser = await userFunctions.getUser({ name: req.session.user.name });

            res.render('register', { games: games, logged: logged, currUser });
        });

        app.post('/register', async (req, res) =>
        {
            try 
            {
                if(await userFunctions.logged(req)) 
                    return res.json({ status: "error", message: 'Jesteś już zalogowany' });

                if(req.body.name.length <= 0)
                    return res.json({ status: "error", message: 'Wpisz nazwe użytkownika' });
                if(req.body.password.length <= 0)
                    return res.json({ status: "error", message: 'Wpisz hasło' });
                if(req.body.email.length <= 0)
                    return res.json({ status: "error", message: 'Wpisz email' });

                if(req.body.name.includes("#"))
                    return res.json({ status: "error", message: 'Nie możesz użyć # w swojej nazwie' });
                const profileData = await userFunctions.getUser({ name: req.body.name });

                if(usersWaiting.some(user => user.name == req.body.name))
                    return res.json({ status: "error", message: 'taki użytkownik oczekuje na zatwierdzenie' });
                if(profileData)
                    return res.json({ status: "error", message: 'taki użytkownik już istnieje' });

                const availableMail = !(await userFunctions.getUser({ email: req.body.email }));
                if(!availableMail)
                    return res.json({ status: "error", message: 'podany mail jest już zajęty' });
                    
                if(req.body.name.length > 20)
                    return res.json({ status: "error", message: 'twoja nazwa jest zbyt długa' });

                const hashedPassword = await bcrypt.hash(req.body.password, 10);

                const user = userFunctions.createUser(req.body.name, req.body.email, hashedPassword)
                
                const confirmCode = misc.numberGen(5);
                const validEmail = await misc.sendEmail(
                    req.body.email, 
                    "Kod potwierdzający", 
                    `Oto twój kod potwierdzający: ${confirmCode}`
                );
                
                if(!validEmail) 
                    return res.json({ status: "error", message: 'Podaj prawidłowy adres email' });

                usersWaiting.push({ confirmCode, user, tries: 5 });
                
                req.session.userConf = user;
                req.session.save();

                return res.json({ status: "ok", message: 'Oczekiwanie na zatwierdzenie' });
            } 
            catch(err)
            {
                console.error(err);
            }
        });
        
        app.post('/conf', async (req, res) =>
        {
            try 
            {
                console.log(req.session.userConf);

                if(await userFunctions.logged(req))
                    return res.json({ status: "error", message: 'Jesteś już zalogowany' });
                    
                if(req.body.code.length != 5)
                    return res.json({ status: "error", message: 'Wpisz pięciocyfrowy kod' });
                if(!req.session.userConf || !req.session.userConf.userID) 
                    return res.json({ status: "error", message: 'Nie oczekujesz zatwierdzenia' });

                let user = usersWaiting.find(user => user.user.userID == req.session.userConf.userID);

                if(user.confirmCode == req.body.code)
                {
                    let model = await userModel.create(user.user);
                    model.save();

                    return res.json({ status: "ok", message: 'Zarejestrowano' });
                }
                user.tries--;

                if(user.tries <= 0)
                {
                    usersWaiting.splice(usersWaiting.indexOf(user), 1);
                    req.session.destroy();

                    return res.json({ status: "error", message: `Podałeś nieprawidłowy kod zbyt dużo razy` });
                }

                return res.json({ status: "error", message: `Pozostałe próby: ${user.tries}` });
            } 
            catch(err)
            {
                console.error(err);
            }
        });
    },
    socket: async (io, socket) => { }
}