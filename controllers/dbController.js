const mysql = require("mysql2/promise");
const config = require("config");

const connPool = mysql.createPool(config.get("dbConfig"));

/*********************************************************************
 *                      HELPERFUNCTIONS                              *
 *********************************************************************/
const CTE_getFullLocationPathFromLeaf = function () {
  return `
	  WITH RECURSIVE cte AS (
      SELECT childTable.id, childTable.name, childTable.parent, childTable.name AS fullpath, childTable.id AS src_id
      FROM inventur.storage_location AS childTable
      WHERE childTable.id IN ?
      UNION ALL
      SELECT parentTable.id, parentTable.name, parentTable.parent, CONCAT(parentTable.name, '-', childTable.fullpath) AS fullpath, childTable.src_id
      FROM inventur.storage_location AS parentTable
      INNER JOIN cte AS childTable
      ON childTable.parent = parentTable.id
      )
	  SELECT src_id AS id, fullpath FROM cte WHERE parent = 0;`;
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

const cleanUpConnection = async function (connection) {
  await connection.rollback();
  await connection.release();
};

const reorderPlaces = async function (oldPlaces, connection) {
  let createdConnection = false;
  if (connection === undefined) {
    connection = connPool.getConnection();
    connection.beginTransaction();
    createdConnection = true;
  }
  const result = {};
  result.changed = 0;
  const emptyPlaces = [];
  const occupiedPlaces = [];
  for (const place of oldPlaces) {
    if (place.stock_id === null) {
      emptyPlaces.push(place);
    } else {
      occupiedPlaces.push(place);
    }
  }
  // we start the counter at zero since we increment at the start of each iteration
  let counter = 0;
  try {
    for (const place of occupiedPlaces) {
      counter++;
      if (place.place !== counter) {
        await connection.query(
          `UPDATE storage_place
           SET place = ?
           WHERE id = ?`,
          [counter, place.id]
        );
        result.changed++;
      }
    }
    result.occupied = counter;
    for (const place of emptyPlaces) {
      counter++;
      if (place.place !== counter) {
        await connection.query(
          `UPDATE storage_place
           SET place = ?
           WHERE id = ?`,
          [counter, place.id]
        );
        result.changed++;
      }
    }
    result.total = counter;
  } catch (error) {
    if (createdConnection) {
      cleanUpConnection(connection);
    }
    throw error;
  }
  if (createdConnection) {
    connection.commit();
    connection.release();
  }
  return result;
};

/*********************************************************************
 *                      EXPORTED FUNCTIONS                           *
 *********************************************************************/

const createCategory = async function (categoryName) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      `SELECT id, category
       FROM category
       WHERE category = ?
       FOR UPDATE`,
      [categoryName]
    );
    if (rows.length !== 0) {
      result.error = "ERR_DUPLICATE_NAME";
      cleanUpConnection(connection);
      return result;
    }
    const [insertResult] = await connection.query(
      `INSERT INTO category (category)
       VALUES (?)`,
      [categoryName]
    );
    result.insertID = insertResult.insertId;
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const createKeyword = async function (keywordName) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      `SELECT id, keyword
       FROM keyword
       WHERE keyword = ?
       FOR UPDATE`,
      [keywordName]
    );
    if (rows.length !== 0) {
      result.error = "ERR_DUPLICATE_NAME";
      cleanUpConnection(connection);
      return result;
    }
    const [insertResult] = await connection.query(
      `INSERT INTO keyword (keyword)
       VALUES (?)`,
      [keywordName]
    );
    result.insertID = insertResult.insertId;
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const createStorageLocation = async function (locName, locParent, places) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      `SELECT id, name, parent
       FROM storage_location
       WHERE name = ? AND parent = ?
       FOR UPDATE`,
      [locName, locParent]
    );
    if (rows.length !== 0) {
      result.error = "ERR_DUPLICATE_NAME";
      cleanUpConnection(connection);
      return result;
    }
    const [insertResult] = await connection.query(
      `INSERT INTO storage_location (name, parent, places)
       VALUES (?, ?, ?)`,
      [locName, locParent, places]
    );
    result.insertID = insertResult.insertId;
    if (places !== 0) {
      const newPlacesArr = [];
      for (let i = 1; i <= places; i++) {
        newPlacesArr.push([result.insertID, i]);
      }
      await connection.query(
        `INSERT
         INTO storage_place (storage_location_id, place)
         VALUES ?`,
        [newPlacesArr]
      );
    }
    [[{ fullpath: result.fullPath }]] = await connection.query(
      CTE_getFullLocationPathFromLeaf_single(),
      [result.insertID]
    );
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const createTask = async function (username, taskEntryInfo) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = { taskID: undefined, stockIDs: [] };
  try {
    const [rows] = await connection.query(
      `INSERT INTO task (creator, status) VALUES (?, ?)`,
      [username, -1]
    );
    result.taskID = rows.insertId;
    for (const taskEntry of taskEntryInfo) {
      await connection.query(
        `INSERT INTO task_entries (task_id, stock_id, lay_in, amount, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          result.taskID,
          taskEntry.stock_id,
          taskEntry.lay_in ? 1 : 0,
          taskEntry.amount,
          0,
        ]
      );
      result.stockIDs.push(taskEntry.stock_id);
    }
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const createUnit = async function (unitName) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      `SELECT id, unit
       FROM unit
       WHERE unit = ?
       FOR UPDATE`,
      [unitName]
    );
    if (rows.length !== 0) {
      result.error = "ERR_DUPLICATE_NAME";
      cleanUpConnection(connection);
      return result;
    }
    const [insertResult] = await connection.query(
      `INSERT INTO unit (unit)
       VALUES (?)`,
      [unitName]
    );
    result.insertID = insertResult.insertId;
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const deleteCategory = async function (categoryID) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      "SELECT * FROM category WHERE id = ? FOR UPDATE",
      [categoryID]
    );
    result.id = rows[0].id;
    result.name = rows[0].category;
    // we don't need to check here if any articles use the category,
    // since if they do, the delete will fail due to a foreign key restriction
    await connection.query("DELETE FROM category WHERE id = ?", [categoryID]);
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const deleteKeyword = async function (keywordID) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      "SELECT * FROM keyword WHERE id = ? FOR UPDATE",
      [keywordID]
    );
    result.id = rows[0].id;
    result.name = rows[0].keyword;
    // we don't need to check here if any articles use the keyword,
    // since if they do, the delete will fail due to a foreign key restriction
    await connection.query("DELETE FROM keyword_list WHERE keyword_id = ?", [
      keywordID,
    ]);
    await connection.query("DELETE FROM keyword WHERE id = ?", [keywordID]);
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const deleteStorageLocation = async function (locID) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      `SELECT *
       FROM storage_location
       WHERE id = ?
       FOR UPDATE`,
      [locID]
    );
    const [childLocations] = await connection.query(
      `SELECT *
       FROM storage_location
       WHERE parent = ?`,
      [locID]
    );
    if (childLocations.length !== 0) {
      result.error = "ERR_CHILDREN_EXIST";
      await cleanUpConnection(connection);
      return result;
    }
    result.id = rows[0].id;
    result.name = rows[0].name;
    const [oldPlaces] = await connection.query(
      `SELECT *
       FROM storage_place
       WHERE storage_location_id = ?
       FOR UPDATE`,
      [locID]
    );
    if (oldPlaces.some((elem) => elem.stock_id !== null)) {
      result.error = "ERR_OCCUPIED_PLACES_EXIST";
      await cleanUpConnection(connection);
      return result;
    }
    [[{ fullpath: result.fullPath }]] = await connection.query(
      CTE_getFullLocationPathFromLeaf_single(),
      [locID]
    );
    await connection.query(
      `DELETE
       FROM storage_place
       WHERE storage_location_id = ?`,
      [locID]
    );
    await connection.query(
      `DELETE
       FROM storage_location
       WHERE id = ?`,
      [locID]
    );
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

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
    cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
}

const deleteUnit = async function (unitID) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [rows] = await connection.query(
      "SELECT * FROM unit WHERE id = ? FOR UPDATE",
      [unitID]
    );
    result.id = rows[0].id;
    result.name = rows[0].unit;
    // we don't need to check here if any articles use the unit,
    // since if they do, the delete will fail due to a foreign key restriction
    await connection.query("DELETE FROM unit WHERE id = ?", [unitID]);
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

// FIXME: don't log a change if the actual change amount is 0
// TODO: move logging, tasklog and updating stock values to updateTaskEntryAmount()
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
      cleanUpConnection(connection);
      return "Already finished";
    }
    const [taskEntries] = await connection.query(
      `SELECT stock_id, amount, amount_real, status, lay_in
       FROM task_entries
       WHERE task_id = ?`,
      [taskID]
    );
    for (const entry of taskEntries) {
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
    cleanUpConnection(connection);
    throw error;
  }
  connection.commit();
  connection.release();
  return "Finished successfully";
}

const getAllStockInfo = async function () {
  const [rows] = await connPool.query(
    `WITH RECURSIVE cte as (
       SELECT parentTable.id, parentTable.name, parentTable.parent, parentTable.name AS fullpath
         FROM inventur.storage_location AS parentTable
         WHERE parentTable.parent = 0
         UNION ALL
         SELECT childTable.id, childTable.name, childTable.parent, CONCAT(parentTable.fullpath, '-', childTable.name) AS fullpath
         FROM inventur.storage_location AS childTable
         INNER JOIN cte as parentTable
         ON parentTable.id = childTable.parent
         )
     SELECT
       stock.id,
       stock.number,
         stock.minimum_number,
         stock.creator,
         stock.change_by,
         stock.date,
         stock.articlenumber,
         article.name,
         category.category,
         unit.unit,
         cte.fullpath AS storage_location,
         storage_place.place AS storage_place,
         IFNULL(GROUP_CONCAT(keyword.keyword SEPARATOR ", "), "") AS keyword
     FROM
         stock
             INNER JOIN
         article ON article.id = stock.article_id
             INNER JOIN
         category ON category.id = article.category_id
             INNER JOIN
         unit ON unit.id = article.unit_id
             INNER JOIN
         storage_place ON stock.id = storage_place.stock_id
             INNER JOIN
         cte ON storage_place.storage_location_id = cte.id
             LEFT JOIN
          (keyword_list INNER JOIN keyword
             ON keyword_list.keyword_id = keyword.id)
             ON stock.id = keyword_list.stock_id
     GROUP BY stock.id;`
  );
  return rows;
};

const getCategoryById = async function (categoryID) {
  const [rows] = await connPool.query(
    `SELECT category.id, category.category AS name, IFNULL(counter.article_count, 0) AS article_count
     FROM category
     LEFT JOIN
       (SELECT COUNT(*) AS article_count, category_id
          FROM article
          GROUP BY category_id) AS counter
       ON category.id = counter.category_id
     WHERE category.id = ?`,
    [categoryID]
  );
  return rows;
};

const getKeywordById = async function (keywordID) {
  const [rows] = await connPool.query(
    `SELECT keyword.id, keyword.keyword AS name, IFNULL(counter.article_count, 0) AS article_count
     FROM keyword
     LEFT JOIN
       (SELECT COUNT(*) AS article_count, keyword_id
          FROM keyword_list
          GROUP BY keyword_id) AS counter
       ON keyword.id = counter.keyword_id
     WHERE keyword.id = ?`,
    [keywordID]
  );
  return rows;
};

async function getStockIDByArticlenumber(articlenumber) {
  const [rows, fields] = await connPool.query(
    `SELECT id FROM stock WHERE articlenumber = ?`,
    [articlenumber]
  );
  return rows;
}

const getTaskEntriesById = async function (taskID) {
  const result = [];
  const incompleteEntries = [];
  const [rows, fields] = await connPool.query(
    `SELECT
       task_entries.lay_in,
       task_entries.amount,
       task_entries.amount_real,
       task_entries.status,
       task_entries.stock_id,
       task_log.name,
       task_log.storage_location,
       task_log.storage_place,
       task_log.amount_post,
       task_log.amount_pre
     FROM task_entries
     LEFT JOIN task_log
       ON task_entries.task_id = task_log.task_id
         AND task_entries.stock_id = task_log.stock_id
     WHERE task_entries.task_id = ?`,
    [taskID]
  );
  for (const row of rows) {
    if (
      row.name === null ||
      row.storage_place === null ||
      row.storage_location === null
    ) {
      incompleteEntries.push(row);
    } else {
      result.push(row);
    }
  }
  if (incompleteEntries.length > 0) {
    const stockIDs = incompleteEntries.map((elem) => elem.stock_id);
    const [stockInfo] = await connPool.query(
      `SELECT
         stock.id,
         article.name,
         storage_place.place,
         storage_place.storage_location_id
       FROM stock
       LEFT JOIN article
         ON stock.article_id = article.id
       LEFT JOIN storage_place
         ON stock.id = storage_place.stock_id
       WHERE stock.id IN (?)`,
      [stockIDs]
    );
    const locationIDs = new Set();
    const stockMap = {};
    for (const stock of stockInfo) {
      stockMap[stock.id] = stock;
      locationIDs.add(stock.storage_location_id);
    }
    const [locationPaths] = await connPool.query(
      CTE_getFullLocationPathFromLeaf(),
      [[Array.from(locationIDs)]]
    );
    const locationMap = locationPaths.reduce((map, loc) => {
      map[loc.id] = loc.fullpath;
      return map;
    }, {});
    for (let entry of incompleteEntries) {
      entry.name = stockMap[entry.stock_id].name;
      entry.storage_place = stockMap[entry.stock_id].place;
      entry.storage_location =
        locationMap[stockMap[entry.stock_id].storage_location_id] ?? "n/a";
      result.push(entry);
    }
  }
  return result.map((elem) => {
    elem.amount_real = elem.amount_real ?? "-";
    elem.amount_pre = elem.amount_pre ?? "-";
    elem.amount_post = elem.amount_post ?? "-";
    return elem;
  });
};

const getUnitById = async function (unitID) {
  const [rows] = await connPool.query(
    `SELECT unit.id, unit.unit AS name, IFNULL(counter.article_count, 0) AS article_count
     FROM unit
     LEFT JOIN
       (SELECT COUNT(*) AS article_count, unit_id
          FROM article
          GROUP BY unit_id) AS counter
       ON unit.id = counter.unit_id
     WHERE unit.id = ?`,
    [unitID]
  );
  return rows;
};

async function resizeAndRenameStorageLocation(
  storageLocationID,
  newSize,
  newName
) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [oldData] = await connection.query(
      `SELECT id, name, places
       FROM storage_location
       WHERE id = ?
       FOR UPDATE`,
      [storageLocationID]
    );
    if (oldData.length === 0) {
      await cleanUpConnection(connection);
      return { error: "ERR_LOC_NOT_FOUND" };
    }
    result.oldSize = oldData[0].places;
    result.newSize = newSize;
    const [locationName] = await connection.query(
      CTE_getFullLocationPathFromLeaf_single(),
      [storageLocationID]
    );
    result.oldLocationName = locationName[0].fullpath;
    const [oldPlaces] = await connection.query(
      `SELECT *
       FROM storage_place
       WHERE storage_location_id = ?
       ORDER BY place ASC
       FOR UPDATE`,
      [storageLocationID]
    );
    const reorderedPlacesCount = await reorderPlaces(oldPlaces, connection);
    result.occupied = reorderedPlacesCount.occupied;
    result.reordered = reorderedPlacesCount.changed;
    if (reorderedPlacesCount.occupied > newSize) {
      await cleanUpConnection(connection);
      return { error: "ERR_NOT_ENOUGH_EMPTY_PLACES" };
    }
    if (
      reorderedPlacesCount.total === newSize &&
      newSize === oldData[0].places &&
      reorderedPlacesCount.changed === 0 &&
      newName === oldData[0].name
    ) {
      await cleanUpConnection(connection);
      return { error: "ERR_NOTHING_TO_DO" };
    }
    if (reorderedPlacesCount.total > newSize) {
      await connection.query(
        `DELETE
         FROM storage_place
         WHERE storage_location_id = ?
           AND place > ?`,
        [storageLocationID, newSize]
      );
    } else if (reorderedPlacesCount.total < newSize) {
      const newPlacesArr = [];
      for (let i = reorderedPlacesCount.total + 1; i <= newSize; i++) {
        newPlacesArr.push([storageLocationID, i]);
      }
      await connection.query(
        `INSERT
         INTO storage_place (storage_location_id, place)
         VALUES ?`,
        [newPlacesArr]
      );
    }
    await connection.query(
      `UPDATE storage_location
       SET places = ?, name = ?
       WHERE id = ?`,
      [newSize, newName, storageLocationID]
    );
    const [newLocationName] = await connection.query(
      CTE_getFullLocationPathFromLeaf_single(),
      [storageLocationID]
    );
    result.newLocationName = newLocationName[0].fullpath;
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
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
    cleanUpConnection(connection);
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
  createCategory,
  createKeyword,
  createStorageLocation,
  createTask,
  createUnit,
  deleteCategory,
  deleteKeyword,
  deleteStorageLocation,
  deleteTask,
  deleteUnit,
  finishTask,
  getAllStockInfo,
  getCategoryById,
  getKeywordById,
  getStockIDByArticlenumber,
  getTaskEntriesById,
  getUnitById,
  resizeAndRenameStorageLocation,
  updateTaskEntryAmount,
  updateTaskStatus,
};
