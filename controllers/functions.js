var mysql = require("mysql");
const config = require("config");

var con = mysql.createPool(config.get("dbConfig"));

//gets full stock data with every foreign key
function getStock() {
  return new Promise((resolve, reject) => {
    var res = { data: [] };
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
        if (typeof result !== "undefined") {
          for (let i = 0; i < result.length; i++) {
            result[i].date = result[i].date.toLocaleString();
          }
        }

        res.data = result;
        resolve(res);
      }
    );
  });
}

//gets full stock data by stock id
function getStockById(id) {
  return new Promise((resolve, reject) => {
    con.query(
      `
            SELECT article.name, unit.id as unit_id, category.id as category_id, stock.*, IFNULL(GROUP_CONCAT(keyword_list.keyword_id SEPARATOR ","), "") AS keyword_ids
            FROM stock
            LEFT JOIN article ON article.id = stock.article_id
            LEFT JOIN category ON category.id = article.category_id
            LEFT JOIN unit ON unit.id = article.unit_id
            LEFT JOIN keyword_list ON stock.id = keyword_list.stock_id
            WHERE stock.id = ?
            GROUP BY stock.id
            LIMIT 1
          `,
      [id],
      function (err, result) {
        if (err) reject(err);
        resolve(result[0]);
      }
    );
  });
}

//gets full stock data by storagePlace id
function getStockByStoragePlaceId(storage_place_id) {
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
        if (err) {
          console.log(err);
          reject(err);
        }
        resolve(result[0]);
      }
    );
  });
}

function getStockByName(Name) {
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

//deletes article by id
function deleteArticle(id) {
  return new Promise((resolve, reject) => {
    con.query("DELETE FROM article WHERE id = ?", [id], function (err, result) {
      if (err) {
        reject(err);
        console.log(err);
      }
      resolve(result[0]);
    });
  });
}

//deletes stock by id
function deleteStock(id) {
  return new Promise((resolve, reject) => {
    con.query("DELETE FROM stock WHERE id = ?", [id], function (err, result) {
      if (err) {
        reject(err);
        console.log(err);
      }
      resolve(result[0]);
    });
  });
}

//creates new Stock
function insertStock(
  article_id,
  articlenumber,
  number,
  minimum_number,
  creator,
  change_by
) {
  return new Promise((resolve, reject) => {
    con.query(
      `INSERT INTO stock
        (
            article_id,
            articlenumber,
            number,
            minimum_number,
            creator,
            change_by
        )
           VALUES (?, ?, ?, ?, ?, ?)`,
      [article_id, articlenumber, number, minimum_number, creator, change_by],
      function (err, result) {
        if (err) {
          reject(err);
          console.log(err);
        }
        resolve(result);
      }
    );
  });
}

//gets article with highest id
function getLatestArticle() {
  return new Promise((resolve, reject) => {
    con.query(
      "SELECT * FROM `article` ORDER BY id DESC LIMIT 1",
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

//gets stock with highest id
function getLatestStock() {
  return new Promise((resolve, reject) => {
    con.query(
      "SELECT * FROM `stock` ORDER BY id DESC LIMIT 1",
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

//creates article
function insertArticle(name, unit_id, category_id) {
  return new Promise((resolve, reject) => {
    con.query(
      "INSERT INTO article (name, unit_id, category_id) VALUES (?, ?, ?)",
      [name, unit_id, category_id],
      function (err, result) {
        if (err) {
          reject(err);
          console.log(err);
        }
        resolve(result);
      }
    );
  });
}

//Searches user in ldap
function UserSearch(client, base, search_options) {
  return new Promise(function (resolve, reject) {
    client.search(base, search_options, function (err, resSearch) {
      if (err) {
        console.log("Error occurred while ldap search");
      } else {
        resSearch.on("searchEntry", function (entry) {
          resolve(entry.object);
        });
      }
    });
  });
}

//updates article by article id
function updateArticle(article_id, name, unit_id, category_id) {
  return new Promise((resolve, reject) => {
    con.query(
      `UPDATE article SET name = ?, unit_id = ?, category_id = ? WHERE id = ?`,
      [name, unit_id, category_id, article_id],
      function (err, result) {
        if (err) {
          reject(err);
          console.log(err);
        }
        resolve(result);
      }
    );
  });
}

//updates stock number & minimum_number
function updateStock(
  number,
  minimum_number,
  username,
  stock_id,
  articlenumber
) {
  return new Promise((resolve, reject) => {
    con.query(
      "UPDATE stock SET number = ?, minimum_number = ?, change_by = ?, articlenumber = ? WHERE id = ?",
      [number, minimum_number, username, articlenumber, stock_id],
      function (err, result) {
        if (err) {
          reject(err);
          console.log(err);
        }
        resolve(result);
      }
    );
  });
}

//updates stock number
function updateStockNumber(stock_id, number, username) {
  return new Promise((resolve, reject) => {
    con.query(
      "UPDATE stock SET number = ?, change_by = ? WHERE id = ?",
      [number, username, stock_id],
      function (err, result) {
        if (err) {
          reject(err);
          console.log(err);
        }
        resolve(result);
      }
    );
  });
}

function getStoragePlaceByStockId(stock_id) {
  return new Promise((resolve, reject) => {
    con.query(
      "SELECT * FROM storage_place WHERE stock_id = ? LIMIT 1",
      [stock_id],
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
  getStockByName,
  getStoragePlaceByStockId,
  getLatestArticle,
  getStockByStoragePlaceId,
  updateStockNumber,
  deleteArticle,
};
