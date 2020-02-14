import os

from flask import Flask, render_template, redirect, request, jsonify, session, flash
from flask_socketio import SocketIO, emit, send, join_room, leave_room
from helpers import Masseges, User, login_required
from dotenv import load_dotenv
from datetime import datetime


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


@app.route("/channel")
def channel():
    channel = request.args.get("channel")
    channel_masseges = masseges[channel]
    return jsonify(channel_masseges)


@app.route("/login", methods=["POST", "GET"])
def login():
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
    channel = request.args.get("channel")
    try:
        channel_masseges = masseges[channel]
    except KeyError:
        print(f"\n Channel: {channel} not found \n")
        return jsonify({"channel": "bad"})        
    
    return jsonify(channel_masseges)


@socketio.on("join")
def join(data):   
    nickname = data["nickname"]
    room = data["room"]
    print('User {} has connected to {}'.format(nickname, room))
    join_room(room)
    emit("show_massege", {"nick": nickname, "join": "true"}, room=room )


@socketio.on("create_room")
def create(data):
    room = data["room"]
    print(f"\n New room was created room: {room}\n")
    emit("create_room", {"room": room}, broadcast=True)


@socketio.on("leave")
def leave(data):
    nickname = data["nickname"]
    room = data["room"]
    leave_room(room)
    emit("show_massege", {"nick": nickname, "leave": "true"}, room=room)


@socketio.on("massege")
def massege(data):       
    date = datetime.now().strftime('%d.%m.%Y %H:%M')    
    user_massege = Masseges(data["user"], data["massege"], data["channel"], date)
    print(user_massege) 
    room = data["channel"]           
    emit("show_massege", 
        {"nick": user_massege.name, "massege": user_massege.write, "date": user_massege.date}, room=room)

