
document.addEventListener('DOMContentLoaded', () => {    
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    
    var user = localStorage.getItem('nickname');

    var channel = localStorage.getItem('channel') ? localStorage.getItem('channel') : 'default';

    const template = Handlebars.compile(document.querySelector("#chat-massege").innerHTML)

    function add_massege(data){
        const massege = template(data);
        document.querySelector("#new-masseges").innerHTML += massege;

    };
    // On connect join the latest room(that user was in) or default room 
    socket.on('connect', function (){        
        let data = {room: channel, nickname: user};                   
        socket.emit('join', data);
        document.querySelector("#selectChannels").value = channel;
        const request = new XMLHttpRequest();
        request.open("GET", `/get_masseges?channel=${channel}`);
        request.onload = () => {
            const resp = JSON.parse(request.responseText);
            console.log(resp);
            resp.forEach(add_massege);        
        };
        request.send();
        // $.getJSON(`/get_masseges?channel=${channel}`, function(resp){
        //     if (resp.channel == 'bad') {                 
        //             localStorage.removeItem("channel");                           
        //     } else {                                  
        //         for (msg in resp){                                       
        //             const li = document.createElement('li');                 
        //             li.innerHTML = `<b>${resp[msg].nick}: </b><span class="small text-muted">(${resp[msg].date})</span><p>${resp[msg].text}</p>`;
        //             document.querySelector('#masseges').prepend(li);                
        //         }
        //     }
        // });
    });
    // Submiting massege via "submit" button 
    document.querySelector('#submitButton').onclick = () => {                
        let massege = document.querySelector("textarea").value;           
        socket.emit('massege', {'massege': massege, 'user': user, channel: channel});
        document.querySelector("textarea").value = '';
        document.querySelector("textarea").focus();                         
        return false;
    };

    // Submiting massege by hiting the "Enter" key (shift+Enter - line break)
    $("#inputMassege").keypress(function(event){       
        if (event.which == 13 && !event.shiftKey){
            let massege = document.querySelector("textarea").value;           
            socket.emit('massege', {'massege': massege, 'user': user, channel: channel});
            document.querySelector("textarea").value = '';
            return false;              
        }        
    });

    // On connect to channel clear the  masseges from previous room and add masseges from new room
    $('#connectButton').on("click", function (){
        socket.emit('leave', {nickname: user, room: channel});
        channel = $("#selectChannels").val();
        let data = {room: channel, nickname: user};            
        localStorage.setItem('channel', channel);            
        socket.emit('join', data);
        $("#masseges").find("li").remove();
        $.getJSON(`/get_masseges?channel=${channel}`, function(resp){
            // console.log(resp)       
            for (msg in resp){                             
                    const li = document.createElement('li');
                    li.innerHTML = `<b>${resp[msg].nick}: </b><span class="small text-muted">(${resp[msg].date})</span><p>${resp[msg].massege}</p>`;
                    document.querySelector('#masseges').prepend(li);              
            }           
        });
    });

    $('#createButton').on('click', function (){
        $('#createChannelModal').modal("show");
        $("#createChannel").focus();
    });
    var allowCreate = false;
    $('#createForm').on('submit', function (e) {
        new_channel = $("#createChannel").val();
        if (allowCreate){
            socket.emit("leave", {nickname: user, room: channel})
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

    socket.on("show_massege", data => {
        const li = document.createElement('li');
        if (data.join) {
            li.innerHTML = `<b>${data.nick}</b> has joined the channel`
        } else if (data.leave){
            li.innerHTML = `<b>${data.nick}</b> has left the channel`
        } else {        
            li.innerHTML = `<b>${data.nick}: </b><span class="small text-muted">(${data.date})</span><p>${data.massege}</p>`;
        }
        document.querySelector('#masseges').prepend(li);
    });    

    socket.on("create_room", data => {       
        const option = document.createElement('option');
        option.text = `${data.room}`;
        option.value = `${data.room}`;        
        document.querySelector("#selectChannels").appendChild(option);
    });
});