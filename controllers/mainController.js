const mysql = require("mysql2");
const config = require('config'); 
const ldap = require("ldapjs");
const functions = require("./functions");
const masterdataDB = require("./masterdataDB"); //import sql functions for handling masterdata database changes
const listDB = require("./listDB");
const fs = require('fs');
const http = require('http');


//read config with fs to delete database in case it doesn´t exist yet 
let rawConfig = fs.readFileSync("./config/default.json");
let dbConfig = JSON.parse(rawConfig).dbConfig;
delete dbConfig["database"];
let con = mysql.createConnection(dbConfig);

//checks if required Database exists and if not creates it
fs.readFile('./config/schema.sql', 'utf8', function (err, data) {
  // data = data.replace(/\r|\n/g, ' ');
  con.query(data, function (err, result) {
    con = mysql.createConnection(config.get('dbConfig'));
  }
  );
});

module.exports = function (app) {

  //ldap authentication
    app.post("/auth", async (req, res) => {

      var client = ldap.createClient({ url: config.get('ldap.url') });

      client.on("error", function (err) {
        console.warn(
          "LDAP connection failed, but fear not, it will reconnect OK",
          err,
        );
      });

      var username = req.body.username; //get params
      var password = req.body.password;

      var name = "ABBW" + "\\" + username;

      if (username && password) {
        client.bind(name, password, async (err) => {
          if (err == null) {
            //if no error occurs

            var base = config.get('ldap.domain');
            var search_options = {
              scope: 'sub',
              filter: '(&(objectClass=user)(sAMAccountName=' + username + '))',
              attrs: 'memberOf'
            };

            var searchRes = await functions.UserSearch(client, base, search_options);

            req.session.loggedin = true; //set session
            req.session.title = searchRes.title;
            req.session.username = searchRes.sAMAccountName;

            var redirectTo = req.session.redirectTo || '/';
            res.redirect(redirectTo); //redirect to home

          } else {
            res.redirect("/?err=FalseCred"); //Error message if username or password is incorrect
          }
          res.end();
        });
      } else {
        //if no username/passwort exists
        res.end();
      }
    })
  
  //Page Routing
    app.get("/", async (req, res) => {
      if (req.session.loggedin) {
        res.render("index", { session: req.session }); //load index
      } else {
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.get("/stammdaten", async (req, res) => {
      if (req.session.loggedin) {
          res.render("stammdaten", { session: req.session });
      } else {
        req.session.redirectTo = `/stammdaten`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.get("/logout", function (req, res) {
      //destroy current session
      req.session.destroy();
      res.send("Logged Out");
    })

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
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })
    
    app.get("/logs/:stockId", async (req, res) => {
      if(req.session.loggedin){
        try {
          res.render("logs", { session: req.session });
        } catch (error) {
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
      }else{
        req.session.redirectTo = `/logs/${req.params.stockId}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.get("/qr", async (req, res) => {
      if (req.session.loggedin) {
        res.render("qr", { session: req.session })
      } else {
       req.session.redirectTo = `/qr`;
       res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    //Mobile Seite zum Ein-/Auslagern vor Ort
    app.get("/storagePlace/:id", async (req, res) => {
      if (req.session.loggedin) {
        var id = req.params.id;
        var num = /\d/.test(id);
        if(num){
          const result = await functions.getStockByStoragePlaceId(id);
          if(typeof result === 'undefined'){
            res.status("404").send("Item Not Found");
            return;
          }
          //add storage place
          let storage_place = await masterdataDB.getStorageByStockId(result.id);
          result.storage_location = storage_place.name;
          result.storage_place = storage_place.place;
    
          res.render("item", { session: req.session, item: result});
        }else{
          res.status("404").send("404 Not Found");
        }
      }else{
        req.session.redirectTo = `/storagePlace/${req.params.id}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    //mobile list view
    app.get("/mobileList/:id", async (req, res) => {
      if (req.session.loggedin) {
        let data = await listDB.get_mobile_list(req.params.id);
        for(let i = 0; i < data.length; i++){
          let stock_data = await functions.getStockById(data[i].stock_id);
          data[i].articleName = stock_data.name;
          data[i].number = stock_data.number;
          let storage_data = await masterdataDB.getStorageByStockId(data[i].stock_id);
          data[i].storage = storage_data.name;
          data[i].storage_place = storage_data.place;
        }
 
        let color = await getledColor(req.params.id);
        console.log(color);
        res.render("mobileList", { session: req.session, data: JSON.stringify(data) });

      } else {
       req.session.redirectTo = `/mobileList/${req.params.id}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })
  // 

    //sends get request to the color api
    function getledColor(auftragsId){
      const options = {
        hostname: config.get("led.hostname"),
        port: config.get("led.port"),
        path: `/color/api/v1?id=${auftragsId}`,
        method: 'GET',
        timeout: 500,
      }
      
      return new Promise((resolve, reject) => {
        const req = http.request(options, res => {
        
          let result = '';
          res.on('data', (d) => {
            result += d;
          })
    
          res.on('end', () => {
            resolve(result);
          })
        })
        
        req.on('timeout', () => {
          req.destroy();
        });
  
        req.on('error', error => {
          resolve(error);
        })
        
        req.end()
      })
  
    }
  
}
