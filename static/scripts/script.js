const xhr = new XMLHttpRequest()

document.getElementById('add-data').addEventListener('click', addItemsToList)


function addEventListeners(){
    const elements = document.getElementsByClassName('check-button') 
    for(let i = 0; i < elements.length; i++){
        elements[i].addEventListener('click', handleCheckBoxes, false);
    }
}

function handleCheckBoxes(){
    // Need to Convert to JSON with appropriate fields
    let data = {
        info:{
            itemID: this.id, 
            Name : this.value,
            Status: this.checked
        }
    }

    xhr.open('POST', '/updateStatus', true); 
    xhr.onload = () => { if(xhr.status != 200) console.log(`Error: ${xhr.status}`) }

    console.log(data);
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
            Status : `${status}`
        }
        
    };

    xhr.open('POST', '/userData', true); 
    xhr.onload = () => { 
        if(xhr.status != 200){ console.log("Could not add item to Cloud!"); }
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
     span.append(label)
     span.append(br)
     parent.append(span);
     

     return tempId;
     
}


function addItemsToList(){
    const inputField = document.getElementById('add-item-field'); 
    // Check if the input field is an empty String
    if(!(inputField.value).trim().length){ return; }
    // Now Create the Element and add to the list
    tempID = createAListItem(document.querySelector('#list'), inputField.value, false);
    //Send the data to the db 
    updateDB(inputField.value, 0, tempID, tempID)

    inputField.value = '';
     
}


function loadData(data){
    if(!data){ return; }
    const list = document.querySelector('#list'); 
    data.forEach((element) => {
        console.log(`Appending ${element.Name}`); 
        createAListItem(list, `${element.Name}`, element.Status, element.itemID)
    });
    addEventListeners()
}


function showList(){
    xhr.open("GET", "/userData", true); 
    xhr.onload = () =>{
        if(xhr.status != 200){
            console.log("Errror" , xhr.responseText); 
        }else{
            document.getElementById('welcome-user').textContent = `Welcome, ${JSON.parse(xhr.responseText).userID}!`
            loadData(JSON.parse(xhr.responseText).toDoListData)
        }

    }

    xhr.send()
}

showList()
