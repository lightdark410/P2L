let mysql = require("mysql");
const config = require("config");

var con = mysql.createPool(config.get("dbConfig"));

function insert_task(username) {
  return new Promise((resolve, reject) => {
    con.query(
      "INSERT INTO task (creator, status) VALUES (?, 0);",
      [username],
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

function getUnfinishedTaskEntries(task_id) {
  return new Promise((resolve, reject) => {
    con.query(
      "SELECT * FROM task_entries WHERE task_id = ? AND status = 0;",
      [task_id],
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

function get_task_entries_by_stock_id(stock_id) {
  return new Promise((resolve, reject) => {
    con.query(
      "SELECT * FROM task_entries WHERE stock_id = ?;",
      [stock_id],
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

function get_latest_task_id() {
  return new Promise((resolve, reject) => {
    con.query("SELECT LAST_INSERT_ID() as id;", function (err, result) {
      //send results
      if (err) {
        reject(err);
        console.log(err);
      }
      resolve(result[0]["id"]);
    });
  });
}

function insert_task_entry(task_id, stock_id, lay_in, amount, status) {
  return new Promise((resolve, reject) => {
    con.query(
      "INSERT INTO task_entries (task_id, stock_id, lay_in, amount, status) VALUES (?, ?, ?, ?, ?);",
      [task_id, stock_id, lay_in, amount, status],
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

function update_task_entry_status(task_id, stock_id, status) {
  return new Promise((resolve, reject) => {
    con.query(
      "UPDATE task_entries SET status = ? WHERE task_id = ? AND stock_id = ?",
      [status, task_id, stock_id],
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

function delete_task_entries_by_task_id(task_id) {
  return new Promise((resolve, reject) => {
    con.query(
      "DELETE FROM task_entries WHERE task_id = ?",
      [task_id],
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

function get_task() {
  return new Promise((resolve, reject) => {
    var res = { data: [] };

    con.query("SELECT * FROM task ORDER BY date DESC", function (err, result) {
      //send results
      if (err) {
        reject(err);
        console.log(err);
      }
      //correct timezone from date string
      if (typeof result !== "undefined") {
        for (let i = 0; i < result.length; i++) {
          result[i].date = result[i].date.toLocaleString();
        }
      }
      res.data = result;
      resolve(res);
    });
  });
}

function get_task_status(id) {
  return new Promise((resolve, reject) => {
    con.query(
      "SELECT status FROM task WHERE id = ? LIMIT 1;",
      [id],
      function (err, result) {
        //send results
        if (err) {
          reject(err);
          console.log(err);
        }
        resolve(result[0]);
      }
    );
  });
}

function get_task_by_id(id) {
  return new Promise((resolve, reject) => {
    con.query(
      "SELECT *, task.status as task_status FROM task INNER JOIN task_entries ON task_entries.task_id = task.id WHERE task.id = ?;",
      [id],
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

function get_tasklog(task_id) {
  return new Promise((resolve, reject) => {
    var res = { data: [] };
    con.query(
      "SELECT * FROM task_log WHERE task_id = ?;",
      [task_id],
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

function finish_task(id) {
  return new Promise((resolve, reject) => {
    con.query(
      "UPDATE task SET status = 1 WHERE id = ?;",
      [id],
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

function insert_tasklog(
  stock_id,
  task_id,
  name,
  storage_location,
  storage_place,
  amount_pre,
  amount_post,
  status
) {
  return new Promise((resolve, reject) => {
    con.query(
      "INSERT INTO task_log (stock_id, task_id, name, storage_location, storage_place, amount_pre, amount_post, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
      [
        stock_id,
        task_id,
        name,
        storage_location,
        storage_place,
        amount_pre,
        amount_post,
        status,
      ],
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

module.exports = {
  insert_task,
  get_latest_task_id,
  insert_task_entry,
  update_task_entry_status,
  get_task,
  get_task_by_id,
  getUnfinishedTaskEntries,
  finish_task,
  insert_tasklog,
  get_tasklog,
  delete_task_entries_by_task_id,
  get_task_entries_by_stock_id,
  get_task_status,
};
