var mysql = require("mysql2");
var functions = require("./functions.js");
var fs = require('fs');
var config = require('config');
const session = require("express-session");

var con = mysql.createConnection(config.get('dbConfig'));

// var mqtt = require('mqtt');

// var MQTT_TOPIC          = "esp-0001";
// var MQTT_ADDR           = "mqtt://192.168.138.136";


// /* This works... */
// var client  = mqtt.connect(MQTT_ADDR,{protocolId: 'MQIsdp', protocolVersion: 3});

// client.on('connect', function () {
//     client.subscribe(MQTT_TOPIC);
//     client.publish(MQTT_TOPIC, '0~40~0~0~0');
// });

// client.on('message', function (topic, message) {
//     // message is Buffer
//     console.log(message.toString());
//     client.end();
// });

// client.on('error', function(){
//     console.log("ERROR")
//     client.end()
// })

//checks if required Database exists and if not creates it
fs.readFile('./config/schema.sql', 'utf8', function (err, data) {
  // data = data.replace(/\r|\n/g, ' ');

  con.query(data, function (err, result) {
    if (err) {
      console.log(err.sqlMessage);
    }
    var con = mysql.createConnection(config.get('dbConfig'));
  }
  );
});

module.exports = function (app) {

  //ldap authentication
  app.post("/auth", async (req, res) => {
    var ldap = require("ldapjs");

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
  });
  
  //Page Routing
    app.get("/", async (req, res) => {
      if (req.session.loggedin) {
        res.render("index", { session: req.session }); //load index
      } else {
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.get("/stammdaten", async (req, res) => {
      if (req.session.loggedin) {
          res.render("stammdaten", { session: req.session });
      } else {
        req.session.redirectTo = `/stammdaten`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
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
          var logs = await functions.getLog();
          res.render("logs", { result: logs, session: req.session });
        } catch (error) {
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
  
      } else {
        req.session.redirectTo = `/logs`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
  
    });

    app.get("/logs/:stockId", async (req, res) => {
      if(req.session.loggedin){
        try {
          var logs = await functions.getLogByStockId(req.params.stockId);
          res.render("logs", { result: logs, session: req.session });
        } catch (error) {
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
      }else{
        req.session.redirectTo = `/logs/${req.params.stockId}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.get("/qr", async (req, res) => {
      if (req.session.loggedin) {
        res.render("qr", { session: req.session })
      } else {
       req.session.redirectTo = `/qr`;
       res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });
  // 

  //stock related data
    app.get("/data", async (req, res) => {
      if (req.session.loggedin) {
        var result = await functions.getAll(); // get db data
        for(var i = 0; i < result.data.length; i++){

          //add keywords
          var keywordlist = await functions.getKeywordlistByStockid(result.data[i].id);
          result.data[i].keyword = keywordlist[0].keyword;

          //add storage place
          var storage_place = await functions.getStorageByStockId(result.data[i].id);
          result.data[i].storage_location = storage_place[0].name;
          result.data[i].storage_place = storage_place[0].place;

        }

        res.send(result);
      } else {
        req.session.redirectTo = `/data`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.get("/data/:id", async (req, res) => {
      if(req.session.loggedin){
        var id = req.params.id;
        var num = /\d/.test(id);
    
        if(num){
          const result = await functions.getStockById(id);

          //add keywords
          var keywordlist = await functions.getKeywordlistByStockid(result.id);
          result.keyword = keywordlist[0].keyword;

          //add storage place
          var storage_place = await functions.getStorageByStockId(result.id);
          result.storage_location = storage_place[0].name;
          result.storage_place = storage_place[0].place;
          result.storage_location_id = storage_place[0].storage_location_id;
          result.storage_parent = storage_place[0].parent;

          res.send(result);
        }else{
          res.status("404").send("404 Not Found");
        }
      }else{
        req.session.redirectTo = `/entry/${req.params.id}`;
        res.render("login", { err: req.query.err }); //redirect to login page if not logged in

      }
        
    });

    app.post("/create", async (req, res) => {
      //create entry in db
      if(req.session.loggedin){
        var username = req.session.username;
        var fulldate = functions.getDate(); //get time/date
        var time = functions.getTime();
    
        try {

            let category = await functions.getMasterDataByName("category", req.body.category);
            await functions.insertArticle(req.body.name, 1, category[0].id);

            const item = await functions.getLatestArticle();
            await functions.insertStock(item.id, req.body.number, req.body.minimum_number, username, username, fulldate, time);

            var latestStock = await functions.getLatestStock();
      
            var emptyStorageSpace = await functions.getEmptyStoragePlace(req.body.location);
            await functions.updateStoragePlace(emptyStorageSpace[0].id, latestStock.id);

            var keywords = req.body.keywords.split(",");
            if(req.body.keywords != 0){
              for(var i = 0; i < keywords.length; i++){
                var fullKeyword = await functions.getMasterDataByName("keyword", keywords[i]);
                await functions.insertKeywordList(latestStock.id, fullKeyword[0].id);
    
              }
            } 

            var log = await functions.log(latestStock.id, "create");
            res.send("Entry Created");
      
        } catch (err) {
          console.log(err);
          console.log("entry error");
          res.status(500).send("Internal Server Error");
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
  

    });

    app.patch("/entry", async (req, res) => {

      if(req.session.loggedin){
        try {

          let entry = await functions.getStockById(req.body.id);

          let unit = await functions.getMasterDataByName("unit", req.body.unit);        
          let category = await functions.getMasterDataByName("category", req.body.category);
          await functions.updateArticle(entry.article_id, req.body.name, unit[0].id, category[0].id);
          await functions.updateStock(req.body.number, req.body.minimum_number, req.session.username, req.body.id);

          //update keywords
          await functions.deleteKeywordList(entry.id); //delete old keywords
          if(req.body.keywords.length > 0){
            var keywordArray = req.body.keywords.split(",");
            for(var i = 0; i < keywordArray.length; i++){
              var keyword = await functions.getKeywordsByName(keywordArray[i]);
              await functions.insertKeywordList(entry.id, keyword[0].id); //add new keywords
            }

          }
    
          //update storage place
          let storagePlace = await functions.getStoragePlaceByStockId(entry.id);
          await functions.setStoragePlaceToNull(entry.id);
          // await functions.updateStoragePlace(storagePlace.id, req.body.id);

          var emptyStorageSpace = await functions.getEmptyStoragePlace(req.body.location);
          await functions.updateStoragePlace(emptyStorageSpace[0].id, req.body.id);
    
          var log = await functions.log(req.body.id, "change");

          res.send("updated");
    
        } catch (e) {
          res.status(404).send(e);
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
      
    });

    app.delete("/data/:id", async (req, res) => {
      if (req.session.loggedin) {
        try {
          await functions.log(req.params.id, "delete");

          const result = await functions.markStockAsDeleted(req.params.id, req.session.username);
          await functions.setStoragePlaceToNull(req.params.id);

          res.send(result);
        } catch (err) {
          console.log(err);
          res.status(500).send("Internal Server Error");
        }
      } else {
        res.redirect("/");  //redirect to login page if not logged in
      }
    });
  //

  //Article name auto complete
    app.get("/entry/name/:name", async (req, res) => {
    if(req.session.loggedin){
      try {
        const result = await functions.getArticleByName(req.params.name);
        res.send(result);
      } catch (err) {
        res.status(404).send("Internal Server Error");
      }
    }else{
      req.session.redirectTo = `/entry/name/${req.params.name}`;
      res.render("login", { err: req.query.err }); //redirect to login page if not logged in

    }

    });
  //

  //Masterdata
    app.get("/stammdaten/:table", async (req, res) => {
      if(req.session.loggedin){
        try {
          var results = await functions.getMasterData(req.params.table);
          res.send(results);
        } catch (e) {
          res.status(404).send("404 Not Found");
          console.log(e);
        }
      }else{
        req.session.redirectTo = `/stammdaten/${req.params.table}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }


    });

    app.get("/stammdaten/:table/:name", async (req, res) => {
      if(req.session.loggedin){
        try {
          let table;
     
          switch (req.params.table) {
            case "Kategorie":
              table = "category";
              break;
            case "Einheit":
              table = "unit";
              break;
            case "Stichwörter":
              table = "keyword";
              break;
            default:
              table = req.params.table;
              break;
          }
    
          var result = await functions.getMasterDataByName(table ,req.params.name);
  
          if(table == "keyword"){
            var count = await functions.countKeywordlistById(table, result[0].id);
            
          }else{
            var count = await functions.countMasterDataById(table, result[0].id);
          }
          result[0].number = count[0].number;
          res.send(result);
        } catch (error) {
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
      }else{
        req.session.redirectTo = `/stammdaten/${req.params.table}/${req.params.name}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.post("/stammdaten/:table", async (req, res) => {
      if(req.session.loggedin){
        try {
          var exists = await functions.getMasterDataByName(req.params.table, req.body.value);
          
          if(exists.length == 0){
            await functions.insertMasterData(req.params.table.toLowerCase(), req.body.value);
            res.send("Master Data Created");
          }else{
  
            res.send("Entry already exists");
  
          }
        } catch (error) {
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
     
    });
  
    app.delete("/stammdaten/:table/:name", async (req, res) => {
      if(req.session.loggedin){
        try {
          var table = req.params.table;
          if(table == "storageLocation"){
            var storage_location_id = req.params.name;
  
            var storage_location = await functions.getStorageLocationById(storage_location_id);
            var children = await functions.getStorageLocationByParent(storage_location_id);
            var emptyPlaces = await functions.getEmptyStoragePlaces(storage_location_id);
            emptyPlaces = emptyPlaces[0].empty_places;
            places = storage_location[0].places;
  
            if(children.length == 0 && emptyPlaces == places){
                //delete all places
                await functions.deleteStoragePlaces(storage_location_id, 0, places);
                //delete location
                await functions.deleteStorageLocation(storage_location_id);
            }
            
          }else{
            await functions.deleteMasterData(table, req.params.name);
          }
          res.send(req.params.name + " deleted");
        } catch (error) {
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
  
  
    });

    app.get("/storagePlace/:id", async (req, res) => {
      if (req.session.loggedin) {

        var id = req.params.id;
        var num = /\d/.test(id);
        if(num){
          const result = await functions.getStockByStoragePlace(id);
          
          if(!result){
            res.status("404").send("Item Not Found");
          }
          //add storage place
          var storage_place = await functions.getStorageByStockId(result.id);
          result.storage_location = storage_place[0].name;
          result.storage_place = storage_place[0].place;
    
          if(result.deleted == 0){
            res.render("item", { session: req.session, item: result});
          }else{
            res.status("404").send("Item Not Found");
          }

        }else{
          res.status("404").send("404 Not Found");
        }

      }else{
        req.session.redirectTo = `/storagePlace/${req.params.id}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.patch("/storagePlace", async (req, res) => {
      if (req.session.loggedin) {
          await functions.updateStockNumber(req.body.id, req.body.number, req.session.username);
          await functions.log(result.id, "change");

          res.send("updated");
      } else {
        req.session.redirectTo = `/storagePlace/${storagePlaceId}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })  

    app.get("/lagerorte", async (req, res) => {
      if(req.session.loggedin){
        try {
          var results = await functions.getStorageLocation();
          for(var i = 0; i < results.length; i++){
            var count = await functions.getEmptyStoragePlaces(results[i].id);
            results[i].empty_places = count[0].empty_places;
          }
          res.send(results);
        } catch (e) {
          res.status(404).send("404 Not Found");
          console.log(e);
        }
      }else{
        req.session.redirectTo = `/lagerorte`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
  

    });
    
    app.get("/lagerorte/:id", async (req, res) => {
      if (req.session.loggedin) {
        var results = await functions.getStorageLocationById(req.params.id);
        var count = await functions.getEmptyStoragePlaces(results[0].id);
        results[0].empty_places = count[0].empty_places;
        res.send(results);
      } else {
        req.session.redirectTo = `/lagerorte/${req.params.id}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.get("/lagerorte/parent/:id", async (req,res) => {
      if (req.session.loggedin) {
        var results = await functions.getStorageLocationByParent(req.params.id);
        for(var i = 0; i < results.length; i++){
          var count = await functions.getEmptyStoragePlaces(results[i].id);
          results[i].empty_places = count[0].empty_places;
        }
        res.send(results);
      } else {
        req.session.redirectTo = `/lagerorte/parent/${req.params.id}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.post("/lagerorte", async (req, res) => {
      if (req.session.loggedin){
        try{
          var doubleEntry = await functions.getStorageLocationByNameAndParent(req.body.name, req.body.parent);
          if(doubleEntry.length == 0){
            var results = await functions.insertStorageLocation(req.body.name, req.body.parent, req.body.places);
            var parent = await functions.getStorageLocationByParent(req.body.parent);
            var latest = 0;
            for(var i = 0; i < parent.length; i++){
              if(parent[i].id > latest){
                latest = parent[i].id;
              }
            }
    
            await functions.insertStoragePlaces(latest, req.body.places, 0);
    
            res.send(results);
          }else{
            res.status("500").send("Internal Server Error {Entry already exists}");

          }

        }catch(error){
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.patch("/lagerorte", async (req,res) => {
      if(req.session.loggedin){
        try {
          let oldStorageLocation = await functions.getStorageLocationById(req.body.id);
          await functions.updateStorageLocation(req.body.id, req.body.name, req.body.number);
          if(oldStorageLocation[0].places < req.body.number){
            await functions.insertStoragePlaces(req.body.id, req.body.number, oldStorageLocation[0].places)
          }else if(oldStorageLocation[0].places > req.body.number){
            await functions.deleteStoragePlaces(req.body.id, req.body.number, oldStorageLocation[0].places);
          }

          res.send("updated");
        } catch (error) {
          res.status("500").send("Internal Server Error");
          console.log(error);
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })
  //
  
}
