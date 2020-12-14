var mysql = require("mysql");

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "inventur",
});

function getAll() {
    return new Promise((resolve, reject) => {
        var res = {"data":[]};
        con.query(
            `
            SELECT article.name, unit.unit, category.category, stock.*
            FROM stock
            LEFT JOIN article ON article.id = stock.article_id
            LEFT JOIN category ON category.id = article.category_id
            LEFT JOIN unit ON unit.id = article.unit_id
            WHERE stock.deleted = false
            `,
            function (err, result) {
                //send results
                if (err) reject(err);
                res.data = result;
                resolve(res);
            }
        );
    });
}

function getAllById(id) {
    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT article.name, unit.unit, category.category, stock.*
            FROM stock
            LEFT JOIN article ON article.id = stock.article_id
            LEFT JOIN category ON category.id = article.category_id
            LEFT JOIN unit ON unit.id = article.unit_id
            WHERE stock.id = ${id}`,
            function (err, result) {
                //send results
                if (err) reject(err);
                resolve(result);
            }
        );
    });
}

function getStockById(id) {
    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT article.name, unit.unit, category.category, stock.*
            FROM stock
            LEFT JOIN article ON article.id = stock.article_id
            LEFT JOIN category ON category.id = article.category_id
            LEFT JOIN unit ON unit.id = article.unit_id
            WHERE stock.id = ? LIMIT 1
          `,
            [id],
            function (err, result) {
                if (err) reject(err);
                resolve(result[0]);
            }
        );
    });
}

function getStockByStoragePlace(storage_place_id){
    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT article.name, category.category, stock.*
            FROM stock
            LEFT JOIN article ON article.id = stock.article_id
            LEFT JOIN category ON category.id = article.category_id
            LEFT JOIN storage_place ON storage_place.stock_id = stock.id
            WHERE storage_place.id = ? LIMIT 1
          `,
            [storage_place_id],
            function (err, result) {
                if (err) reject(err);
                resolve(result[0]);
            }
        );
    });
}

function getItemById(id) {
    return new Promise((resolve, reject) => {
        con.query("SELECT * FROM article WHERE id = ? LIMIT 1", [id], function (
            err,
            result
        ) {
            if (err) reject(err);
            resolve(result[0]);
        });
    });
}

//Needs to be updated (?)
function getEntryByName(Name){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT article.name
             FROM article
             LEFT JOIN stock ON stock.article_id = article.id
             WHERE article.name = ? 
             AND stock.deleted = 0  LIMIT 1`,
            [Name],
            function (err, result) {
                if (err) reject(err);
                resolve(result[0]);
            }
        );
    });
}

function markStockAsDeleted(id, username) {
    return new Promise((resolve, reject) => {
        var date = getDate();
        var time = getTime();
        con.query(
            "UPDATE stock SET date = ?, time = ?, change_by = ?, deleted = true WHERE id = ?",
            [date, time, username, id],
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result[0]);
            }
        );
    });
}

function insertStock(article_id, number, minimum_number, creator, change_by, date, time) {
    return new Promise((resolve, reject) => {
        con.query(
            `INSERT INTO stock 
        (
            article_id,
            number,
            minimum_number,
            creator,
            change_by,
            date,
            time
        )
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                article_id,
                number,
                minimum_number,
                creator,
                change_by,
                date,
                time
            ],
            function (err, result) {
                if (err){
                    reject(err);
                    console.log(err);

                } 
                resolve(result);
            }
        );
    });
}

function getLatestArticle(){
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT * FROM `article` ORDER BY id DESC LIMIT 1",
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);
                };
                resolve(result[0]);
            }
        );
    });
}

function getLatestStock() {
    return new Promise((resolve, reject) => {
        con.query(
            "SELECT * FROM `stock` ORDER BY id DESC LIMIT 1",
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);
                };
                resolve(result[0]);
            }
        );
    });
}

function insertArticle(name, unit_id, category_id) {
    return new Promise((resolve, reject) => {
        con.query(
        "INSERT INTO article (name, unit_id, category_id) VALUES (?, ?, ?)",
            [
                name,
                unit_id,
                category_id
            ],
            function (err, result) {
                if (err){
                    reject(err);
                    console.log(err);
                } 
                resolve(result);
            }
        );
    });
}

function insertKeywordList(stock_id, keyword_id){
    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO keyword_list (stock_id, keyword_id) VALUES (?, ?)",
            [
                stock_id,
                keyword_id
            ],
            function (err, result) {
                if (err){
                    reject(err);
                    console.log(err);
                } 
                resolve(result);

            }
        );      
    });
}

function deleteKeywordList(stock_id){
    return new Promise((resolve, reject) => {
        con.query(
            "DELETE FROM keyword_list WHERE stock_id = ?",
            [stock_id],
            function (err, result) {
                if (err){
                    reject(err);
                    console.log(err);
                } 
                resolve(result);

            }
        );      
    });
}

function getDate() {
    var d = new Date();
    var date = d.getUTCDate();
    var month = d.getUTCMonth();
    month += 1;
    var year = d.getUTCFullYear();

    if (date <= 9) {
        date = "0" + date;
    }
    if (month <= 9) {
        month = "0" + month;
    }

    var fulldate = date + "." + month + "." + year;

    return fulldate;
}

function getTime() {
    var d = new Date();

    var hours = d.getHours();
    var minutes = d.getMinutes();

    if (hours <= 9) {
        hours = "0" + hours;
    }
    if (minutes <= 9) {
        minutes = "0" + minutes;
    }

    var time = hours + ":" + minutes;

    return time;
}

function getMasterData(table) {
    return new Promise((resolve, reject) => {
        var res = {"data":[]};
        con.query(
            `SELECT * FROM ${table}`,
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                } else {
                    res.data = result;
                    resolve(res);
                }

            }
        );
    });
}

function getMasterDataByName(table, name){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM ${table} WHERE ${table} = ? LIMIT 1`,
            [name],
            function (err, result) {
                if (err){
                    reject(err)
                } ;
                resolve(result);
            }
        );
    }); 
}

function getStorageLocation(){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM storage_location`,
            function (err, result) {
                if (err) reject(err);
                resolve(result);
            }
        );
    });
}

function getStorageLocationByParent(parent){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM storage_location WHERE parent = ?`,
            [parent],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function getStorageLocationById(id){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM storage_location WHERE id = ? LIMIT 1`,
            [id],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function getStorageByStockId(stock_id){
    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT storage_place.place, storage_place.storage_location_id, storage_location.name, storage_location.parent
            FROM storage_place
            LEFT JOIN storage_location ON storage_place.storage_location_id = storage_location.id
            WHERE stock_id = ? LIMIT 1
            `,
            [stock_id],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function getEmptyStoragePlace(storage_location_id){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM storage_place WHERE storage_location_id = ? AND stock_id IS NULL LIMIT 1`,
            [storage_location_id],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function getStorageLocationByNameAndParent(name, parent){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM storage_location WHERE name = ? AND parent = ?`,
            [name, parent],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function insertStorageLocation(name, parent, places){
    return new Promise((resolve, reject) => {
        con.query(
            `INSERT INTO storage_location (name, parent, places) VALUES (?, ?, ?)`,
            [name, parent, places],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function updateStoragePlace(id, stock_id){
    return new Promise((resolve, reject) => {
        con.query(
            `UPDATE storage_place SET stock_id = ? WHERE id = ?`,
            [stock_id, id],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function updateStorageLocation(id, name, places){
    return new Promise((resolve, reject) => {
        con.query(
            `UPDATE storage_location SET name = ?, places = ? WHERE id = ?`,
            [name, places, id],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function getEmptyStoragePlaces(storage_location_id){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT COUNT(*) as empty_places FROM storage_place WHERE storage_location_id = ? AND stock_id IS NULL`,
            [storage_location_id],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result);
            }
        );
    });
}

function deleteStoragePlaces(storage_location_id, places, start){
    return new Promise((resolve, reject) => {
        try{
            for(var i = start; i > places; i--){
                con.query(
                    `DELETE FROM storage_place WHERE storage_location_id = ${storage_location_id} AND place = ? AND stock_id IS NULL`,
                    [i],
                    function (err, result){
                        if(err){
                            console.log(err);
                            reject(err);
                        }
                    }
                );
            };
            resolve("done");

        }catch(error){
            reject(error);

        }
    
    });
}

function deleteStorageLocation(storage_location_id){
    return new Promise((resolve, reject) => {
        con.query(
            `DELETE FROM storage_location WHERE id = ?`,
            [storage_location_id],
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);
                } else {
                    resolve(result);
                }

            }
        );
    });
}

function insertStoragePlaces(storage_location_id, places, start){
    return new Promise((resolve, reject) => {
        try{
            for(var i = start; i < places; i++){
                con.query(
                    `INSERT INTO storage_place (storage_location_id, place) VALUES (?, ?)`,
                    [storage_location_id, i+1],
                    function (err, result){
                        if(err){
                            console.log(err);
                            reject(err);
                        }
                    }
                );
            };
            resolve("done");

        }catch(error){
            reject(error);

        }
    
    });
}

function autoFill(title, table, value){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT DISTINCT ${title} FROM ${table}`,
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                } else {
                    var autoFillResults = [];
                    for (var i = 0; i < result.length; i++) {
                      var sqlRes = result[i][title].toUpperCase();
                      var val = value.toUpperCase();
            
                      if (sqlRes.startsWith(val)) {
                        //if a location starts with the user input
                        autoFillResults.push(result[i][title]); //add location to autoFillResults
                      }
                    }
                    resolve(autoFillResults);
                }
            }
        );
    });
}

function getKeywordsByName(name) {
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM keyword WHERE keyword = ?`,
            [name],
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);
                } else {
                    resolve(result);
                }

            }
        );
    });
}

function getKeywordlistByStockid(stock_id){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT GROUP_CONCAT(keyword.keyword) as keyword FROM keyword_list INNER JOIN keyword ON keyword_list.keyword_id = keyword.id WHERE keyword_list.stock_id = ?`,
            [stock_id],
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);
                } else {
                    resolve(result);
                }

            }
        );
    });
}

function insertMasterData(table, value) {
    return new Promise((resolve, reject) => {
        con.query(
            'INSERT INTO ' + table + ' (' + table + ') VALUES ("' + value + '")',
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);

                } else {
                    resolve(result);

                }

            }
        );
    });
}

function countMasterDataById(table, id){

    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT count(${table}_id) as number
            FROM article
            LEFT JOIN stock on article_id = article.id 
            WHERE ${table}_id = ? AND stock.deleted = 0
            `,
            [id],
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);

                } else {
                    resolve(result);

                }

            }
        );
    });
}

function countKeywordlistById(table, id){
    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT count(${table}_id) as number
            FROM keyword_list
            LEFT JOIN stock on stock.id = stock_id 
            WHERE ${table}_id = ? AND stock.deleted = 0
            `,
            [id],
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);

                } else {
                    resolve(result);

                }

            }
        );
    });
}


function deleteMasterData(table, value) {
    return new Promise((resolve, reject) => {
        con.query(
            `DELETE FROM ${table} WHERE ${table} = ?`,
            [value],
            function (err, result) {
                if (err) {
                    reject(err)
                    console.log(err);
                } else {
                    resolve(result);

                }

            }
        );
    });
}


function UserSearch(client, base, search_options) {
    return new Promise(function (resolve, reject) {

        client.search(base, search_options, function (err, resSearch) {
            if (err) {
                console.log('Error occurred while ldap search');
            } else {
                resSearch.on('searchEntry', function (entry) {
                    resolve(entry.object);
                });
            }
        });
    })
}

async function log(id, event) {
    var data = await getAllById(id);

    //add keywords
    var keywordlist = await getKeywordlistByStockid(data[0].id);
    if(keywordlist[0].keyword != null){
        data[0].keyword = keywordlist[0].keyword;        
    }else{
        data[0].keyword = "";
    }

    //add storage place
    var storage_place = await getStorageByStockId(data[0].id);
    data[0].storage_location = storage_place[0].name;
    data[0].storage_place = storage_place[0].place;
    console.log("Data: ");
    console.log(data);
    console.log("~~~~~~~~");
    return new Promise((resolve, reject) => {
        con.query(
            "INSERT INTO `log`(`event`, `stock_id`, `name`, `category`, `keywords`, `location_id`, `location`, `date`, `time`, `creator`, `change_by`, `number`, `minimum_number`, `deleted`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [event, data[0].id, data[0].name, data[0].category, data[0].keyword, storage_place[0].storage_location_id, data[0].storage_location, data[0].date, data[0].time, data[0].creator, data[0].change_by, data[0].number, data[0].minimum_number, data[0].deleted],
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
        con.query(
            "SELECT * FROM `log`",
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

function updateArticle(article_id, name, unit_id, category_id) {
    return new Promise((resolve, reject) => {
        con.query(`UPDATE article SET name="${name}", unit_id="${unit_id}", category_id="${category_id}" WHERE id = ?`,
            [article_id],
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            });
    });
}

function updateStock(number, minimum_number, username, id) {
    return new Promise((resolve, reject) => {
        con.query("UPDATE stock SET number = ?, minimum_number = ?, change_by = ?, date = ?, time = ?, deleted = 0 WHERE id = ?",
            [number, minimum_number, username, getDate(), getTime(), id],
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            });
    });
}

function updateStockNumber(stock_id, number, username){
    return new Promise((resolve, reject) => {
        con.query("UPDATE stock SET number = ?, change_by = ?, date = ?, time = ?, deleted = 0 WHERE id = ?",
            [number, username, getDate(), getTime(), stock_id],
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            });
    });
}

function setStoragePlaceToNull(stock_id){
    return new Promise((resolve, reject) => {
        con.query("UPDATE storage_place SET stock_id = NULL WHERE stock_id = ?",
            [stock_id],
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result);
            });
    });
}

function getStoragePlaceByStockId(stock_id){
    return new Promise((resolve, reject) => {
        con.query("SELECT * FROM storage_place WHERE stock_id = ? LIMIT 1",
            [stock_id],
            function (err, result) {
                if (err) {
                    reject(err);
                    console.log(err);
                }
                resolve(result[0]);
            });
    });
}



module.exports = {
    getAll,
    getStockById,
    getItemById,
    markStockAsDeleted,
    insertStock,
    insertArticle,
    getDate,
    getTime,
    UserSearch,
    getMasterData,
    insertMasterData,
    deleteMasterData,
    log,
    getAllById,
    getLog,
    getLatestStock,
    getLogByStockId,
    updateArticle,
    updateStock,
    getKeywordsByName,
    autoFill,
    getEntryByName,
    getMasterDataByName,
    getStorageLocation,
    getStorageLocationByParent,
    getStorageLocationById,
    insertStorageLocation,
    insertStoragePlaces,
    getEmptyStoragePlaces,
    insertKeywordList,
    getKeywordlistByStockid,
    getStorageLocationByNameAndParent,
    getEmptyStoragePlace,
    updateStoragePlace,
    updateStorageLocation,
    getStorageByStockId,
    deleteKeywordList,
    setStoragePlaceToNull,
    getStoragePlaceByStockId,
    countMasterDataById,
    deleteStoragePlaces,
    deleteStorageLocation,
    getLatestArticle,
    countKeywordlistById,
    getStockByStoragePlace,
    updateStockNumber
}