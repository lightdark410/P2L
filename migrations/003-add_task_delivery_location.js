const mysql = require("mysql2/promise");
const config = require("config");

const doMigration = async function () {
  const connection = await mysql.createConnection(config.get("dbConfig"));
  await connection.beginTransaction();
  try {
    await connection.query(
      "ALTER TABLE `inventur`.`task` ADD COLUMN `delivery_location` VARCHAR(255) NULL AFTER `order_number`;"
    );
  } catch (error) {
    console.error(error);
    await connection.rollback();
    await connection.end();
    return;
  }
  await connection.commit();
  await connection.end();
};

doMigration();
