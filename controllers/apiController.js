const logger = require("../logger/logger");
const config = require('config'); 
const functions = require("./functions");
const masterdataDB = require("./masterdataDB"); //import sql functions for handling masterdata database changes
const taskDB = require("./taskDB");
const logDB = require("./logDB");
const http = require('http');

module.exports = function(app){
    
  //get user information
  app.get("/api/user", async (req, res) => {
    if(req.session.loggedin){
      res.send(req.session);
    }else{
      req.session.redirectTo = '/api/user';
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //get all user log data
  app.get("/api/logs", async (req, res) => {
    if (req.session.loggedin) {
      try {
        let logs = await logDB.getLog();
        res.send(logs);
      } catch (error) {
        res.status("500").send("Internal Server Error");
        console.log(error);
      }
    } else {
      req.session.redirectTo = `/api/logs`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //get all user log data by stock id
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
      req.session.redirectTo = `/api/logs/${req.params.stockId}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //get data for mobile list by id
  app.get("/api/mobileList/:id", async (req, res) => {
    if(req.session.loggedin){
      try {
        //get all data from this task id
        let task = await taskDB.get_task_by_id(req.params.id);
        //for every task entry..
        for(let i = 0; i < task.length; i++){
          let stock_data = await functions.getStockById(task[i].stock_id);
          let storage = await masterdataDB.getStorageByStockId(task[i].stock_id);
          let storage_name = await getFullStorageName(storage, storage.name);

          task[i].articleName = stock_data.name;
          task[i].number = stock_data.number;
          task[i].storage = storage_name;
          task[i].storage_place = storage.place;
        }
        
        //get color from led api
        let color = await getledColor(req.params.id);

        //build final json
        let data = {
          "data": task,
          "color": color,
          "status": task[0].task_status
        };
        res.send(JSON.stringify(data));
      } catch (error) {
        res.status(400).send("Bad Request");
        logger.error(`User: ${req.session.username} - Method: Get - Route: /api/mobileList/${req.params.id} - Error: ${error}`);
      }
    }else{
      req.session.redirectTo = `/api/mobileList/${req.params.id}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //creates new task/mobileList
  app.post("/api/mobileList", async (req, res) => {
    if (req.session.loggedin) {
      try {
        //log request
        logger.info(`User: ${req.session.username} - Method: Post - Route: /api/mobileList - Body: ${JSON.stringify(req.body)}`);

        let username = req.session.username;
        let data = JSON.parse(req.body.list);
        //create new mobileList
        await taskDB.insert_task(username);
        let task_id = await taskDB.get_latest_task_id();
        //fill mobileListEntries
        data.forEach(async obj => {
          await taskDB.insert_task_entry(task_id, obj.stock_id, obj.lay_in, obj.amount, 0);
        })

        let stock_ids = data.map((d) => d.stock_id).join(", ");
        let locations = await masterdataDB.getLocationByStockIds(stock_ids);

        //Build array with storage id´s 
        let locationArr = [];
        for(let ele of locations){
          let res = await getFullStoragePath(ele.parent, ele.storage_location_id);
          let resArr = JSON.parse("[" + res + "]");
          locationArr = locationArr.concat(resArr);
        }

        //Build Json for led post request
        let storageData = {};
        storageData.auftrag = task_id;
        storageData.lager = locationArr;
        let ledReq = await ledRequest(storageData, "POST"); //post storage data to led api
        //send qr code link
        res.send(`${config.get("qr.domain")}/mobileList/${task_id}`);
      } catch (error) {
        res.status(400).send("Bad Request");
        logger.error(`User: ${req.session.username} - Method: Post - Route: /api/mobileList - Body: ${JSON.stringify(req.body)} - Error: ${error}`);
        
      }  
    } else {
      req.session.redirectTo = `/`;
      res.redirect("/"); //redirect to login page if not logged in
    }      
  })

  //updates mobileList
  app.put("/api/mobileList", async (req, res) => {
    if(req.session.loggedin){
      try {
        logger.info(`User: ${req.session.username} - Method: Put - Route: /api/mobileList - Body: ${JSON.stringify(req.body)}`);
      
        await taskDB.update_task_entry_status(req.body.task_id, req.body.stock_id, req.body.status);
        let unfinishedEntries = await taskDB.getUnfinishedTaskEntries(req.body.task_id);

        let locationArr = [];
        if(unfinishedEntries.length != 0){
          let stock_ids = [];
          for(let obj of unfinishedEntries){
            stock_ids.push(obj.stock_id);
          }
          let locations = await masterdataDB.getLocationByStockIds(stock_ids);
          //Build array with storage id´s 
          for(let ele of locations){
            let res = await getFullStoragePath(ele.parent, ele.storage_location_id);
            let resArr = JSON.parse("[" + res + "]");
            locationArr = locationArr.concat(resArr);
          }
        }

        let lagerData = {};
        lagerData.auftrag = parseInt(req.body.task_id);
        lagerData.lager = locationArr;
        console.log(lagerData);
        await ledRequest(lagerData, "PUT");
        res.send("Status updated");

      } catch (error) {
        res.status(400).send("Bad Request");
        logger.error(`User: ${req.session.username} - Method: Put - Route: /api/mobileList - Body: ${JSON.stringify(req.body)} - Error: ${error}`);

      }
    }else{
      req.session.redirectTo = `/`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //finishes a task
  app.delete("/api/mobileList", async (req, res) => {
    if(req.session.loggedin){
      try {
        logger.info(`User: ${req.session.username} - Method: Delete - Route: /api/mobileList - Body: ${JSON.stringify(req.body)}`);

        //send a delete request to the led api to turn off all led´s 
        ledRequest(`{"auftrag": ${req.body.autrag}}`, "DELETE");
        //mark task as finished
        taskDB.finish_task(req.body.auftrag);
      
        res.send("Deleted");
      } catch (error) {
        res.status(400).send("Bad Request");
        logger.error(`User: ${req.session.username} - Method: Delete - Route: /api/mobileList - Body: ${JSON.stringify(req.body)} - Error: ${error}`);

      }
    }else{
      req.session.redirectTo = `/`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //stock related data for the home page
  app.get("/api/stock", async (req, res) => {
    if (req.session.loggedin) {
      var result = await functions.getStock(); // get db data
      for(var i = 0; i < result.data.length; i++){

        //add keywords
        var keywordlist = await masterdataDB.getKeywordlistByStockid(result.data[i].id);
        result.data[i].keyword = keywordlist.keyword;

        //add storage place
        let storage = await masterdataDB.getStorageByStockId(result.data[i].id);
        let storage_name = await getFullStorageName(storage, storage.name);
        result.data[i].storage_location = storage_name;
        result.data[i].storage_place = storage.place;
      }
      res.send(result);
    } else {
      req.session.redirectTo = `/api/stock`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  });

  //Build a full path of storage id´s
  async function getFullStoragePath(parentId, path){
    
    let res = await masterdataDB.getStorageLocationById(parentId);
    if(typeof res === 'undefined'){
      return path;
    }else{
      //adds the current id to the path
      path = res.id + "," + path;
      //recursively run the function with the current parent as the new id
      return await getFullStoragePath(res.parent, path);    
    }
  }

  //Build a full path of storage names
  async function getFullStorageName(storage, name){
    let parentId = storage.parent;
    let fullName = name;

    let res = await masterdataDB.getStorageLocationById(parentId);
    if(typeof res === 'undefined'){
      return fullName;
    }else{
      //adds the current name to the full Name
      fullName = res.name + "-" + fullName;
      //recursively run the function with the current path/fullname as the new name
      return await getFullStorageName(res, fullName);    
    }
    
  }

  //get full stock data by id
  app.get("/api/stock/:id", async (req, res) => {
    if(req.session.loggedin){
      var id = req.params.id;
      var num = /\d/.test(id);
      //if id is a number
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
        let storage = await masterdataDB.getStorageByStockId(result.id);
        let storage_name = await getFullStorageName(storage, storage.name);
        result.storage_location = storage_name;
        result.storage_place = storage.place;
        result.storage_location_id = storage.storage_location_id;
        result.storage_parent = storage.parent;

        res.send(result);
      }else{
        res.status("404").send("404 Not Found");
      }
    }else{
      req.session.redirectTo = `/api/stock/${req.params.id}`;
      res.redirect("/"); //redirect to login page if not logged in

    }
      
  });

  //get stock entries by name
  app.get("/api/stock/name/:name", async (req, res) => {
    if(req.session.loggedin){
        const result = await functions.getStockByName(req.params.name);
        res.send(result);
    }else{
      req.session.redirectTo = `/api/stock/name/${req.params.name}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  });

  //creates stock entry
  app.post("/api/stock", async (req, res) => {
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

          //add user log
          await logDB.log(latestStock.id, "create");
          res.send("Entry Created");
      } catch (err) {
        res.status(400).send("Bad Request");
      }
    }else{
      req.session.redirectTo = `/`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  });

  //update stock entry
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
  
        //add user log
        await logDB.log(req.body.id, "change");

        res.send("updated");
  
      } catch (e) {
        console.log(e);
        res.status(404).send(e);
      }
    }else{
      req.session.redirectTo = `/`;
      res.redirect("/"); //redirect to login page if not logged in
    }
    
  });

  //delets stock entry by id
  app.delete("/api/stock/:id", async (req, res) => {
    if (req.session.loggedin) {
      try {

        await masterdataDB.deleteKeywordList(req.params.id);
        await masterdataDB.setStoragePlaceToNull(req.params.id);
        let stock = await functions.getStockById(req.params.id);
        let result = await functions.deleteStock(req.params.id);

        await functions.deleteArticle(stock.id);

        //add user log
        await logDB.log(req.params.id, "delete");
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

  //get task entries by stock id
  app.get("/api/taskentries/stock/:stockId", async (req, res) => {
    if(req.session.loggedin){
      let result = await taskDB.get_task_entries_by_stock_id(req.params.stockId);
      res.send(result);
    }else{
      req.session.redirectTo = `/api/taskentries/stock/${req.params.stockId}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //get all tasks
  app.get("/api/task", async (req, res) => {
    if(req.session.loggedin){
      let task = await taskDB.get_task();
      res.send(task);
    }else{
      req.session.redirectTo = `/api/task`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //get tasklog by task id
  app.get("/api/tasklog/:taskId", async (req, res) => {
    if(req.session.loggedin){
      let task = await taskDB.get_tasklog(req.params.taskId);
      res.send(task);
    }else{
      req.session.redirectTo = `/api/taskentries/${req.params.taskId}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //creates new tasklog
  app.post("/api/tasklog", async (req, res) => {
    if(req.session.loggedin){
      try {
        let stock_id = req.body.stock_id;
        let task_id = req.body.task_id;
        let name = req.body.name;
        let storage_location = req.body.storage_location;
        let storage_place = req.body.storage_place;
        let amount_pre = req.body.amount_pre;
        let amount_post = req.body.amount_post;
        let status = req.body.status;
        await taskDB.insert_tasklog(stock_id, task_id, name, storage_location, storage_place, amount_pre, amount_post, status);
        await taskDB.delete_task_entries_by_task_id(task_id);
        res.send("Updated");
      } catch (error) {
        res.status("400").send("Bad Request");
      }
    }else{
      req.session.redirectTo = "/";
      res.redirect("/");
    }
  })

  //get task status by id
  app.get("/api/taskstatus/:id", async (req, res) =>  {
    if(req.session.loggedin){
      try {
        let task_status = await taskDB.get_task_status(req.params.id);
        res.send(task_status);
      } catch (error) {
        console.log(error);
        res.status("400").send("Bad Request");
      }
    }else{
      req.session.redirectTo = "/";
      res.redirect("/");
    }
  })
  //

  //get masterdata by table
  app.get("/api/stammdaten/:table", async (req, res) => {
    if(req.session.loggedin){
      try {
        let results = await masterdataDB.getMasterdata(req.params.table);
        res.send(results);
      } catch (e) {
        res.status(404).send("404 Not Found");
      }
    }else{
      req.session.redirectTo = `/api/stammdaten/${req.params.table}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //get masterdata by name 
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
      req.session.redirectTo = `/api/stammdaten/${req.params.table}/${req.params.name}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //creats masterdata entry
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
      res.redirect("/"); //redirect to login page if not logged in
    }
    
  })

  //delete masterdata entry by name
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
      res.redirect("/"); //redirect to login page if not logged in
    }
  })  

  //get storage location
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
      req.session.redirectTo = `/api/storageLocation`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  });
  
  //get storage location by id
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
      req.session.redirectTo = `/api/storageLocation/${req.params.id}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })

  //get storage location by parent id
  app.get("/api/storageLocation/parent/:id", async (req,res) => {
    if (req.session.loggedin) {
      var results = await masterdataDB.getStorageLocationByParentId(req.params.id);
      for(var i = 0; i < results.length; i++){
        var empty_places = await masterdataDB.countEmptyStoragePlacesByLocationId(results[i].id);
        results[i].empty_places = empty_places;
      }
      res.send(results);
    } else {
      req.session.redirectTo = `/api/storageLocation/parent/${req.params.id}`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  });

  //creats new storage location
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
      res.redirect("/"); //redirect to login page if not logged in
    }
  });

  //updates storage location
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
      res.redirect("/"); //redirect to login page if not logged in
    }
  })
  //

  //Updates number/amount of a stock entry
  app.patch("/api/storagePlace", async (req, res) => {
    if (req.session.loggedin) {
      try{
        logger.info(`User: ${req.session.username} - Method: Patch - Route: /api/storagePlace - Body: ${JSON.stringify(req.body)}`);

        if(req.body.number < 0){
          return;
        }
        await functions.updateStockNumber(req.body.id, req.body.number, req.session.username);
        await logDB.log(req.body.id, "change");
        res.send("updated");
      }catch(e){
        logger.error(`User: ${req.session.username} - Method: Patch - Route: /api/storagePlace - Body: ${JSON.stringify(req.body)} - Error: ${error}`);
        res.send(e);
      }
    } else {
      req.session.redirectTo = `/storagePlace`;
      res.redirect("/"); //redirect to login page if not logged in
    }
  })
  //

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
        resolve("");
      });
      
      req.on('error', (error) => {
        req.destroy();
        console.error(error)
        resolve("");

      })
      
      req.write(data)
      req.end()
    })
  }

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