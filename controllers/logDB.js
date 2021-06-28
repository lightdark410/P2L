let mysql = require("mysql");
let masterdataDB = require("./masterdataDB"); //import sql functions for handling masterdata database changes
let functions = require("./functions.js");

let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "inventur"
});

async function log(id, event) {
    var data = await functions.getStockById(id);
    let deleted = 0;
    if(event == "delete"){
        deleted = 1;
    }
    //add keywords
    var keywordlist = await masterdataDB.getKeywordlistByStockid(data.id);
    if(keywordlist.keyword != null){
        data.keyword = keywordlist.keyword;        
    }else{
        data.keyword = "";
    }

    //add storage place
    var storage_place = await masterdataDB.getStorageByStockId(data.id);
    data.storage_location = storage_place.name;
    data.storage_place = storage_place.place;

    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO `log`(`event`, `stock_id`, `name`, `category`, `keywords`, `location_id`, `location`, `date`, `time`, `creator`, `change_by`, `number`, `minimum_number`, `deleted`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [event, data.id, data.name, data.category, data.keyword, storage_place.storage_location_id, data.storage_location, data.date, data.time, data.creator, data.change_by, data.number, data.minimum_number, deleted],
            function (err, result) {
                //send results
                if (err) {
                    reject(err);
                    console.log(err);
                };
                resolve(result);
            }
        );
    });
}

function getLog() {
    return new Promise((resolve, reject) => {
        var res = {"data":[]};
        con.query(
            "SELECT * FROM `log`",
            function (err, result) {
                //send results
                if (err) {
                    reject(err);
                    console.log(err);
                }
                res.data = result;
                resolve(res);
            }
        );
    });
}

function getLogByStockId(stock_id) {
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT * FROM `log` WHERE stock_id = ?", [stock_id],
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
    log,
    getLog,
    getLogByStockId
}