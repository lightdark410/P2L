# P2L

## Structure

in [dbController.js](controllers/dbController.js) are all refactored database functions.  
in [masterdataDB.js](controllers/masterdataDB.js), [functions.js](controllers/functions.js) and [taskDB.js](controllers/taskDB.js) are the other functions, which are old and should be refactored, but some are still in use.

## setup

### how to run as localhost

1. install the ***MySQL Community Server*** unless you have a MySQL server already  
1. (optional) install ***MySQL Shell*** and, if you want to work with an UI ***MySQL Workbench***

1. set up a user account for the database  
**Note** `Authentication Type` needs to be `Standard` for the old database functions to work

1. go to the [config](config) folder, copy the `default.json` and rename it to `local-development.json`  
   under `dbConfig`:  
     - `host` should be `localhost`,  
     - `user` should be the user you have set up in MySQL,  
     - `password` should be the password for the user you have set up in MySQL  

   under `qr`:  
     -  `domain` should be `http://localhost:8090`

1. type in your shell `npm install` to install the server

## start the server

type `npm start` to start the server
