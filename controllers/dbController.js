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

const createTask = async function (
  username,
  taskEntryInfo,
  orderer,
  order_number,
  delivery_location
) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = { taskID: undefined, stockIDs: [] };

  try {
    const [rows] = await connection.query(
      `INSERT INTO task
       (creator, status, orderer, order_number, delivery_location)
       VALUES (?, ?, ?, ?, ?)`,
      [username, -1, orderer, order_number, delivery_location]
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

const deleteTask = async function (taskID) {
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
};

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

const finishTask = async function (taskID, username) {
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

    await connection.query(
      `UPDATE task
         SET status = 1
         WHERE id = ?`,
      [taskID]
    );
  } catch (error) {
    // if anything goes wrong abort the transaction and rethrow the error for the caller to handle
    cleanUpConnection(connection);
    throw error;
  }
  connection.commit();
  connection.release();
  return "Finished successfully";
};

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

const getAllStorageLocations = async function () {
  const [rows] = await connPool.query(
    `WITH RECURSIVE cte as (
			 SELECT
         parentTable.id,
         parentTable.name,
         parentTable.parent,
         parentTable.name AS fullpath
		   FROM inventur.storage_location AS parentTable
		   WHERE parentTable.parent = 0
		   UNION ALL
		   SELECT
         childTable.id,
         childTable.name,
         childTable.parent,
         CONCAT(parentTable.fullpath, '-', childTable.name) AS fullpath
		   FROM
         inventur.storage_location AS childTable
		       INNER JOIN
         cte as parentTable ON parentTable.id = childTable.parent
		  )
		SELECT
		  storage_location.id,
		  storage_location.name,
		  storage_location.parent,
		  (COUNT(storage_place.id) - COUNT(storage_place.stock_id)) AS empty_places,
		  storage_location.places,
		  cte.fullpath
		FROM
		  inventur.storage_location
		    LEFT JOIN
		  storage_place ON storage_location.id = storage_place.storage_location_id
				INNER JOIN
		  cte ON storage_location.id = cte.id
		GROUP BY storage_location.id;`
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

const getStockIDByArticlename = async function (name) {
  const [rows, fields] = await connPool.query(
    `SELECT stock.id
     FROM stock
      INNER JOIN article
        ON stock.article_id = article.id
     WHERE article.name = ?`,
    [name]
  );
  return rows;
};

const getStockIDByArticlenumber = async function (articlenumber) {
  const [rows, fields] = await connPool.query(
    `SELECT id FROM stock WHERE articlenumber = ?`,
    [articlenumber]
  );
  return rows;
};

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

const getTaskInfo = async function (taskID, username) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};

  try {
    const [task] = await connection.query(
      `SELECT id, status, processor
       FROM task
       WHERE id = ?
       FOR UPDATE`,
      [taskID]
    );
    if (task.length === 0) {
      result.error = "ERR_TASK_NOT_FOUND";
      await cleanUpConnection(connection);
      return result;
    }
    if (task[0].processor !== null && task[0].processor !== username) {
      result.error = "ERR_IN_PROGRESS_BY_OTHER_USER";
      await cleanUpConnection(connection);
      return result;
    }
    if (task[0].status === 1) {
      result.error = "ERR_ALREADY_FINISHED";
      await cleanUpConnection(connection);
      return result;
    }
    result.status = task[0].status;
    result.id = task[0].id;
    const [taskEntries] = await connection.query(
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
         task_entries.task_id,
         task_entries.stock_id,
           task_entries.lay_in,
           task_entries.amount,
           task_entries.amount_real,
           article.name AS articleName,
           stock.articlenumber AS articleNumber,
           stock.id AS stock_id,
           storage_place.place AS storage_place,
           cte.fullpath AS storage
       FROM
         task_entries
           INNER JOIN
         stock ON task_entries.stock_id = stock.id
           INNER JOIN
         article ON stock.article_id = article.id
           INNER JOIN
         storage_place ON task_entries.stock_id = storage_place.stock_id
           INNER JOIN
         cte ON storage_place.storage_location_id = cte.id
       WHERE task_entries.task_id = ?`,
      [taskID]
    );
    result.data = taskEntries;
  } catch (error) {
    await cleanUpConnection(error);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
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

const resetTaskInfo = async function (taskID, resetProcessor, resetStatus) {
  const connection = await connPool.getConnection();
  await connection.beginTransaction();
  const result = {};
  try {
    const [oldData] = await connection.query(
      `SELECT id, processor, status
       FROM task
       WHERE id = ?`,
      [taskID]
    );
    if (oldData[0].status === 1) {
      result.error = "ERR_ALREADY_FINISHED";
      cleanUpConnection(connection);
      return result;
    }
    if (resetProcessor && resetStatus) {
      await connection.query(
        `UPDATE task
         SET processor = NULL, status = -1
         WHERE id = ?`,
        [taskID]
      );
    } else {
      await connection.query(
        `UPDATE task
         SET ${resetProcessor ? "processor = NULL" : "status = -1"}
         WHERE id = ?`,
        [taskID]
      );
    }
  } catch (error) {
    await cleanUpConnection(error);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const resizeAndRenameStorageLocation = async function (
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
};

const updateTaskConfirmedAmounts = async function (
  taskID,
  entryList,
  username
) {
  const result = { skipped: [], succeeded: [] };
  const connection = await connPool.getConnection();

  await connection.beginTransaction();
  try {
    const [taskData] = await connection.query(
      `SELECT id, status
       FROM task
       WHERE id = ?`,
      [taskID]
    );
    if (taskData[0].status !== 1) {
      result.error = "ERR_NOT_FINISHED_YET";
      cleanUpConnection(connection);
      return result;
    }
    const [oldEntryData] = await connection.query(
      `WITH RECURSIVE cte AS (
         SELECT
            parentTable.id,
            parentTable.name,
            parentTable.parent,
            parentTable.name AS fullpath
         FROM
           inventur.storage_location AS parentTable
         WHERE parentTable.parent = 0
         UNION ALL
         SELECT
           childTable.id,
           childTable.name,
           childTable.parent,
           CONCAT(parentTable.fullpath, '-', childTable.name) AS fullpath
         FROM
           inventur.storage_location AS childTable
            INNER JOIN
         cte AS parentTable ON parentTable.id = childTable.parent
         )
       SELECT
         task_entries.id AS taskEntryID,
         task_entries.lay_in,
         task_entries.amount_real AS oldAmount,
         task_entries.amount AS taskEntryTargetAmount,
         task_log.id AS taskLogID,
         article.name AS articleName,
         stock.id AS stockID,
         stock.number AS currentAmount,
         stock.minimum_number AS minimumAmount,
         stock.creator,
         category.category,
         IFNULL(GROUP_CONCAT(keyword.keyword SEPARATOR ", "), "") AS keywords,
         storage_place.place,
         storage_place.storage_location_id,
         cte.fullpath
       FROM
        task_entries
          INNER JOIN
        stock ON task_entries.stock_id = stock.id
          INNER JOIN
        article ON stock.article_id = article.id
          INNER JOIN
        category ON article.category_id = category.id
          INNER JOIN
        storage_place ON task_entries.stock_id = storage_place.stock_id
					INNER JOIN
				cte ON storage_place.storage_location_id = cte.id
          LEFT JOIN
        (
          keyword
            INNER JOIN
          keyword_list ON keyword.id = keyword_list.keyword_id
        ) ON stock.id = keyword_list.stock_id
          LEFT JOIN
        task_log ON task_entries.task_id = task_log.task_id
        WHERE task_entries.task_id = ?
        GROUP BY stock.id
				FOR UPDATE`,
      [taskID]
    );
    for (const entry of entryList) {
      if (isNaN(entry.stockID) || isNaN(entry.newAmount)) {
        // if an entry does not have both stockID and newAmount properties
        // add it to the "skipped" array to be returned for debugging purposes
        // and continue with the next entry
        result.skipped.push(entry);
        continue;
      }
      const oldData = oldEntryData.filter(
        (elem) => elem.stockID === entry.stockID
      );
      const entryResult = {};
      entryResult.taskEntryID = oldData[0].taskEntryID;
      entryResult.oldAmount = oldData[0].oldAmount;
      entryResult.newStatus = 1;
      if (oldData[0].taskEntryTargetAmount !== entry.newAmount) {
        entryResult.newStatus = 2;
      }
      const [rows, fields] = await connection.query(
        `UPDATE task_entries
         SET amount_real = ?, status = ?
         WHERE id = ?`,
        [entry.newAmount, entryResult.newStatus, oldData[0].taskEntryID]
      );
      // calculate new amount
      const changeDelta = entry.newAmount - oldData[0].oldAmount ?? 0;
      const newAmount =
        oldData[0].lay_in === 1
          ? oldData[0].currentAmount + changeDelta
          : oldData[0].currentAmount - changeDelta;
      entryResult.newAmount = newAmount;
      await connection.query(
        `UPDATE stock
         SET number = ?
         WHERE id = ?`,
        [newAmount, oldData[0].stockID]
      );
      if (changeDelta !== 0) {
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
            oldData[0].stockID,
            oldData[0].articleName,
            oldData[0].category,
            oldData[0].keywords,
            oldData[0].storage_location_id,
            oldData[0].fullpath,
            oldData[0].creator,
            username,
            newAmount,
            oldData[0].minimumAmount,
            0,
          ]
        );
      }
      if (oldData[0].taskLogID === null) {
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
            oldData[0].stockID,
            oldData[0].articleName,
            oldData[0].fullpath,
            oldData[0].place,
            oldData[0].currentAmount,
            newAmount,
            result.newStatus,
          ]
        );
      } else {
        await connection.query(
          `UPDATE task_log
           SET amount_post = ?, status = ?
           WHERE id = ?`,
          [newAmount, entryResult.newStatus, oldData[0].taskLogID]
        );
      }
      result.succeeded.push(entryResult);
    }
  } catch (error) {
    await cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const updateTaskEntryAmount = async function (
  taskID,
  stockID,
  amountReal,
  username
) {
  const result = {};
  const connection = await connPool.getConnection();

  await connection.beginTransaction();
  try {
    const [taskData] = await connection.query(
      `SELECT id, status, processor
       FROM task
       WHERE id = ?
       FOR UPDATE`,
      [taskID]
    );
    if (taskData[0].status === 1) {
      result.error = "ERR_ALREADY_FINISHED";
      cleanUpConnection(connection);
      return result;
    }
    if (taskData[0].processor === null) {
      await connection.query(
        `UPDATE task
         SET processor = ?
         WHERE id = ?`,
        [username, taskID]
      );
    } else if (taskData[0].processor !== username) {
      result.error = "ERR_IN_PROGRESS_BY_OTHER_USER";
      cleanUpConnection(connection);
      return result;
    }
    const [oldData] = await connection.query(
      `SELECT *
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
      [oldData[0].stock_id]
    );
    const [keywords] = await connection.query(
      `SELECT keyword.keyword
       FROM keyword_list, keyword
       WHERE keyword_list.keyword_id = keyword.id
         AND keyword_list.stock_id = ?`,
      [oldData[0].stock_id]
    );
    const keywordArr = keywords.map((e) => e.keyword);
    stockEntry[0].keywords = keywordArr.join(", ");
    // calculate new amount
    const changeDelta = amountReal - oldData[0].amount_real ?? 0;
    const newAmount =
      oldData[0].lay_in === 1
        ? stockEntry[0].number + changeDelta
        : stockEntry[0].number - changeDelta;

    const [storagePlace] = await connection.query(
      `SELECT place, storage_location_id
         FROM storage_place
         WHERE stock_id = ?`,
      [oldData[0].stock_id]
    );
    const [storageLocation] = await connection.query(
      CTE_getFullLocationPathFromLeaf_single(),
      [storagePlace[0].storage_location_id]
    );
    await connection.query(
      `UPDATE stock
         SET number = ?
         WHERE id = ?`,
      [newAmount, oldData[0].stock_id]
    );
    if (changeDelta !== 0) {
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
          oldData[0].stock_id,
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
    }
    const [oldTaskLog] = await connection.query(
      `SELECT id
       FROM task_log
       WHERE stock_id = ? AND task_id = ?
       FOR UPDATE`,
      [stockID, taskID]
    );
    if (oldTaskLog.length === 0) {
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
          oldData[0].stock_id,
          stockEntry[0].name,
          storageLocation[0].fullpath,
          storagePlace[0].place,
          stockEntry[0].number,
          newAmount,
          result.newStatus,
        ]
      );
    } else {
      await connection.query(
        `UPDATE task_log
         SET amount_post = ?, status = ?
         WHERE id = ?`,
        [newAmount, result.newStatus, oldTaskLog[0].id]
      );
    }
  } catch (error) {
    cleanUpConnection(connection);
    throw error;
  }
  await connection.commit();
  await connection.release();
  return result;
};

const updateTaskStatus = async function (taskID, newStatus, username) {
  const [rows, fields] = await connPool.query(
    `UPDATE task
     SET status = ?, processor = ?
     WHERE id = ?`,
    [newStatus, username, taskID]
  );
  return rows;
};

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
  getAllStorageLocations,
  getCategoryById,
  getKeywordById,
  getStockIDByArticlename,
  getStockIDByArticlenumber,
  getTaskEntriesById,
  getTaskInfo,
  getUnitById,
  resetTaskInfo,
  resizeAndRenameStorageLocation,
  updateTaskConfirmedAmounts,
  updateTaskEntryAmount,
  updateTaskStatus,
};
