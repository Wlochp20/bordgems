const userModel = require('../mongoSchemas/userSchema');
const misc = require('../functions/misc');

const self = module.exports = {
    //użytkownik
    logged: async (req) =>
    {
        if(req.session.user === undefined) return false;
        if(!req.session.user.userID || req.session.user.userID == undefined) return false;
        if(!await userModel.findOne({ userID: req.session.user.userID })) return false;
        
        return true;
    },
    getUser: async (search) =>
    {
        const user = await userModel.findOne(search);

        return user;
    },
    //tworzenie użytkownika
    createUser: (name, email, password) =>
    {
        const user = {
            userID: Date.now().toString(),
            name: name,
            hash: `#${misc.numberGen(4)}`,
            email: email,
            password: password,
            follows: "[]",
        };

        return user;
    },
    changeData: async (filter, data) =>
    {
        await userModel.findOneAndUpdate(
            filter, 
            { $set: data });
    },
    //znajomi w kontach
    checkFollow: async (followerName, followName) =>
    {
        const followUser = await userModel.findOne({ name: followName });
        const followerUser = await userModel.findOne({ name: followerName });

        const newArray = await JSON.parse(followerUser.follows);
        if(newArray.some(follow => follow == `${followUser.name}${followUser.hash}`))
            return true;

        return false;
    },
    //opcja gościa
    getUserOrGuest: async (req) =>
    {
        let user = req.session.guest;
        if(await self.logged(req))
            user = req.session.user;

        return user;
    },
    createGuest: (req) =>
    {
        if(req.session.guest != undefined) return;

        const nick = `Gość#${misc.numberGen(4)}`;

        req.session.guest = { name: nick };
        req.session.save();
    }
}