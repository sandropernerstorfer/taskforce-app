const express = require('express');
const app = express();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv/config');
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 5500;
const User = require('./models/User');

app.listen(PORT);
mongoose.connect(
    process.env.DB_CONNECTION, {useNewUrlParser: true, useUnifiedTopology: true}, () => {
        console.log('DB Connected');
    }
);

let currentUser = {};

//Middleware
app.use(express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use( async (req, res, next) => {                // gets User-Data by comparing cookie and db session id
    if(req.cookies.id){
        const user = await User.findOne({sessionid: req.cookies.id}, (err,obj) => {
            try{}
            catch(err){res.end();}
        });
        currentUser = user;
        next();
    }
    else{
        currentUser = {};
        next();
    }
});
app.use('/login/*?', (req,res) => {                 // catch all routes following Login and redirect to /login
    res.redirect('/login');
});
app.use('/login', (req, res) => {                   // if path /login AND cookie found -> redirect to desk / else login
    if(req.cookies.logged && req.cookies.id){
        res.redirect('/desk');
    }
    else{
        res.sendFile(__dirname+'/static/login.html');
    } 
});
app.use((req, res, next) => {                       // if cookie NOT found -> redirect to login
    if(!req.cookies.logged){
        res.redirect('/login');
    }
    else{
        next();
    }
});

//USER-ROUTES

app.post('/user/signup', async (req, res) => {     // SIGNUP users and create session -> when done redirects to '/desk'
    // suche USER in DB nach EMAIL
    const userExists = await User.findOne({email: req.body.email}, (err,obj) => {
        try{}
        catch(err){res.end(err);}
    });

    if(userExists != null){             // wenn user nicht null ist (also existiert) -> respond: existiert bereits
        res.clearCookie('logged');
        res.end('user exists');
    }
    else{                               // wenn user noch nicht existiert    
        const sessionID = uuidv4();     // generiert uuid für session management
        const user = new User({         // neuer USER
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            sessionid: sessionID
        });
        res.cookie('id', sessionID, {httpOnly: true});      // erstellt cookie mit selber sessionID
        try{
            const savedUser = await user.save();            // speichert USER in Datenbank
            currentUser = savedUser;                        // speichert USER lokal
            res.end();                                      // ende - client leitet auf /desk
        }
        catch(err){
            res.json(err);
        };
    }
});

app.post('/user/signin', async (req, res) => {     // SIGNIN users and create session -> when done redirects to '/desk'
    const userExists = await User.findOne({email: req.body.email}, (err,obj) => {
        try{}
        catch(err){res.end(err);}
    });

    if(userExists == null){             // wenn user NICHT existiert -> respond: kein user , kein login
        res.clearCookie('logged');
        res.end('no user');
    }
    else{                               // wenn user existiert -> vergleiche passwörter
        const correctPassword = userExists.password == req.body.password ? true : false;

        if(!correctPassword){           // wenn passwörter nicht gleich -> respond: falsches passwort
            res.clearCookie('logged');
            res.end('wrong password');
        } 
        else{
            const sessionID = uuidv4();                     // wenn passwörter gleich -> erstelle neue sessionID
            res.cookie('id', sessionID, {httpOnly: true});  // erstelle cookie mit gleicher sessionID
            try{                                            // sessionID update in datenbank
                const updatedUser = await User.updateOne({ email: req.body.email }, { $set: {sessionid: sessionID}});
                currentUser = updatedUser;                  // USER lokal speichern
            }
            catch(err){
                res.json(err);
            }
            res.end();                                      // ende - client leitet auf /desk
        }
    }
});

// DESK-ROUTES

app.use('/desk', (req,res,next) => {
    if(Object.keys(currentUser).length == 0){
        res.clearCookie('logged');
        res.redirect('/login');
    }
    else{
        next();
    }
});

app.get('/desk', (req,res) => {
    res.sendFile(__dirname+'/static/board.html')
});

app.get('/desk/userdata', (req, res) => {
    res.send(JSON.stringify(currentUser));
})

// LOGOUT
app.get('/logout', (req, res) => {
    res.clearCookie('logged');
    res.clearCookie('id');
    res.redirect('/login');
});