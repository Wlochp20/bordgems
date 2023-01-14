require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const session = require('express-session');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');

const bodyParser = require('body-parser');

const mongoose = require('mongoose');

const fs = require('fs');

const gameFunctions = require('./functions/games');
const userFunctions = require('./functions/user');

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

app.use(express.static(`${__dirname}/public`));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser())
app.use(expressLayouts);
app.set('layout', 'layouts/layout');

const sessionMiddleware = session({
    cookie: { maxAge: 2147483647 * 1000 },
    resave: true,
    rolling: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET
});

app.use(sessionMiddleware);

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));

const games = gameFunctions.getAllGames(false);

app.get('/', async (req, res) =>
{
    let logged = await userFunctions.logged(req);
    let currUser = undefined;
    if(logged)
        currUser = await userFunctions.getUser({ name: req.session.user.name });

    res.render('index', { games: games, logged: logged, currUser });
});

const routeFiles = fs.readdirSync(`./routes/`).filter(file => file.endsWith('.js'));
for (const file of routeFiles)
{
    const route = require(`./routes/${file}`);
    route.express(app);
    io.on('connection', async socket =>
    {
        await route.socket(io, socket);
    })
}

mongoose.connect(process.env.MONGODB_SRV)
.then(() => console.log('Connected to the database!'))
.catch(err => console.error(err));

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Listening on port: ${PORT}`));