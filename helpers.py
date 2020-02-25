from functools import wraps
from flask import request, redirect, session
from flask_login import UserMixin
from flask_socketio import disconnect

def login_required(f):
    """
    Decorate routes to require login.

    http://flask.pocoo.org/docs/1.0/patterns/viewdecorators/
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated_function


class Masseges():
    """User massege with fields name and massege"""    
    channels = {}
    
    @classmethod
    def add_new(cls, massege, channel):
        if channel not in Masseges.channels:
            Masseges.channels[channel] = []           
        channel = Masseges.channels[channel]
        if len(channel) > 100:
            channel.pop(0)
        channel.append(massege)
        

    def __init__(self, name, massege, channel, date, quote):        
        self.name = name
        self.text = massege
        self.date = date
        self.channel = channel
        self.quote = quote
        self.massege = {"nick": name, "text": massege, "date": self.date, "quote": self.quote}                
        Masseges.add_new(self.massege, self.channel)         

    def __str__(self):
        return f"{self.massege}"
    def __repr__(self):
        return f"{self.massege}"


class User(UserMixin):
    user_db = {}
    
    def __init__(self, name):       
        self.name = name
        User.user_db[self.name] = self
    
    @classmethod
    def get(cls, id):
        return cls.user_db.get(id)

    def __str__(self):
        return f"User: {self.name}"
    
    def __repr__(self):
        return f"User: {self.name}"


    
