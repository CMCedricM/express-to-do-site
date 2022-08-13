const xhr = new XMLHttpRequest(); 

// Create My Listeners 
// Use Try and Catch as a simple way to ignore if a page was not sent yet, may wanna change login and signup to static pages
try{ document.getElementById('login-submit').addEventListener('click', login); }catch{};
try{document.getElementById('signup-submit').addEventListener('click', signup); }catch{};

function login(e){
    e.preventDefault();
    xhr.open('POST', '/login', true);
    xhr.onload = () => {
        if(xhr.status != 200){
            document.getElementById('status').innerHTML = `
            <p1 id="status" style="text-align : center; font-size: 14pt; background: red;">${xhr.responseText}</p1>
            `
        }else{ window.location = xhr.responseText; }
        
    } 

   let jsonDoc = {
        email: document.getElementById('email').value, 
        password: document.getElementById('password').value
    }

   
    xhr.setRequestHeader('Content-Type', 'application/json'); 
    xhr.send(JSON.stringify(jsonDoc));

}


function signup(e){
   e.preventDefault()
    xhr.open('POST', '/signup', false);
    xhr.onload = () => {
        if(xhr.status != 200){
            document.getElementById('status').innerHTML = `
            <p1 id="status" style="text-align : center; background: red; font-size: 14pt; padding-right:20px; padding-left:20px;">${xhr.responseText}</p1>
            `
        }else{ window.location = xhr.responseText; }
    }

    let jsonDoc = {
        firstname: document.getElementById('firstname').value,
        lastname: document.getElementById('lastname').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
    }
    

    let value = Object.keys(jsonDoc).find(function(key){
        if (jsonDoc[key] == null || jsonDoc[key] == '') return key; 
    })

    if(value){ 
        document.getElementById('status').innerHTML = `
        <p1 id="status" style="text-align : center; background: red; font-size: 14pt;">Please Do Not Leave Any Fields Blank!</p1>
        `
     }else{
        xhr.setRequestHeader('Content-Type', 'application/json'); 
        xhr.send(JSON.stringify(jsonDoc));
     }
    
   
}
