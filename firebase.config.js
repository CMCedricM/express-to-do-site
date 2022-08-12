// Import the functions you need from the SDKs you need
const { initializeApp } = require('firebase/app'); 
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCCHjH2hokPB4XeZKu7f3ziEILJSkIwqgw",
  authDomain: "to-do-list-a7a09.firebaseapp.com",
  projectId: "to-do-list-a7a09",
  storageBucket: "to-do-list-a7a09.appspot.com",
  messagingSenderId: "643489513684",
  appId: "1:643489513684:web:f255ffbeebd7067923fb41",
  measurementId: "G-DRFDP9JJ2Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
module.exports.dbRef = getFirestore(app);
//const auth = getAuth(app); 
module.exports.auth = getAuth(app); 
