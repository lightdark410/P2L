var mysql = require("mysql");

var con = mysql.createConnection(config.get('dbConfig'));


//get full stock data with every foreign key
function getStock() {
    return new Promise((resolve, reject) => {
        var res = {"data":[]};
        con.query(
            `
            SELECT article.name, unit.unit, category.category, stock.*
            FROM stock
            LEFT JOIN article ON article.id = stock.article_id
            LEFT JOIN category ON category.id = article.category_id
            LEFT JOIN unit ON unit.id = article.unit_id
            `,
            function (err, result) {
                //send results
                if (err) reject(err);

                //correct timezone from date string
                for(let i = 0; i < result.length; i++){
                    result[i].date = result[i].date.toLocaleString();
                }
                
                res.data = result;
                resolve(res);
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

function getStockByStoragePlaceId(storage_place_id){
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
                if (err){
                    console.log(err);
                    reject(err);
                }; 
                resolve(result[0]);
            }
        );
    });
}

function getArticleByName(Name){
    return new Promise((resolve, reject) => {
        con.query(
            `SELECT article.name
             FROM article
             LEFT JOIN stock ON stock.article_id = article.id
             WHERE article.name = ? LIMIT 1`,
            [Name],
            function (err, result) {
                if (err) reject(err);
                resolve(result[0]);
            }
        );
    });
}

function deleteArticle(id){
    return new Promise((resolve, reject) => {
        con.query(
            "DELETE FROM article WHERE id = ?",
            [id],
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

function deleteStock(id) {
    return new Promise((resolve, reject) => {
        con.query(
            "DELETE FROM stock WHERE id = ?",
            [id],
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

function insertStock(article_id, number, minimum_number, creator, change_by) {
    return new Promise((resolve, reject) => {
        con.query(
            `INSERT INTO stock 
        (
            article_id,
            number,
            minimum_number,
            creator,
            change_by
        )
           VALUES (?, ?, ?, ?, ?)`,
            [
                article_id,
                number,
                minimum_number,
                creator,
                change_by
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
        con.query("UPDATE stock SET number = ?, minimum_number = ?, change_by = ? WHERE id = ?",
            [number, minimum_number, username, id],
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
        con.query("UPDATE stock SET number = ?, change_by = ? WHERE id = ?",
            [number, username, stock_id],
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
    getStock,
    getStockById,
    deleteStock,
    insertStock,
    insertArticle,
    UserSearch,
    getLatestStock,
    updateArticle,
    updateStock,
    getArticleByName,
    getStoragePlaceByStockId,
    getLatestArticle,
    getStockByStoragePlaceId,
    updateStockNumber,
    deleteArticle
}