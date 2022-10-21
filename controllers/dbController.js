let mysql = require("mysql2/promise");
const config = require("config");

var con = mysql.createPool(config.get("dbConfig"));

async function getStockIDByArticlenumber(articlenumber) {
  const [rows, fields] = await con.query(
    `SELECT id FROM stock WHERE articlenumber = ?`,
    [articlenumber]
  );
  return rows;
}

async function updateTaskStatus(taskID, newStatus) {
  const [rows, fields] = await con.query(
    `UPDATE task SET status = ? WHERE id = ?`,
    [newStatus, taskID]
  );
  return rows;
}

module.exports = { getStockIDByArticlenumber, updateTaskStatus };
