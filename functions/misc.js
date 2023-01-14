require('dotenv').config();

const random = require('random');
const nodemailer = require('nodemailer');

module.exports = {
    //cała zabawa z rejestracją, generowanie #, wysyłanie maila
    random: (min, max) =>
    {
        let baseRandom = random.uniform(min, max)();

        let randomSeed = random.uniform(0, 100)();
        randomSeed *= Math.random() > .5 ? 1 : -1;

        baseRandom = Math.abs((baseRandom + randomSeed) % max) + min;

        return baseRandom;
    },
    numberGen: length =>
    {
        const pow = Math.pow(10, length)
    
        const rand = Math.round(Math.random() * pow).toString();
        let output = "";
        for (let i = rand.length; i < length; i++)
            output += "0";
        output += rand;
    
        if(output.length > length)
            output = output.substring(0, output.length - 1);
    
        return output;
    },
    sendEmail: async (to, subject, text) =>
    {
        let validatedEmail = false;
        await new Promise((resolve, reject) =>
        {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'boardgemss@gmail.com',
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            const mailOptions = {
                from: 'boardgemss@gmail.com',
                to: to,
                subject: subject,
                text: text
            };

            transporter.sendMail(mailOptions, (err, info) => 
            {
                if (err)
                {
                    resolve(false);
                    return;
                }
                validatedEmail = true;
                resolve(true);
            });
        });
        return validatedEmail;
    },
}