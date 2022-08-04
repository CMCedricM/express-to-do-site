// Standard Libraries
const https = require('https'); 
const express = require('express'); 
const session = require('express-session'); 
const cors = require('cors'); 
const htmlRender = require('express-es6-template-engine');
const path = require('path'); 

// Additional Libraries
const bcrypt = require('bcrypt');
const fs = require('fs');
const uuid = require('uuid')

const {MongoClient} = require('mongodb');

const dateTime = require('node-datetime');
const { createServer } = require('http');
const req = require('express/lib/request');
const { text } = require('express');
const { throws } = require('assert');


// Environment 
const TWO_HRS = 1000 * 60 * 60; 

const {
    SESS_LIFETIME = TWO_HRS, 
    SESS_SECRET = "place-a-secret-key-here-lool",
    NODE_ENV = 'development', 
    SESS_NAME = 'sid',

    //CERTS
    // certFile = fs.readFileSync(path.join(__dirname, 'certs','certificate.pem')),
    // keyFile = fs.readFileSync(path.join(__dirname, 'certs','key.pem')),
    /*httpsOptions = {
        cert: certFile,
        key: keyFile
    }*/
} = process.env 



// HTML File Paths 
const staticFolder = path.join(__dirname, 'static'); // /Users/cedric-men/{dir}/node-project/static
const dynamicPagesFolder = path.join(__dirname, 'views'); // /Users/cedric-men/{dir}/node-project/views


// Database Connection Info 
let db = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8')); // /Users/cedric-men/{dir}/node-project/db.json 
const dbURL = `mongodb://${db.username}:${db.password}@${db.url}`;
// db sources
const userDbName = "home-users"; 
const userDbCollection = "users";
const toDoListCollection = "toDoData"

class mySite{
    constructor(){
        // Start Variables
        this.PORT = 5150; 
        this.server = express(); 

        // Sets Uses 
        this.server.use(express.static(staticFolder)); 
        this.server.use(express.json()); 
        this.server.use(cors()); 

        // Set Rendering Engines -> Middleware
        this.server.engine('html', htmlRender); 
        this.server.set('views', dynamicPagesFolder); 
        this.server.set('view engine', 'html'); 

        // Bind Function to Class
        //this.runtime = this.runtime.bind(this); <--- Example of binding
        this.login = this.login.bind(this);
        this.signup = this.signup.bind(this);
        this.logEvent = this.logEvent.bind(this);
        this.addDataTodo = this.addDataTodo.bind(this);
        this.getToDoList = this.getToDoList.bind(this);
        this.updateStatus = this.updateStatus.bind(this); 

        // Check for auth 
        this.authenticated = false; 

        this.server.use(session({
            name : SESS_NAME, 
            resave: false, 
            saveUninitialized: false, 
            secret: SESS_SECRET, 
            cookie : {
                maxAge: SESS_LIFETIME, 
                sameSite: true, // or strict
                secure: NODE_ENV === 'production', 
            }
        })
        )
    }
    
    getTime(){
        let dt = dateTime.create(); 
        let logDateTime = dt.format('Y-m-d H:M:S')
        return logDateTime;
    }

    logEvent(text){
        console.log(`${this.getTime()} ----> ${text}`)
    }

    async login(req, res){

        // Get User Info
        if(!req){this.logEvent("Login Function Failure!"); try{res.send("Internal Server Error, please try again later...")}catch(err){this.logEvent(`${err}`)}; return;}
        const {email, password} = req.body; 
        const client = new MongoClient(dbURL, {useNewUrlParser: true}); 
        try{
            await client.connect(); 
            const db = client.db(userDbName);
            const users = db.collection(userDbCollection); 
            const user = await users.findOne({email : email.toLowerCase()}); 
         

            if(user){
                const valid = await bcrypt.compare(password, user.password); 
                if(valid){
                    req.session.userId = user.firstname;
                    this.logEvent("SUCCESSFUL login Attempt!");
                    //console.log(`${logDateTime} ----> SUCCESSFUL login Attempt!`)
                    res.send('/dashboard'); 
                }
                else{
                    this.logEvent("FAILED login Attempt! => Invalid Credentials");
                    //console.log(`${logDateTime} ----> FAILED login Attempt! => Invalid Credentials`)
                    res.status(401).send('Email or Password Incorrect'); 
                }
            }
            else{
                this.logEvent("FAILED login Attempt => No Account");
                //console.log(`${logDateTime} ----> FAILED login Attempt => No Account`)
                res.status(401).send('No Account Found, Please Create One First');
            }
        }
        catch(err){
            this.logEvent(`System Error => ${err}\n\n`);
            //console.log(`\n${logDateTime} ----> System Error => ${err}\n\n`);
        }
        finally{
            client.close(); 
        }
    }


    async createUser(req){
        let user = {
            firstname: req.body.firstname, 
            lastname : req.body.lastname, 
            email: (req.body.email).toLowerCase(),
            password: await bcrypt.hash(req.body.password, 10)
        }
        return user;
    }


    async signup(req, res){
        if(!req){this.logEvent("Signup Function Failure!"); try{res.send("Internal Server Error, please try again later...")}catch(err){this.logEvent(`${err}`)}; return;}
        // Just Cause, set the req.session.userid to non 
        req.session.destroy();
        const user = await this.createUser(req); 
        const client = new MongoClient(dbURL, {useNewUrlParser: true}); 
        try{
            await client.connect(); 
            const db = client.db(userDbName);
            const users = db.collection(userDbCollection); 
            const checkAUser = await users.findOne({email : (req.body.email).toLowerCase()});
            // Check if user already exists
            if(checkAUser){ this.logEvent("Duplicate User Creation Attempted!"); res.status(401).send('User Already Exists!'); }
            else{
                await users.insertOne(user); 
                this.logEvent("User Created");
                //console.log('User Created');
                res.send('/login'); 
            }
        }
        catch(err){
            this.logEvent(`${err}`);
        }
        finally{
            client.close(); 
        }
    }

    

    // This area will handle to do list actions

    async getToDoList(req, res){
        if(!req.session.userId){ res.redirect('/login'); }
        const user = req.session.userId; 
        let data = {}; 

        // Connect the Database
        const client = new MongoClient(dbURL, {useNewUrlParser: true}); 
        try{
            await client.connect(); 
            const db = client.db(userDbName); 
            const userData = db.collection(toDoListCollection); 
            const userRecords = await userData.findOne({'userID' : (user.toLowerCase())}); 
            // Check if the user has any data attached to them 
            if(!userRecords){
                await userData.insertOne({'userID' : (user.toLowerCase()), 'toDoListData' : [] }); 
                data = {
                    userID: user
                }
            }else{
                data = userRecords
            }
        
        }catch(err){
            this.logEvent(`Unable to Retrieve Data to This User! => ${err}`)
            res.status(500).send("Unable to Add Item"); 
        }finally{
            client.close()
        }

        res.status(200).json(data);

    }


  
    async addDataTodo(req, res){
        if(!req.session.userId) res.redirect('/login'); 
        const user = req.session.userId; 
        // Lets Get the New Items Here
        const {newItems} = req.body
        if(newItems.itemID == null){newItems.itemID = uuid.v4(); }
        // Connect the Database
        const client = new MongoClient(dbURL, {useNewUrlParser: true}); 
        try{
            await client.connect(); 
            const db = client.db(userDbName); 
            const userData = db.collection(toDoListCollection); 
            const data = await userData.findOne({'userID' : (user.toLowerCase())}); 
            // Check if the user has any data attached to them 
            if(!data){
                this.logEvent("Data Inserted")
                await userData.insertOne({'userID' : (user.toLowerCase()), 'toDoListData' : [] }); 
            }
            userData.updateOne({'userID' : (user.toLowerCase())}, {$push: {'toDoListData' : newItems }}, (err, res) => {
                if(err) this.logEvent(`There was an error appending the data ==> ${err}`); 
                client.close()
            })
        
        }catch(err){
            this.logEvent(`Unable to Add Data to This User! => ${err}`)
            res.send("Unable to Add Item"); 
        }
        this.logEvent("Item Was Added Successfully to this user!"); 
        res.send(newItems.itemID); 
        

    }

    // This will take the recieved id and compare it with all uuids in the toDoData and update the status of
    // whether it was complete or not. 
    // Problem: The server and the client side will have different ids if an item was added but the page was not reloaded
    async updateStatus(req,res){    
        if(!req.session.userId){ return; }
        const user = req.session.userId; 
        const {info} = req.body; 
        const itemID = info.itemID;
        const Status = info.Status;
        this.logEvent(`ID: ${info.itemID}, Status: ${info.Status}`);
        /*
        const {itemID, Name, Status} = req.body; 
        this.logEvent(`ID: ${itemID}, Name: ${Name}, Status: ${Status}`)
        */
        // Connect the Database
        const client = new MongoClient(dbURL, {useNewUrlParser: true}); 
        try{
            await client.connect(); 
            const db = client.db(userDbName); 
            const userData = db.collection(toDoListCollection); 
            const data = await userData.findOne({'userID' : (user.toLowerCase())}); 
            
            if(data){
                
                userData.updateOne({userID : user.toLowerCase()}, {$set : {"toDoListData.$[updateItem].Status" : Status} }, 
                {'arrayFilters' : 
                    [
                        {"updateItem.itemID" : itemID}
                    ]
                }, (err,res) => {
                    if(err) this.logEvent(`Error Updating Status of element ${itemID} ==> ${err}`);
                })
            }
            
        
        }catch(err){
            this.logEvent(`Unable to Add Data to This User! => ${err}`)
            res.send("Unable to Add Item"); 
        }

        
    }
    

    runtime = () => {
        
        // Home Routes
        this.server.get('/home', (req,res) => { res.redirect('/') } )
        // Login Routes
        this.server.get(`/login`, (req, res) => { req.session.userId ? res.redirect('dashboard') : res.render('login')});
        this.server.post('/login', this.login); 
        // Signup Routes
        this.server.get('/signup', (req, res) => {res.render('signup'); });
        this.server.post('/signup', this.signup);
        // After Login Routes
        this.server.get('/dashboard', (req,res) => { req.session.userId ? res.render('toDoPage') : res.redirect('/login'); });
        this.server.get('/userData', this.getToDoList); 
        this.server.post('/userData', this.addDataTodo)
        this.server.post('/updateStatus', this.updateStatus)
        // Logout Routes
        this.server.get('/logout', (req,res) => { req.session.destroy(); res.redirect('/login'); });
        
        // Catch Bad URL
        this.server.all('*', (req, res) => { res.status(404).render('badPage'); } )
        
        // For HTTPS 
        //https.createServer(httpsOptions, this.server).listen(this.PORT, () => { console.log(`Server Listening at Port ${this.PORT}\n\n`); } )
        // Without HTTPS
        this.server.listen(this.PORT, () => { console.log(`Server Listening at Port ${this.PORT}\n\n`); });
    }
}


app = new mySite(); 
app.runtime();