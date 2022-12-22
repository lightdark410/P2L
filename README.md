
# P2L

## Strucktuer

in *dbContropller* are all revised database functions.
in *mastertdata*, *functions* and *taskDB* are the other functions, witch are old and should revised but are still in use.

## setup

### how to run as localhost

install the ***MySQL Shell*** and, if you want to work with an UI ***MySQL Workbench***

*set a user* for the database up then

you go to the *config* folder in the P2L project and copy the *default.jason* and 
rename it to *local-development.json*

dbConfig, **host** should be **127.0.0.1**
**user** should be the user you have seted up in Mysql
**password** should be the password for the user you have seted up in Mysql

QR, **domain** should be **http://127.0.0.1:8090**

## how to install and start the server

type in your shell **npm install**
then type **npm start** to start the server