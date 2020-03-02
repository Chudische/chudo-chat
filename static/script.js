
document.addEventListener('DOMContentLoaded', () => {    
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    
    var user = localStorage.getItem('nickname');

    var channel = localStorage.getItem('channel') ? localStorage.getItem('channel') : 'default';

    const template = Handlebars.compile(document.querySelector("#chat-massege").innerHTML);

    var quote = false;

    // Add massege to html
    function add_massege(data){        
        if (data.nick == user) {
            data.owner = true;            
        } else {
            data.owner = false;
        }
        if (data.quote == false){
            delete data.quote;
        }        
        const massege = template(data);
        document.querySelector("#new-masseges").innerHTML += massege;

    };

    // Send massege to server
    function sendMassege() {
        let textarea = document.querySelector("textarea");       
        socket.emit('massege', {'massege': textarea.value, 'user': user, channel: channel, quote: quote});
        textarea.value = '';        
        if (document.querySelector('#answer').style.display === 'block'){
            $("#answer").fadeOut(300);
        }
        textarea.focus();
        quote = false;                         
        
    }

    // On connect join the latest room(that user was in) or default room 
    socket.on('connect', function (){        
        let data = {room: channel, nickname: user};                   
        socket.emit('join', data);
        document.querySelector("#selectChannels").value = channel;
        const request = new XMLHttpRequest();
        request.open("GET", `/get_masseges?channel=${channel}`);
        request.onload = () => {
            const resp = JSON.parse(request.responseText);            
            resp.forEach(add_massege);
            
            document.title += channel;
            history.pushState({"title": document.title, "channel": channel}, channel, channel);
        };
        request.send();
        
    });
    // On click "back" button load privious channel
    window.onpopstate = e => {
        const data = e.state;
        document.title = data.title;
        socket.emit('leave', {nickname: user, room: channel});
        channel = data.channel;
        socket.emit('join', {nickname: user, room: channel});

    }
    // Submiting massege via "submit" button 
    document.querySelector('#submitButton').onclick = () => {                
        sendMassege();
        return false;
    };

    // Submiting massege by hiting the "Enter" key (shift+Enter - line break)
    $("#inputMassege").keypress(function(event){       
        if (event.which == 13 && !event.shiftKey){
            sendMassege();
            return false;           
        }
               
    });

    // On connect to channel clear the  masseges from previous room and add masseges from new room
    document.addEventListener("click", function(event){
        const button = event.target;
        const block = button.parentElement.parentElement;       
        if (button.id === "connectButton"){            
            socket.emit('leave', {nickname: user, room: channel});
            channel = document.querySelector("#selectChannels").value;
            let data = {room: channel, nickname: user};            
            localStorage.setItem('channel', channel);            
            socket.emit('join', data);
            $(".massege").remove();            
            const request = new XMLHttpRequest();
            request.open("GET", `/get_masseges?channel=${channel}`);
            request.onload = () => {
                const resp = JSON.parse(request.responseText);                
                resp.forEach(add_massege);
                document.title += channel;
                history.pushState({"title": document.title, "channel": channel}, channel, channel);        
            };
            request.send();
        // Show modal window
        } else if (button.id === "createButton"){
            $('#createChannelModal').modal("show");
            $("#createChannel").focus();
        // deletre own massege
        } else if (button.classList.contains("close-btn")){
            let id = button.dataset.id;            
            socket.emit("delete", {user: user, id: id, channel: channel});                    
        // answer on user massege 
        } else if (button.classList.contains("answer-btn")){             
            quote = `${block.querySelector("b").innerHTML} ${block.querySelector("p").innerHTML}`; 
            document.querySelector("#answer-text").innerHTML = `<b>Answer to </b>  ${quote}`;
            $("#answer").fadeIn(300);
            document.querySelector("textarea").focus();
            window.scrollTo(0, document.body.offsetHeight - window.innerHeight);
        // Cancel qoutation    
        } else if (button.classList.contains("cancel-btn")){
            quote = false;
            $("#answer").fadeOut(300);
        }

    });
    // Create new channel
    var allowCreate = false;
    $('#createForm').on('submit', function (e) {
        new_channel = $("#createChannel").val();
        if (allowCreate){
            socket.emit("leave", {nickname: user, room: channel});
            localStorage.setItem('channel', new_channel);
            socket.emit('create_room', {room: new_channel}); 
        } else {
            e.preventDefault();
            if (!new_channel){
                $('.alert-fixed').text("You didn't provide channel name");
                $('.alert-fixed').fadeIn(400).delay(3000).fadeOut(400); 
            } else {
            $.getJSON(`/get_masseges?channel=${new_channel}`, function(event){
                if (event.channel == "bad"){ //Chaneel is not exist
                    allowCreate = true;
                } else {
                    $('.alert-fixed').text("Current channel already exist");
                    $('.alert-fixed').fadeIn(400).delay(3000).fadeOut(400); 
                }
            });
            }
        }                
    });
    // Hendle the massege from server 
    socket.on("show_massege", data => {
        const div = document.createElement('div');
        div.className = "massege";        
        if (data.join) {
            div.innerHTML = `<b>${data.nick}</b> has joined the channel`;
            document.querySelector('#new-masseges').append(div);
        } else if (data.leave){
            div.innerHTML = `<b>${data.nick}</b> has left the channel`;
            document.querySelector('#new-masseges').append(div);
        } else {                                         
            add_massege(data);
        } // scroll to the bottom of the page
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - document.body.offsetHeight * 0.1){
        window.scrollTo(0, document.body.offsetHeight - window.innerHeight);
        }
         
    });    
    // Add option to select when new channel is created
    socket.on("create_room", data => {       
        const option = document.createElement('option');
        option.text = `${data.room}`;
        option.value = `${data.room}`;        
        document.querySelector("#selectChannels").appendChild(option);
    });
    // Delete massege
    socket.on("delete", data => {
        let id = `#${data.id}`;
        let text = `<b>${data.nick}</b> deleted his massege`;
        $(id).fadeOut(300, function(){$(id).html(text)}).fadeIn(300);
        
    })
});