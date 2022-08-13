class menu_bar extends HTMLElement{
    connectedCallback(){
        this.innerHTML = 
        `
        <div>
            <link href="Assets/menu-style.css" rel="stylesheet"/>
            <nav>
            |<a class="menu-item" href="/">Home</a>
            |<a class="menu-item" href="/login">Login</a>
            |<a class="menu-item" href="/signup">Signup</a>
            |
            </nav>
        </div>
        
        `
    }
}


customElements.define('menu-bar', menu_bar);