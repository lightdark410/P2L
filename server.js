const config = require("config");
const express = require("express");
const PORT = process.env.PORT || 8090;
const app = express();
const session = require("express-session");
const mysql = require("mysql2/promise");
const MySQLStore = require("express-mysql-session")(session);

const mainController = require("./controllers/mainController");
const apiController = require("./controllers/apiController");

app.set("view engine", "ejs");

app.use("/assets", express.static("assets"));

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
  server.close(() => {
    console.log("HTTP server closed");
  });
});
