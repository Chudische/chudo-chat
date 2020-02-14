document.addEventListener('DOMContentLoaded', () => { 
var allowSubmit = false

    $("form").on("submit", function (e) {              
       
        if (!allowSubmit){
            e.preventDefault();                  
            var nickname = document.querySelector('#nickname').value;       
            if (!nickname) {
                document.querySelector('#nickname').style = 'border-color: red';
                $('.alert-fixed').text('Nickname is required');
                $('.alert-fixed').fadeIn(400).delay(3000).fadeOut(400); 
            } else {                        
                let userUrl = "/check_user?nickname=" + nickname;
                var request = $.getJSON(userUrl, function(resp){
                    if (resp.user == 'ok'){
                        localStorage.setItem('nickname', nickname);
                        allowSubmit = true;                                           
                        $('#newUserModal').submit();              
                        
                    } else {
                        document.querySelector('#nickname').style = 'border-color: red';
                        $('.alert-fixed').text('Current nickname is already registred');
                        $('.alert-fixed').fadeIn(400).delay(3000).fadeOut(400); 
                    }
                });
            }
        }     
    });
});     