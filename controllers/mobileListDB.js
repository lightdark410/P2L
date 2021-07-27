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

function insert_mobile_list_entries(list_id, stock_id, lay_in, amount){
    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO mobile_list_entries (list_id, stock_id, lay_in, amount) VALUES (?, ?, ?, ?);", [list_id, stock_id, lay_in, amount],
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
    insert_mobile_list_entries,
    get_mobile_list
}