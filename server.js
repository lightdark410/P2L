const config = require("config");
const express = require("express");
const PORT = process.env.PORT || 8090;
const app = express();
const session = require("express-session");
const mysql = require("mysql2/promise");
const MySQLStore = require("express-mysql-session")(session);
const fs = require("node:fs/promises");

const mainController = require("./controllers/mainController");
const apiController = require("./controllers/apiController");

app.set("view engine", "ejs");

app.use("/assets", express.static("assets"));

let dbConfig = config.get("dbConfig");
let con = mysql.createPool(dbConfig);

//checks if required Database exists and if not creates it
con
  .getConnection()
  .then((connection) => {
    connection.release();
  })
  .catch((error) => {
    if (error.code === "ER_BAD_DB_ERROR") {
      console.log("Couldn't find DB. Creating new one.");
      let databaseConfig = config.util.cloneDeep(dbConfig);
      delete databaseConfig["database"];
      mysql.createConnection(databaseConfig).then((connection) => {
        fs.readFile("./config/schema.sql", { encoding: "utf8" }).then(
          (data) => {
            connection
              .query(data)
              .then(() => connection.end())
              .catch((error) => console.error(JSON.stringify(error, null, 2)));
          }
        );
      });
    } else {
      console.error(JSON.stringify(error, null, 2));
    }
  });

const connectionPool = mysql.createPool(config.get("dbConfig"));
const sessionStore = new MySQLStore(
  {
    expiration: 43200000, // expire sessions after 12 hours
  },
  connectionPool
);
app.use(
  session({
    store: sessionStore,
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());

mainController(app);
apiController(app);

server = app.listen(PORT, () => {
  console.log("Server is listening on port %d", PORT);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM: closing HTTP server.");
  // TODO: close DB connection pool
  sessionStore.close();
  con.end();
  server.close(() => {
    console.log("HTTP server closed");
  });
});
