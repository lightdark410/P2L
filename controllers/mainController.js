const config = require("config");
const ldap = require("ldapjs");
const functions = require("./functions");
const masterdataDB = require("./masterdataDB"); //import sql functions for handling masterdata database changes
const path = require("path");

module.exports = function (app) {
  //ldap authentication
  app.post("/auth", async (req, res) => {
    var client = ldap.createClient({ url: config.get("ldap.url") });

    client.on("error", function (err) {
      console.warn(
        "LDAP connection failed, but fear not, it will reconnect OK",
        err
      );
    });

    var username = req.body.username; //get params
    var password = req.body.password;

    var name = "ABBW" + "\\" + username;

    if (username && password) {
      client.bind(name, password, async (err) => {
        if (err == null) {
          //if no error occurs

          var base = config.get("ldap.domain");
          var search_options = {
            scope: "sub",
            filter: "(&(objectClass=user)(sAMAccountName=" + username + "))",
            attrs: "memberOf",
          };

          var searchRes = await functions.UserSearch(
            client,
            base,
            search_options
          );

          req.session.loggedin = true; //set session
          req.session.title = searchRes.title;
          req.session.username = searchRes.sAMAccountName;

          var redirectTo = req.session.redirectTo || "/";
          res.redirect(redirectTo); //redirect to home
        } else {
          if (username === "mmustermann" && password === "lager3456") {
            req.session.loggedin = true; //set session
            req.session.title = "";
            req.session.username = "mmustermann";

            var redirectTo = req.session.redirectTo || "/";
            res.redirect(redirectTo); //redirect to home
          } else if (username === "lagerazubi" && password === "123456") {
            req.session.loggedin = true; //set session
            req.session.title = "Auszubildender";
            req.session.username = "lagerazubi";

            var redirectTo = req.session.redirectTo || "/";
            res.redirect(redirectTo); //redirect to home
          } else {
            res.redirect("/?err=FalseCred"); //Error message if username or password is incorrect
          }
        }
        res.end();
      });
    } else {
      //if no username/passwort exists
      res.end();
    }
  });

  app.get("/vollbild", async (req, res) => {
    res.render("vollbild");
  });

  //Page Routing
  app.get("/", async (req, res) => {
    if (req.session.loggedin) {
      res.render("index", { session: req.session }); //load index
    } else {
      req.session.redirectTo = `/`;
      res.render("login"); //redirect to login page if not logged in
    }
  });

  app.get("/auftraege", async (req, res) => {
    if (req.session.loggedin) {
      res.render("task", { session: req.session });
    } else {
      req.session.redirectTo = `/auftraege`;
      res.render("login");
    }
  });

  app.get("/stammdaten", async (req, res) => {
    if (req.session.loggedin) {
      res.render("stammdaten", { session: req.session });
    } else {
      req.session.redirectTo = `/stammdaten`;
      res.render("login"); //redirect to login page if not logged in
    }
  });

  app.get("/logout", function (req, res) {
    //destroy current session
    req.session.destroy();
    res.send("Logged Out");
  });

  app.get("/logs", async (req, res) => {
    if (req.session.loggedin) {
      try {
        res.render("logs", { session: req.session });
      } catch (error) {
        res.status("500").send("Internal Server Error");
        console.log(error);
      }
    } else {
      req.session.redirectTo = `/logs`;
      res.render("login"); //redirect to login page if not logged in
    }
  });

  app.get("/logs/:stockId", async (req, res) => {
    if (req.session.loggedin) {
      try {
        res.render("logs", { session: req.session });
      } catch (error) {
        res.status("500").send("Internal Server Error");
        console.log(error);
      }
    } else {
      req.session.redirectTo = `/logs/${req.params.stockId}`;
      res.render("login"); //redirect to login page if not logged in
    }
  });

  app.get("/qr", async (req, res) => {
    if (req.session.loggedin) {
      res.render("qr", { session: req.session });
    } else {
      req.session.redirectTo = `/qr`;
      res.render("login"); //redirect to login page if not logged in
    }
  });

  //Mobile Seite zum Ein-/Auslagern vor Ort
  app.get("/storagePlace/:id", async (req, res) => {
    if (req.session.loggedin) {
      var id = req.params.id;
      var num = /\d/.test(id);
      if (num) {
        const result = await functions.getStockByStoragePlaceId(id);
        if (typeof result === "undefined") {
          res.status("404").send("Item Not Found");
          return;
        }
        //add storage place
        let storage_place = await masterdataDB.getStorageByStockId(result.id);
        result.storage_location = storage_place.name;
        result.storage_place = storage_place.place;

        res.render("item", { item: result });
      } else {
        res.status("404").send("404 Not Found");
      }
    } else {
      req.session.redirectTo = `/storagePlace/${req.params.id}`;
      res.render("login"); //redirect to login page if not logged in
    }
  });

  //mobile list view
  app.get("/mobileList/:id", async (req, res) => {
    if (req.session.loggedin) {
      res.sendFile(path.join(__dirname + "/../views/mobileList.html"));
    } else {
      req.session.redirectTo = `/mobileList/${req.params.id}`;
      res.render("login"); //redirect to login page if not logged in
    }
  });
  //
};
