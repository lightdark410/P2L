let mysql = require("mysql");
const config = require('config'); 

var con = mysql.createConnection(config.get('dbConfig'));


function insert_task(username) {
    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO task (creator) VALUES (?);", [username],
            function (err, result) {
                //send results
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            }
        );
    });
}

function getUnfinishedTaskEntries(list_id){
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT * FROM task_entries WHERE list_id = ? AND status != 1;", [list_id],
            function (err, result){
                if(err){
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            }
        );
    });
}

function get_latest_task_id(){
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT LAST_INSERT_ID() as id;",
            function (err, result) {
                //send results
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result[0]["id"]);
            }
        );
    });
}

function insert_task_entry(list_id, stock_id, lay_in, amount, status){
    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO task_entries (list_id, stock_id, lay_in, amount, status) VALUES (?, ?, ?, ?, ?);", [list_id, stock_id, lay_in, amount, status],
            function (err, result){
                if(err){
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            }
        );
    });
}

function update_task_entry_status(list_id, stock_id, status){
    return new Promise((resolve, reject) => {
        con.query(
            "UPDATE task_entries SET status = ? WHERE list_id = ? AND stock_id = ?", [status, list_id, stock_id],
            function (err, result){
                if(err){
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            }
        )
    })
}

function get_task(id){
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT *, task.status as task_status FROM task INNER JOIN task_entries ON task_entries.list_id = task.id WHERE task.id = ?;", [id],
            function (err, result) {
                //send results
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            }
        );
    });
}

function finish_task(id){
    return new Promise((resolve, reject) => {
        con.query(
            "UPDATE task SET status = 1 WHERE id = ?;", [id],
            function (err, result) {
                //send results
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            }
        );
    });
}



module.exports = {
    insert_task,
    get_latest_task_id,
    insert_task_entry,
    update_task_entry_status,
    get_task,
    getUnfinishedTaskEntries,
    finish_task
}