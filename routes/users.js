const gameFunctions = require('../functions/games');
const userFunctions = require('../functions/user');

const games = gameFunctions.getAllGames(false);
module.exports = 
{
    express: (app) =>
    {
        app.get('/profile/:id', async (req, res) =>
        {
            const user = await userFunctions.getUser({ name: req.params.id });
            if(!user) 
            {
                res.redirect("/");
                return;
            }

            let logged = await userFunctions.logged(req);
            let ownProfile = false;
            if(logged && user.userID == req.session.user.userID) 
                ownProfile = true;

            let currUser = undefined;
            if(logged)
                currUser = await userFunctions.getUser({ name: req.session.user.name });

            const follows = req.session.user == undefined ? false : await userFunctions.checkFollow(req.session.user.name, user.name);

            res.render('profile', { games: games, user: user, currUser, ownProfile, logged, follows: follows });
        });

        app.post('/profile/follows', async (req, res) =>
        {
            let logged = await userFunctions.logged(req);
            if(!logged)
                return res.json({ status: "error", message: "Nie jesteś zalogowany" });

            const name = req.body.name.split("#");
            
            if(name[0] == req.session.user.name)
                return res.json({ status: "error", message: "Nie możesz dodać siebie do znajomych" });

            const followUser = await userFunctions.getUser({ name: name[0] });

            if(!followUser || followUser.hash != `#${name[1]}`)
                return res.json({ status: "error", message: "Nie ma takiego użytkownika" });  // informujemy ziomka czy jest taki
            
            if(await userFunctions.checkFollow(req.session.user.name, name[0]))//sprawdza czy jest taki a jesli jets to daje true a w innym przypadku daje false
                return res.json({ status: "error", message: "Obserwujesz już tą osobe" }); // jesli juz jest ziomkiem to mowie ze nie mozna dodac

            const newArray = await JSON.parse(req.session.user.follows); //na tablice
            newArray.push(`${name[0]}#${name[1]}`) // ziomek co se szukales i se go dodajesz do tablicy
            
            await userFunctions.changeData({ userID: req.session.user.userID }, { follows: JSON.stringify(newArray) }); //na stringa

            return res.json({ status: "ok", message: "Zaobserwowano użytkownika" }); // informuje ze dodano 
        });
        
        app.post('/profile/follow', async (req, res) =>
        {
            let logged = await userFunctions.logged(req);
            if(!logged)
                return res.json({ status: "error", message: "Nie jesteś zalogowany" });

            if(!req.body.name)
                return res.json({ status: "error", message: "Wyślij poprawnie nazwe" });

            const name = req.body.name.split("#");
            
            if(req.body.name == req.session.user.name)
                return res.json({ status: "error", message: "Nie możesz dodać siebie do znajomych" });

            const followUser = await userFunctions.getUser({ name: name });// robie zioma 

            if(!followUser) //czy istnieje ziomek z danym #
                return res.json({ status: "error", message: "Nie ma takiego użytkownika" });  // informujemy ziomka czy jest taki
            
            let newArray = await JSON.parse(req.session.user.follows); //na tablice

            const following = await userFunctions.checkFollow(req.session.user.name, name[0]);
            console.log(following);
            if(following)//sprawdza czy jest taki a jesli jets to daje true a w innym przypadku daje false
                newArray = newArray.filter(user => user != `${followUser.name}${followUser.hash}`) // ziomek co se szukales i se go usuwasz z tablicy
            else
                newArray.push(`${followUser.name}${followUser.hash}`) // ziomek co se szukales i se go dodajesz do tablicy
            
            await userFunctions.changeData({ userID: req.session.user.userID }, { follows: JSON.stringify(newArray) }); //na stringa

            if(!following)
                return res.json({ status: "ok", message: "Zaobserwowano użytkownika" }); // informuje ze dodano 
            else
                return res.json({ status: "ok", message: "Odobserwowano użytkownika" }); // informuje ze usunieto 
        });
    },
    socket: async (io, socket) => { }
}