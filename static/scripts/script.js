const xhr = new XMLHttpRequest()

document.getElementById('add-data').addEventListener('click', addItemsToList);
document.getElementById('remove-data').addEventListener('click', removeData); 

// For now lets just assume we want to delete all completed items, not individual ones yet, we can add that later
function removeData(){
    const data = document.getElementsByClassName('list-element-span');
    let buffer = {items: [] }; 
    // Lets find all completed items and then delete them and mark their remove attribute to true
    // The issue here is that as I read through the list, i am also deleting elements, which overall 
    // changes the indices => out of bounds
    // The Fix: Read the Array Backwards
    for(let i = data.length-1; i >= 0; i--){
        try{
            info = data[i].children[0];
            if(info.checked){
                buffer['items'].push(JSON.stringify({
                itemID: info.id, 
                Remove : true 
                }))
                data[i].remove()
            }   
        }catch(err){
            console.log(err);
            console.log(data[i])
        }
    }
    removeFromDB(buffer);
} 

// This will update the data in the db
function removeFromDB(buffer){
    if(buffer.items.length == 0) { return; }
    console.log("Data: " + buffer.items);
    xhr.open('POST', '/removeData', true ); 
    xhr.onload = () => {
        if(xhr.status == 418){ console.log("Well something doesn't Work Right, try again later!")}
        else if(xhr.status != 200){ console.log("Error!"); }
    }
    xhr.setRequestHeader('Content-Type', 'application/json'); 
    xhr.send(JSON.stringify(buffer));
}

function addEventListeners(){
    const elements = document.getElementsByClassName('check-button') 
    for(let i = 0; i < elements.length; i++){ elements[i].addEventListener('click', handleCheckBoxes, false);}
}

function handleCheckBoxes(){
    // Need to Convert to JSON with appropriate fields
    let data = {
        info:{
            itemID: this.id, 
            Name : this.value,
            Status: this.checked, 
        }
    }
    xhr.open('POST', '/updateStatus', true); 
    xhr.onload = () => { if(xhr.status != 200) console.log(`Error: ${xhr.status}`) }
    xhr.setRequestHeader('Content-Type', 'application/json'); 
    xhr.send(JSON.stringify(data)); 
}


function updateDB(itemName, status, id, tempId = null){
    // Need to Convert to JSON with appropriate fields
    let itemidenti = '';
    if(tempId != null){ itemidenti = null}
    else{ itemidenti = id; }
    if(status) status = 1; 
    else status = 0; 
    let data = 
    {
        newItems: {
            itemID : `${itemidenti}`, 
            Name : `${itemName}`, 
            Status : `${status}`, 
            Remove: false
        }
        
    };

    xhr.open('POST', '/userData', true); 
    xhr.onload = () => { 
        if(xhr.status == 403){ 
            response = JSON.parse(xhr.responseText); 
            alert(`${response.info}`); 
            window.location = response.site;
        }
        else if(xhr.status != 200) { alert(`${xhr.responseText}`); }
        else if(tempId != null) { document.getElementById(id).id= xhr.responseText; }
        
    }
    xhr.onerror = () => { console.log(`Fatal Error: ${xhr.response}`)}
    xhr.setRequestHeader('Content-Type', 'application/json'); 
    xhr.send(JSON.stringify(data)); 

}


function createAListItem(parent, itemName, checked, id=null){
     // Create my Elements
     let input = document.createElement('input'); 
     let label = document.createElement('label');
     let br = document.createElement('br');
     let span = document.createElement('div')

     // Create a Temporary ID => We will need this later if we complete the item without reloading the page
     let tempId = null; 
     // Maybe I should request a uuid here from server, so that its easy to update the db about a completed item later?
     if(id == null){ tempId = parent.children.length + 1}
     else{tempId = id; }  
     // Set their attributes
     input.setAttribute('type', 'checkbox' ); 
     if(checked){ input.setAttribute('checked', 'checked'); }
     input.setAttribute('id', `${tempId}`);
     label.setAttribute('for', `${tempId}`);
     input.value=`${itemName}`;
     input.className = 'check-button';
     label.className = 'list-element';
     label.innerText = `${itemName}`;
     span.className = 'list-element-span'
     // Append Created Elements
     span.append(input)
     input.append(label)
     span.append(label)
     span.append(br)
     parent.append(span);
     

     return tempId;
     
}


function addItemsToList(e){
    e.preventDefault()
    const inputField = document.getElementById('add-item-field'); 
    // Check if the input field is an empty String
    if(!(inputField.value).trim().length){ return; }
    // Now Create the Element and add to the list
    tempID = createAListItem(document.querySelector('#list'), inputField.value, false);
    //Send the data to the db 
    updateDB(inputField.value, 0, tempID, tempID)
    document.getElementById(tempID).addEventListener('click', handleCheckBoxes, true)
    inputField.value = '';
     
}


function loadData(data){
    if(!data){ return; }
    const list = document.querySelector('#list'); 
    data.forEach((element) => {
        // Take note that I had to convert the Status to a number, this is likely because data is being recieved as a string
        // But the createAListItem call requires a number for the status
        createAListItem(list, `${element.Name}`, Number(element.Status), element.itemID)
    });
    addEventListeners()
}


function showList(){
    xhr.open("GET", "/userData", true); 
    xhr.onload = () =>{
        if(xhr.status != 200){
            console.log("Errror" , xhr.responseText); 
        }else{
            document.getElementById('welcome-user').textContent = `Welcome, ${(JSON.parse(xhr.responseText).userID).toUpperCase()}!`
            loadData(JSON.parse(xhr.responseText).toDoListData)
        }

    }

    xhr.send()
}

showList()
