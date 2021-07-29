let mysql = require("mysql");
const config = require('config'); 

var con = mysql.createConnection(config.get('dbConfig'));


function insert_mobile_list(username) {
    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO mobile_list (creator) VALUES (?);", [username],
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

function getUnfinishedListEntries(list_id){
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT * FROM mobile_list_entries WHERE list_id = ? AND status != 1;", [list_id],
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

function get_latest_mobile_list_id(){
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

function insert_list_entry(list_id, stock_id, lay_in, amount, status){
    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO mobile_list_entries (list_id, stock_id, lay_in, amount, status) VALUES (?, ?, ?, ?, ?);", [list_id, stock_id, lay_in, amount, status],
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

function update_list_entry_status(list_id, stock_id, status){
    return new Promise((resolve, reject) => {
        con.query(
            "UPDATE mobile_list_entries SET status = ? WHERE list_id = ? AND stock_id = ?", [status, list_id, stock_id],
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

function get_mobile_list(id){
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT * FROM mobile_list INNER JOIN mobile_list_entries ON mobile_list_entries.list_id = mobile_list.id WHERE mobile_list.id = ?;", [id],
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
    insert_mobile_list,
    get_latest_mobile_list_id,
    insert_list_entry,
    update_list_entry_status,
    get_mobile_list,
    getUnfinishedListEntries
}