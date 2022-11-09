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

async function deleteTask(taskID) {
  const connection = await con.getConnection();
  await connection.beginTransaction();
  try {
    await connection.query("DELETE FROM task_entries WHERE task_id = ?", [
      taskID,
    ]);
    await connection.query("DELETE FROM task_log WHERE task_id = ?", [taskID]);
    await connection.query("DELETE FROM task WHERE id = ?", [taskID]);
  } catch (error) {
    await connection.rollback();
    await connection.release();
    throw error;
  }
  await connection.commit();
  await connection.release();
}

module.exports = { deleteTask, getStockIDByArticlenumber, updateTaskStatus };
