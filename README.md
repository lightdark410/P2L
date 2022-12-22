
# P2L

## Structure

in *dbContropller* are all revised database functions.
in *mastertdata*, *functions* and *taskDB* are the other functions, whitch are old and should revised but are still in use.

## setup

### how to run as localhost

install the ***MySQL Community Server*** if you had not a server allready, 
install ***MySQL Shell*** and, if you want to work with an UI ***MySQL Workbench***

*set a user* for the database up
**authentication Type** should be **Standard** then

you go to the *config* folder in the P2L project and copy the *default.json* and 
rename it to *local-development.json*

dbConfig, **host** should be **127.0.0.1**
**user** should be the user you have set up in Mysql
**password** should be the password for the user you have set up in Mysql

QR, **domain** should be **http://127.0.0.1:8090**

## how to install and start the server

type in your shell **npm install** to install the server
then type **npm start** to start the server