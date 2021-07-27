let mysql = require("mysql");
const config = require('config'); 

var con = mysql.createConnection(config.get('dbConfig'));


function getMasterdata(table) {
    return new Promise((resolve, reject) => {
        var res = {"data":[]};
        con.query(
            `SELECT * FROM ${table}`,
            function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    res.data = result;
                    resolve(res);
                }

            }
        );
    });
}

function getMasterdataByName(table, name){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM ${table} WHERE ${table} = ? LIMIT 1`,
            [name],
            function (err, result) {
                if (err){
                    reject(err);
                }else{
                    resolve(result[0]);
                }
            }
        );
    }); 
}

function insertMasterdata(table, value) {
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

function deleteMasterdata(table, value) {
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

function countMasterdataById(table, id){

    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT count(${table}_id) as number
            FROM article
            LEFT JOIN stock on article_id = article.id 
            WHERE ${table}_id = ?
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
                resolve(result[0]);
            }
        );
    });
}

function getStorageLocationByParentId(parentId){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT * FROM storage_location WHERE parent = ?`,
            [parentId],
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
                resolve(result[0]);
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
                resolve(result[0]);
            }
        );
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

function countEmptyStoragePlacesByLocationId(storage_location_id){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT COUNT(*) as empty_places FROM storage_place WHERE storage_location_id = ? AND stock_id IS NULL LIMIT 1`,
            [storage_location_id],
            function (err, result){
                if(err){
                    console.log(err);
                    reject(err);
                }
                resolve(result[0].empty_places);
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

function getKeywordsByStockId(id) {
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT GROUP_CONCAT(keyword.keyword) FROM keyword INNER JOIN keyword_list ON keyword_list.keyword_id = keyword.id WHERE keyword_list.stock_id = ?`,
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
                    resolve(result[0]);
                }

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

function countKeywordlistById(table, id){
    return new Promise((resolve, reject) => {
        con.query(
            `
            SELECT count(${table}_id) as number
            FROM keyword_list
            LEFT JOIN stock on stock.id = stock_id 
            WHERE ${table}_id = ?
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

module.exports = {
    getMasterdata,
    getMasterdataByName,
    insertMasterdata,
    deleteMasterdata,
    countMasterdataById,
    getStorageLocation,
    getStorageLocationById,
    getStorageLocationByParentId,
    insertStorageLocation,
    updateStorageLocation,
    deleteStorageLocation,
    getStorageByStockId,
    getEmptyStoragePlace,
    countEmptyStoragePlacesByLocationId,
    setStoragePlaceToNull,
    deleteStoragePlaces,
    getStorageLocationByNameAndParent,
    insertStoragePlaces,
    updateStoragePlace,
    getKeywordsByStockId,
    getKeywordsByName,
    getKeywordlistByStockid,
    insertKeywordList,
    countKeywordlistById,
    deleteKeywordList
}