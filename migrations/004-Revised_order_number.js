const mysql = require("mysql2/promise");
const config = require("config");

const doMigration = async function () {
  const connection = await mysql.createConnection(config.get("dbConfig"));
  await connection.beginTransaction();
  try {
    await connection.query(
        'ALTER TABLE `inventur`.`task`    CHANGE COLUMN `order_number` `order_number` VARCHAR(255) NULL DEFAULT NULL ;'
        
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
