const mysql = require("mysql2/promise");
const config = require("config");

const connPool = mysql.createPool(config.get("dbConfig"));

/*********************************************************************
 *                      HELPERFUNCTIONS                              *
 *********************************************************************/
const CTE_getFullLocationPathFromLeaf = function () {
  return `
	  WITH RECURSIVE cte as (
      SELECT childTable.id, childTable.name, childTable.parent, childTable.name AS fullpath
      FROM inventur.storage_location AS childTable
      WHERE childTable.id in ?
      UNION ALL
      SELECT parentTable.id, parentTable.name, parentTable.parent, CONCAT(parentTable.name, '-', childTable.fullpath) AS fullpath
      FROM inventur.storage_location AS parentTable
      INNER JOIN cte as childTable
      ON childTable.parent = parentTable.id
      )
	  SELECT fullpath FROM cte WHERE parent = 0;`;
};

const CTE_getFullLocationPathFromLeaf_single = function () {
  return `
	  WITH RECURSIVE cte as (
      SELECT childTable.id, childTable.name, childTable.parent, childTable.name AS fullpath
      FROM inventur.storage_location AS childTable
      WHERE childTable.id = ?
      UNION ALL
      SELECT parentTable.id, parentTable.name, parentTable.parent, CONCAT(parentTable.name, '-', childTable.fullpath) AS fullpath
      FROM inventur.storage_location AS parentTable
      INNER JOIN cte as childTable
      ON childTable.parent = parentTable.id
      )
	  SELECT fullpath FROM cte WHERE parent = 0;`;
};

/*********************************************************************
 *                      EXPORTED FUNCTIONS                           *
 *********************************************************************/

async function deleteTask(taskID) {
  const connection = await connPool.getConnection();
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

// FIXME: don't log a change if the actual change amount is 0
// TODO: move logging, tasklog and updating stock values to updateTaskStatus()
async function finishTask(taskID, username) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  try {
    const [taskInfo] = await connection.query(
      `SELECT status
       FROM task
       WHERE id = ?
       FOR UPDATE`,
      [taskID]
    );
    if (taskInfo[0].status === 1) {
      // if task was alreay finished: abort
      await connection.rollback();
      await connection.release();
      return "Already finished";
    }
    const [taskEntries] = await connection.query(
      `SELECT stock_id, amount, amount_real, status, lay_in
       FROM task_entries
       WHERE task_id = ?`,
      [taskID]
    );
    for (entry of taskEntries) {
      const [stockEntry] = await connection.query(
        `SELECT
           article.name,
           stock.number,
           stock.minimum_number,
           stock.article_id,
           stock.creator,
           stock.change_by,
           category.category
         FROM stock
         INNER JOIN article ON article.id = stock.article_id
         INNER JOIN category ON category.id = article.category_id
         WHERE stock.id = ?
         FOR UPDATE`,
        [entry.stock_id]
      );
      const [keywords] = await connection.query(
        `SELECT keyword.keyword
           FROM keyword_list, keyword
           WHERE keyword_list.keyword_id = keyword.id
             AND keyword_list.stock_id = ?`,
        [entry.stock_id]
      );
      const keywordArr = keywords.map((e) => e.keyword);
      stockEntry[0].keywords = keywordArr.join(", ");
      // calculate new amount
      const newAmount =
        entry.lay_in === 1
          ? stockEntry[0].number + entry.amount_real
          : stockEntry[0].number - entry.amount_real;
      const [storagePlace] = await connection.query(
        `SELECT place, storage_location_id
         FROM storage_place
         WHERE stock_id = ?`,
        [entry.stock_id]
      );
      // FIXME: move outside loop for optimisation
      const [storageLocation] = await connection.query(
        CTE_getFullLocationPathFromLeaf_single(),
        [storagePlace[0].storage_location_id]
      );
      await connection.query(
        `UPDATE stock
         SET number = ?
         WHERE id = ?`,
        [newAmount, entry.stock_id]
      );
      await connection.query(
        `INSERT INTO log
         (
          event,
          stock_id,
          name,
          category,
          keywords,
          location_id,
          location,
          creator,
          change_by,
          number,
          minimum_number,
          deleted
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "change",
          entry.stock_id,
          stockEntry[0].name,
          stockEntry[0].category,
          stockEntry[0].keywords,
          storagePlace[0].storage_location_id,
          storageLocation[0].fullpath,
          stockEntry[0].creator,
          username,
          newAmount,
          stockEntry[0].minimum_number,
          0,
        ]
      );
      await connection.query(
        `INSERT INTO task_log
         (
          task_id,
          stock_id,
          name,
          storage_location,
          storage_place,
          amount_pre,
          amount_post,
          status
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskID,
          entry.stock_id,
          stockEntry[0].name,
          storageLocation[0].fullpath,
          storagePlace[0].place,
          stockEntry[0].number,
          newAmount,
          entry.status,
        ]
      );
      await connection.query(
        `UPDATE task
         SET status = 1
         WHERE id = ?`,
        [taskID]
      );
    }
  } catch (error) {
    // if anything goes wrong abort the transaction and rethrow the error for the caller to handle
    connection.rollback();
    connection.release();
    throw error;
  }
  connection.commit();
  connection.release();
  return "Finished successfully";
}

async function getStockIDByArticlenumber(articlenumber) {
  const [rows, fields] = await connPool.query(
    `SELECT id FROM stock WHERE articlenumber = ?`,
    [articlenumber]
  );
  return rows;
}

async function updateTaskEntryAmount(taskID, stockID, amountReal) {
  const result = {};
  const connection = await connPool.getConnection();

  await connection.beginTransaction();
  try {
    const [oldData] = await connection.query(
      `SELECT id, amount, amount_real
       FROM task_entries
       WHERE task_id = ? AND stock_id = ?
       FOR UPDATE`,
      [taskID, stockID]
    );
    result.taskEntryID = oldData[0].id;
    result.oldAmount = oldData[0].amount_real;
    result.newStatus = 1;
    if (oldData[0].amount !== amountReal) {
      result.newStatus = 2;
    }
    const [rows, fields] = await connection.query(
      `UPDATE task_entries
       SET amount_real = ?, status = ?
       WHERE id = ?`,
      [amountReal, result.newStatus, oldData[0].id]
    );
  } catch (error) {
    await connection.rollback();
    await connection.release();
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
}

async function updateTaskStatus(taskID, newStatus) {
  const [rows, fields] = await connPool.query(
    `UPDATE task SET status = ? WHERE id = ?`,
    [newStatus, taskID]
  );
  return rows;
}

module.exports = {
  deleteTask,
  finishTask,
  getStockIDByArticlenumber,
  updateTaskEntryAmount,
  updateTaskStatus,
};
