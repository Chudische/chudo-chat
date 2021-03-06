import os

from flask import Flask, render_template, redirect, request, jsonify, session, flash
from flask_socketio import SocketIO, emit, send, join_room, leave_room
from helpers import Masseges, User, login_required
from dotenv import load_dotenv
from datetime import datetime

# Load secret key from dotenv file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Configuring flask application
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)


@app.after_request
def after_request(response):
    """Disable caching"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

masseges = Masseges.channels
channels_list = masseges.keys()
users = User.user_db


@app.route("/", methods=["POST", "GET"])
@login_required
def index():
    """Main page"""
    if request.method == "POST":
        channel = request.form.get("channel") 
        if not channel:
            flash("Must provide channel")
            return redirect("/")
        if channel in channels_list:
            flash("Current channel already exist")
            return redirect("/")
        Masseges.channels[channel] = []
        return redirect("/")
    else:              
        return render_template("index.html", channels_list=channels_list)


@app.route("/<channel>")
def index_redirect(channel):
    """Redirect to index if user update page or close browser"""
    return redirect("/")


@app.route("/login", methods=["POST", "GET"])
def login():
    """Login page"""
    if request.method == "POST":
        if not request.form.get("nickname"):
            flash("Nickname is required")
            return render_template("login.html")
        else:
            session["user_id"] = request.form.get("nickname")
            return redirect("/")
    else:
        return render_template("login.html")


@app.route("/check_user")
def check_user():
    """Check is nickname avaible and add new nickname to db"""
    nickname = request.args.get("nickname")    
    if nickname in users:        
        return jsonify({"user": "bad"})
    User(nickname)    
    return jsonify({"user": "ok"})


@app.route("/get_masseges")
def get_masseges():
    """Get masseges from channel"""
    channel = request.args.get("channel")
    try:
        channel_masseges = masseges[channel]
    except KeyError:
        return jsonify({"channel": "bad"})        
    
    return jsonify(channel_masseges)


@socketio.on("join")
def join(data):   
    nickname = data["nickname"]
    room = data["room"]    
    join_room(room)
    emit("show_massege", {"nick": nickname, "join": "true"}, room=room )


@socketio.on("create_room")
def create(data):
    room = data["room"]    
    emit("create_room", {"room": room}, broadcast=True)


@socketio.on("leave")
def leave(data):
    nickname = data["nickname"]
    room = data["room"]
    leave_room(room)
    emit("show_massege", {"nick": nickname, "leave": "true"}, room=room)


@socketio.on("delete")
def delete(data):
    room = data["channel"]    
    for index, post in enumerate(masseges[room]):
        if post["id"] == int(data["id"]):            
            masseges[room].pop(index)
    emit("delete", {"nick": data["user"], "id": data["id"]}, room=room)
      

@socketio.on("massege")
def massege(data):       
    date = datetime.now().strftime('%d.%m.%Y %H:%M')    
    user_massege = Masseges(data["user"], data["massege"], data["channel"], date, data["quote"])    
    room = data["channel"]           
    emit("show_massege", 
        {"nick": user_massege.name, "text": user_massege.text, "date": user_massege.date, "quote": user_massege.quote, "id": user_massege.id}, room=room)

