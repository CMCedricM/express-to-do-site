// Standard Libraries
const express = require('express'); 
const session = require('express-session'); 
const cors = require('cors'); 
const htmlRender = require('express-es6-template-engine');
const path = require('path'); 

// Additional Libraries
const bcrypt = require('bcryptjs');
const uuid = require('uuid')
const dateTime = require('node-datetime');


// Firebase 
const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { collection, query, where, doc, getDoc, getDocs, setDoc, runTransaction, updateDoc, deleteDoc, writeBatch } = require('firebase/firestore');
const { auth, dbRef } = require('./firebase.config.js')


// Environment 
const TWO_HRS = 1000 * 60 * 60; 

const {
    SESS_LIFETIME = TWO_HRS, 
    SESS_SECRET = "place-a-secret-key-here-lool",
    NODE_ENV = 'development', 
    SESS_NAME = 'sid',
} = process.env 



// HTML File Paths 
const staticFolder = path.join(__dirname, 'static'); // /Users/home-dir/{dir}/node-project/static
const dynamicPagesFolder = path.join(__dirname, 'views'); // /Users/home-dir/{dir}/node-project/views



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
        this.removeData = this.removeData.bind(this);
        

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
        if(!req){this.logEvent("Login Function Failure!"); try{res.send("Internal Server Error, please try again later...")}catch(err){this.logEvent(`${err}`)}; return;}
        const { email, password } = req.body;
        let aUser = '';
        try{ aUser = await signInWithEmailAndPassword(auth, email, password); }
        catch(err){
            if(err.code == 'auth/user-not-found'){ res.status(401).send('No Account Found, Please Create One First'); }
            else if(err.code == 'auth/wrong-password'){ res.status(401).send('Email or Password Incorrect'); }
            this.logEvent(`Login Failure ==> ${err.code}`);
            return; 
        }
        // We Will Need to Query for the Accompanying user's name 
        let userName = '';
        const getUser = await getDoc(doc(dbRef, 'users', aUser.user.uid)); 
        if(getUser.exists()){ userName = (getUser.data()).firstname; }else{ userName = ''; }
        // Now Set the Session Info
        req.session.userId = {'user' : userName, 'uid' : aUser.user.uid, 'email' : email, 'password' : password, 'docIDs' : [] };
        this.logEvent(`User Logged in`);
        res.send('/dashboard');
    }


    async createUser(req){
        let user = {
            uniqueID: uuid.v4(),
            firstname: req.body.firstname, 
            lastname : req.body.lastname, 
            email: (req.body.email).toLowerCase(),
            password: await bcrypt.hash(req.body.password, 10)
        }
     
        return user;
    }


    async signup(req, res){
        if(!req){this.logEvent("Signup Function Failure!"); try{res.send("Internal Server Error, please try again later...")}catch(err){this.logEvent(`${err}`)}; return; }
        req.session.destroy();

        try{ await createUserWithEmailAndPassword(auth, req.body.email, req.body.password)}
        catch(err){
            this.logEvent(`Signup Error ===> ${err.code}`); 
            if(err.code == 'auth/email-already-in-use'){ res.status(500).send('User With That Email Exists, Please Login Instead'); }
            else{ res.status(500).send("Interal Server Error, try again later.")}
            return; 
        }
        
        // Create A Document For This User
        let userInfo = {
            userID : auth.currentUser.uid, 
            firstname : req.body.firstname.toLowerCase(), 
            lastname : req.body.lastname.toLowerCase()
        }
        try{ 
            // Create user info
            await setDoc(doc(dbRef, 'users', userInfo.userID), userInfo); 
            // Create user data
            await(setDoc(doc(dbRef, 'userData', userInfo.userID), userInfo)); 
        }catch(err){ this.logEvent(err); return; }
        
        res.send('/login');

    }


    async getToDoList(req, res){
        if(!req.session.userId){ res.redirect('/login'); }
        //const user = req.session.userId; 
        let data = {}; 
        let userDocs = []; 

        const {user, email, password, uid, docIDs} = req.session.userId; 
        try{
            await signInWithEmailAndPassword(auth, email, password); 
        }catch(err){ return; }

        try{
            // First Get the Documents Of the Curent User
            const userDataRef = collection(dbRef, 'userData')
            const getToDoItems = await getDocs(query(userDataRef, where('userID', '==', uid)));
            // Iterate and Save the document ids that belong to the user
            getToDoItems.forEach((docume) => {userDocs.push(docume.id);} )
            // Get the SubCollection now that we have the document ids that belong to the user
            let userDocID = ''; 
            if(userDocs.length == 0){ userDocID = uid }else{ userDocID = userDocs[0] }
            const items = collection(dbRef, 'userData', userDocID, 'toDoData'); 
            const itemLogs = await getDocs(items); 
            // Here is Where I eneded on Aug 12 at 4:10 am
            // Little Trick Here To Save The Docment ID, so that we can update satus without querying for the doc id
            userDocs.forEach(id => { docIDs.push(id); })
            // Clear the Array 
            userDocs = []; 
            // When using items.data() we will get a json of { ItemID: '',  Name: '', Remove: '', Status: '' }
            itemLogs.forEach((items) => { userDocs.push(items.data()); }) 
            
           
        }catch(err){ this.logEvent(err); return; }

        data = {
            userID: user,
            toDoListData: userDocs
        }
        
        res.json(data);
    }

    
    async addDataTodo(req, res){
        if(!req.session.userId) res.redirect('/login'); 
        const {email, password, docIDs, uid } = req.session.userId; 
        // Lets Get the New Items Here
        const {newItems} = req.body
        newItems.ItemID = uuid.v4(); 
        //console.log(newItems.Status == 0)
        if(newItems.Status != 0 && newItems.Status != 1){
            this.logEvent("ALERT: Code Integrity"); 
            res.status(403).json({'info' : "Permission Denied ==> Client JS script error!", 
                                    'site' : '/logout'}) ;
            return;
        }

        //try{ await signInWithEmailAndPassword(auth, email, password); }
        //catch(err){ this.logEvent(` addDataToDo() Error ===>${err.code}`); res.status(500).send("Internal Server Error, Try Again Later"); return; }
        let userDocID = '';
        if(docIDs.length == 0){userDocID = uid; }else{userDocID = docIDs[0]; }
        try{ await setDoc(doc(dbRef, 'userData', userDocID, 'toDoData', newItems.ItemID), newItems); }catch(err){ this.logEvent(err); return; }
        res.send(newItems.ItemID);
        this.logEvent("New Item Created!")
        
    }

    
   async updateStatus(req, res){
        if(!req.session.userId){ return; }
        
        const { email, password, docIDs, uid } = req.session.userId,
        {info} = req.body; 
        const ItemID = info.itemID, 
        Status = info.Status;

        try{ await signInWithEmailAndPassword(auth, email, password); }
        catch(err){ this.logEvent(`Status Update Error ${err.code}`); res.status(500).send('Internal Server Error, Try Again Later'); }
        
        // Query for Subcollection document that matches the id of to-do-item to update 
        let userDocID = ''; 
        if(docIDs.length == 0){ userDocID = uid; }else{ userDocID = docIDs[0]; }
        getDocs(query(collection(dbRef, 'userData', userDocID, 'toDoData'), where('ItemID', '==', ItemID))).
        then((docs) => { if(docs) { docs.docs.forEach(async (info) => { await updateDoc(info.ref, {Status: Status })}); }
                                else{ this.logEvent("No Data") }}).
        catch( (err) => { this.logEvent(`There Was An Error Updating the Document ==> ${err}`)}); 
        
   }


   async removeData(req, res){
        if(!req.body || !req.session.userId){res.status(418).send("No Data Recieved"); }
        const {items} = req.body, 
        {uid, docIDs } = req.session.userId; 
        let userDocID = ''; 
        if(docIDs.length == 0){ userDocID = uid; }else{ userDocID = docIDs[0]; }
        
        const batch = writeBatch(dbRef);
        
        for(const data of items ){
            batch.delete(doc(dbRef, 'userData', userDocID, 'toDoData', JSON.parse(data).itemID))
        }      
        try{ await batch.commit(); }
        catch(err){ this.logEvent(`Batch Commit Error ===> ${err}`); }
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
        this.server.post('/removeData', this.removeData)
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

module.exports = app;