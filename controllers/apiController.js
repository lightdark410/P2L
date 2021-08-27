const logger = require("../logger/logger");
const config = require('config'); 
const functions = require("./functions");
const masterdataDB = require("./masterdataDB"); //import sql functions for handling masterdata database changes
const listDB = require("./listDB");
const logDB = require("./logDB");
const http = require('http');

module.exports = function(app){
    
  app.get("/api/logs", async (req, res) => {
    if (req.session.loggedin) {
      try {
        var logs = await logDB.getLog();

        res.send(logs);
      } catch (error) {
        res.status("500").send("Internal Server Error");
        console.log(error);
      }

    } else {
      req.session.redirectTo = `/logs`;
      res.render("login", { err: req.query.err}); //redirect to login page if not logged in
    }
  })

  app.get("/api/logs/:stockId", async (req, res) => {
    if(req.session.loggedin){
      try {
        var logs = await logDB.getLogByStockId(req.params.stockId);
        res.send(logs);
      } catch (error) {
        res.status("500").send("Internal Server Error");
        console.log(error);
      }
    }else{
      req.session.redirectTo = `/logs/${req.params.stockId}`;
      res.render("login", { err: req.query.err}); //redirect to login page if not logged in
    }
  })

  app.post("/api/mobileList", async (req, res) => {
    if (req.session.loggedin) {
      try {
        logger.info(`User: ${req.session.username} - Method: Post - Route: /api/mobileList - Body: ${JSON.stringify(req.body)}`);

        let username = req.session.username;
        let data = JSON.parse(req.body.list);
        //create new mobileList
        await listDB.insert_mobile_list(username);
        let list_id = await listDB.get_latest_mobile_list_id();

        //fill mobileListEntries
        data.forEach(async obj => {
          await listDB.insert_list_entry(list_id, obj.stock_id, obj.lay_in, obj.amount, 0);
        })

        //Build Json for led post request
        let stock_ids = data.map((d) => d.stock_id).join(", ");
        let locationIds = await masterdataDB.getLocationIdAndGroupPlaceIdsByStockIds(stock_ids);
        let locationData = [];
        locationIds.forEach(obj => {
          let json = {};
          json.id = obj.storage_location_id;
          json.plaetze = JSON.parse(`[${obj.places}]`);
          locationData.push(json);
        });

        let lagerData = {};
        lagerData.auftrag = list_id;
        lagerData.lager = locationData;
        let ledRes = await ledRequest(lagerData, "POST");
        console.log(ledRes);
        //send qr code link
        res.send(`${config.get("qr.domain")}/mobileList/${list_id}`);
      } catch (error) {
        res.status(400).send("Bad Request");
        logger.error(`User: ${req.session.username} - Method: Post - Route: /api/mobileList/${req.params.table} - Body: ${JSON.stringify(req.body)} - Error: ${error}`);
        
      }
  
    } else {
      req.session.redirectTo = `/`;
      res.render("login", { err: req.query.err}); //redirect to login page if not logged in
    }      
  })

  app.put("/api/mobileList", async (req, res) => {
    if(req.session.loggedin){
      try {
        logger.info(`User: ${req.session.username} - Method: Put - Route: /api/mobilelist - Body: ${JSON.stringify(req.body)}`);
      
        await listDB.update_list_entry_status(req.body.list_id, req.body.stock_id, req.body.status);
        let unfinishedEntries = await listDB.getUnfinishedListEntries(req.body.list_id);
        let locationData = [];

        if(unfinishedEntries.length != 0){
          let locationIds = await masterdataDB.getLocationIdAndGroupPlaceIdsByStockIds(unfinishedEntries.map(obj => obj.stock_id));
          locationIds.forEach(obj => {
            let json = {};
            json.id = obj.storage_location_id;
            json.plaetze = JSON.parse(`[${obj.places}]`);
            locationData.push(json);
          });
        }

        let lagerData = {};
        lagerData.auftrag = parseInt(req.body.list_id);
        lagerData.lager = locationData;

        let ledres = await ledRequest(lagerData, "PUT");
        console.log(ledres);
        res.send("Status updated");

      } catch (error) {
        res.status(400).send("Bad Request");
        logger.error(`User: ${req.session.username} - Method: Put - Route: /api/mobilelist - Body: ${JSON.stringify(req.body)} - Error: ${error}`);

      }
    }else{
      req.session.redirectTo = `/`;
      res.render("login", { err: req.query.err}); //redirect to login page if not logged in
    }
  })

  app.delete("/api/mobilelist", async (req, res) => {
    if(req.session.loggedin){
      try {
        logger.info(`User: ${req.session.username} - Method: Delete - Route: /api/mobilelist - Body: ${JSON.stringify(req.body)}`);
        if(typeof req.body.auftrag == 'number'){
          ledRequest(`{"auftrag": ${req.body.autrag}}`, "DELETE");
        }
        res.send("Deleted");

      } catch (error) {
        res.status(400).send("Bad Request");
        logger.error(`User: ${req.session.username} - Method: Delete - Route: /api/mobilelist - Body: ${JSON.stringify(req.body)} - Error: ${error}`);

      }
    }else{
      req.session.redirectTo = `/`;
      res.render("login", { err: req.query.err}); //redirect to login page if not logged in
    }
  })

  //send request to the led api
  function ledRequest(RequestData, method){
    const data = JSON.stringify(RequestData);
    const options = {
      hostname: config.get("led.hostname"),
      port: config.get("led.port"),
      path: '/anfrage/api/v1',
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
      timeout: 500
    }

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {  
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
      
      req.on('error', (error) => {
        console.error(error)
      })
      
      req.write(data)
      req.end()
    })
  }

  //stock related data for the home page
    app.get("/api/stock", async (req, res) => {
      if (req.session.loggedin) {
        var result = await functions.getStock(); // get db data
        for(var i = 0; i < result.data.length; i++){

          //add keywords
          var keywordlist = await masterdataDB.getKeywordlistByStockid(result.data[i].id);
          result.data[i].keyword = keywordlist.keyword;

          //add storage place
          let storage_place = await masterdataDB.getStorageByStockId(result.data[i].id);
          result.data[i].storage_location = storage_place.name;
          result.data[i].storage_place = storage_place.place;
        }
        res.send(result);
      } else {
        req.session.redirectTo = `/api/stock`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.get("/api/stock/:id", async (req, res) => {
      if(req.session.loggedin){
        var id = req.params.id;
        var num = /\d/.test(id);
    
        if(num){
          const result = await functions.getStockById(id);
          if(!result){
            res.status("404").send("404 Not Found");
            return;
          }
          //add keywords
          var keywordlist = await masterdataDB.getKeywordlistByStockid(result.id);
          result.keyword = keywordlist.keyword;

          //add storage place
          let storage_place = await masterdataDB.getStorageByStockId(result.id);
          result.storage_location = storage_place.name;
          result.storage_place = storage_place.place;
          result.storage_location_id = storage_place.storage_location_id;
          result.storage_parent = storage_place.parent;

          res.send(result);
        }else{
          res.status("404").send("404 Not Found");
        }
      }else{
        req.session.redirectTo = `/api/stock/${req.params.id}`;
        res.render("login", { err: req.query.err }); //redirect to login page if not logged in

      }
        
    });

    //get stock entries by name
    app.get("/api/stock/name/:name", async (req, res) => {
      if(req.session.loggedin){
          const result = await functions.getArticleByName(req.params.name);
          res.send(result);
      }else{
        req.session.redirectTo = `/api/stock/name/${req.params.name}`;
        res.render("login", { err: req.query.err }); //redirect to login page if not logged in
      }
    });

    app.post("/api/stock", async (req, res) => {
      //create entry in db
      if(req.session.loggedin){
        var username = req.session.username;
    
        try {

            let category = await masterdataDB.getMasterdataByName("category", req.body.category);
            await functions.insertArticle(req.body.name, 1, category.id);

            const item = await functions.getLatestArticle();
            await functions.insertStock(item.id, req.body.number, req.body.minimum_number, username, username);

            var latestStock = await functions.getLatestStock();
      
            var emptyStorageSpace = await masterdataDB.getEmptyStoragePlace(req.body.location);
            await masterdataDB.updateStoragePlace(emptyStorageSpace.id, latestStock.id);

            var keywords = req.body.keywords.split(",");
            if(req.body.keywords != 0){
              for(var i = 0; i < keywords.length; i++){
                var fullKeyword = await masterdataDB.getMasterdataByName("keyword", keywords[i]);
                await masterdataDB.insertKeywordList(latestStock.id, fullKeyword.id);
    
              }
            } 

            await logDB.log(latestStock.id, "create");
            res.send("Entry Created");
        } catch (err) {
          res.status(400).send("Bad Request");
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
  

    });

    app.patch("/api/stock", async (req, res) => {

      if(req.session.loggedin){
        try {
          let entry = await functions.getStockById(req.body.id);

          //check if nothing has changed
            let storage = await masterdataDB.getStorageByStockId(req.body.id);
            let keywords = await masterdataDB.getKeywordlistByStockid(req.body.id);
            let compare_json = {
              "id": entry.id,
              "name": entry.name,
              "location": storage.storage_location_id,
              "number": entry.number,
              "minimum_number": entry.minimum_number,
              "category": entry.category,
              "keywords": (keywords.keyword == null ? '' : keywords.keyword),
              "unit": entry.unit
            };

            //check if any changes were made
            let flag=true;
            if(Object.keys(req.body).length==Object.keys(compare_json).length){
                for(key in req.body) { 
                    if(req.body[key] == compare_json[key]) {
                        continue;
                    }
                    else {
                        flag=false;
                        break;
                    }
                }
            }
            else {
                flag=false;
            }

            if(flag){
              res.send("not updated");
              return;
            }
          //
          //update article and stock
          let unit = await masterdataDB.getMasterdataByName("unit", req.body.unit);        
          let category = await masterdataDB.getMasterdataByName("category", req.body.category);
          await functions.updateArticle(entry.article_id, req.body.name, unit.id, category.id);
          await functions.updateStock(req.body.number, req.body.minimum_number, req.session.username, req.body.id);

          //update keywords
          await masterdataDB.deleteKeywordList(entry.id); //delete old keywords
          if(req.body.keywords.length > 0){
            let keywordArray = req.body.keywords.split(",");
            for(let i = 0; i < keywordArray.length; i++){
              let keyword = await masterdataDB.getKeywordsByName(keywordArray[i]);
              await masterdataDB.insertKeywordList(entry.id, keyword[0].id); //add new keywords
            }

          }
    
          //update storage place
          await masterdataDB.setStoragePlaceToNull(entry.id);
     
          var emptyStorageSpace = await masterdataDB.getEmptyStoragePlace(req.body.location);
          await masterdataDB.updateStoragePlace(emptyStorageSpace.id, req.body.id);
    
          await logDB.log(req.body.id, "change");

          res.send("updated");
    
        } catch (e) {
          console.log(e);
          res.status(404).send(e);
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
      
    });

    app.delete("/api/stock/:id", async (req, res) => {
      if (req.session.loggedin) {
        try {
          await logDB.log(req.params.id, "delete");

          await masterdataDB.deleteKeywordList(req.params.id);
          await masterdataDB.setStoragePlaceToNull(req.params.id);
          let stock = await functions.getStockById(req.params.id);
          let result = await functions.deleteStock(req.params.id);

          await functions.deleteArticle(stock.id);
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

  //Masterdata
    app.get("/api/stammdaten/:table", async (req, res) => {
      if(req.session.loggedin){
        try {
          let results = await masterdataDB.getMasterdata(req.params.table);
          res.send(results);
        } catch (e) {
          res.status(404).send("404 Not Found");
        }
      }else{
        req.session.redirectTo = `/stammdaten/${req.params.table}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.get("/api/stammdaten/:table/:name", async (req, res) => {
      if(req.session.loggedin){
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
    
          try{
            var result = await masterdataDB.getMasterdataByName(table ,req.params.name);
          }catch(e){
            res.status('404').send("404 Not Found");
            return;
          }

          if(typeof result === 'undefined'){
            res.status('404').send("404 Not Found");
            return;
          }
          if(table == "keyword"){
            var count = await masterdataDB.countKeywordlistById(table, result.id);
            
          }else{
            var count = await masterdataDB.countMasterdataById(table, result.id);
          }
          result.number = count[0].number;
          res.send(result);
      }else{
        req.session.redirectTo = `/stammdaten/${req.params.table}/${req.params.name}`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.post("/api/stammdaten/:table", async (req, res) => {
      if(req.session.loggedin){
        try {
          logger.info(`User: ${req.session.username} - Method: Post - Route: /stammdaten/${req.params.table} - Body: ${JSON.stringify(req.body)}`);

          let dataDoesNotExistsInDB = typeof await masterdataDB.getMasterdataByName(req.params.table, req.body.value) === 'undefined';
          if(dataDoesNotExistsInDB){
            await masterdataDB.insertMasterdata(req.params.table.toLowerCase(), req.body.value);
            res.send("Master Data Created");
          }else{
            res.send("Entry already exists");
          }
        } catch (error) {
          logger.error(`User: ${req.session.username} - Method: Post - Route: /stammdaten/${req.params.table} - Body: ${JSON.stringify(req.body)} - Error: ${error}`);
          res.status("400").send("Bad Request");
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
     
    })
  
    app.delete("/api/stammdaten/:table/:name", async (req, res) => {
      if(req.session.loggedin){
        try {
          var table = req.params.table;
          if(table == "storageLocation"){
            var storage_location_id = req.params.name;
  
            var storage_location = await masterdataDB.getStorageLocationById(storage_location_id);
            var children = await masterdataDB.getStorageLocationByParentId(storage_location_id);
            var emptyPlaces = await masterdataDB.countEmptyStoragePlacesByLocationId(storage_location_id);
            places = storage_location.places;
  
            if(children.length == 0 && emptyPlaces == places){
                //delete all places
                await masterdataDB.deleteStoragePlaces(storage_location_id, 0, places);
                //delete location
                await masterdataDB.deleteStorageLocation(storage_location_id);
            }
            
          }else{
            await masterdataDB.deleteMasterdata(table, req.params.name);
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
  
  
    })  

    app.get("/api/storageLocation", async (req, res) => {
      if(req.session.loggedin){
        try {
          var results = await masterdataDB.getStorageLocation();
          for(var i = 0; i < results.length; i++){
            var empty_places = await masterdataDB.countEmptyStoragePlacesByLocationId(results[i].id);
            results[i].empty_places = empty_places;
          }
          res.send(results);
        } catch (e) {
          res.status(404).send("404 Not Found");
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
  

    });
    
    app.get("/api/storageLocation/:id", async (req, res) => {
      if (req.session.loggedin) {
        let storage_location = await masterdataDB.getStorageLocationById(req.params.id);
        if(!storage_location){
          res.status("404").send("Not Found");
          return;
        }
        let empty_places = await masterdataDB.countEmptyStoragePlacesByLocationId(storage_location.id);
        storage_location.empty_places = empty_places;
        res.send(storage_location);
      } else {
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    })

    app.get("/api/storageLocation/parent/:id", async (req,res) => {
      if (req.session.loggedin) {
        var results = await masterdataDB.getStorageLocationByParentId(req.params.id);
        for(var i = 0; i < results.length; i++){
          var empty_places = await masterdataDB.countEmptyStoragePlacesByLocationId(results[i].id);
          results[i].empty_places = empty_places;
        }
        res.send(results);
      } else {
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.post("/api/storageLocation", async (req, res) => {
      if (req.session.loggedin){
        try{
          
          let dbEntry = await masterdataDB.getStorageLocationByNameAndParent(req.body.name, req.body.parent);
          let entryDoesNotExists = dbEntry.length == 0;

          if(entryDoesNotExists){
            let results = await masterdataDB.insertStorageLocation(req.body.name, req.body.parent, req.body.places);
            let parent = await masterdataDB.getStorageLocationByParentId(req.body.parent);
            let latest = 0;

            for(let i = 0; i < parent.length; i++){
              if(parent[i].id > latest){
                latest = parent[i].id;
              }
            }

            await masterdataDB.insertStoragePlaces(latest, req.body.places, 0);
            res.send(results);
          }else{
            res.status("500").send("Internal Server Error {Entry already exists}");
          }

        }catch(error){
          res.status("404").send("Not Found");
        }
      }else{
        req.session.redirectTo = `/`;
        res.render("login", { err: req.query.err}); //redirect to login page if not logged in
      }
    });

    app.patch("/api/storageLocation", async (req,res) => {
      if(req.session.loggedin){
        try {
          let oldStorageLocation = await masterdataDB.getStorageLocationById(req.body.id);
          await masterdataDB.updateStorageLocation(req.body.id, req.body.name, req.body.number);
          if(oldStorageLocation.places < req.body.number){
            await masterdataDB.insertStoragePlaces(req.body.id, req.body.number, oldStorageLocation.places)
          }else if(oldStorageLocation.places > req.body.number){
            await masterdataDB.deleteStoragePlaces(req.body.id, req.body.number, oldStorageLocation.places);
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

  //Updates the stock number
  app.patch("/api/storagePlace", async (req, res) => {
    if (req.session.loggedin) {
      try{
        console.log(req.body);
        if(req.body.number < 0){
          res.status("400").send("Bad Request");
          return;
        }
        await functions.updateStockNumber(req.body.id, req.body.number, req.session.username);
        await logDB.log(req.body.id, "change");
        res.send("updated");
      }catch(e){
        res.send(e);
      }
    } else {
      req.session.redirectTo = `/storagePlace`;
      res.render("login", { err: req.query.err}); //redirect to login page if not logged in
    }
  })
  //
}