  $.get( "/api/user", function( data ) {
    $("#loginText").html(`Eingeloggt als ${data.title} ${data.username}`);
  });

  $("#Logout").click(function () {
    $.get("/logout", function (data) {
      window.location.href = "/";
    });
  });

  //redirect if log icon was clicked
  $("#table").on("click", ".log", function (e) {
    //gets id of clicked row
    let id = $(this).parent().parent().children().eq(1).html().trim();
    window.location.href = `/logs/${id}`;
  });

  //hanlde list_number popup submit
  $("body").on("submit", "#list_number_popup form", function(event){
    event.preventDefault();
    let id = $(this).data("id");
    let change = $(this).serializeArray()[0].value;

    //check if the toggle was checked
    if($(this).serializeArray().length == 2){
      change = (change * -1).toString();      
    }

    //create list entry to store in cookies 
    let newEntry = {"id": id, "change": change};
    addToList(newEntry);
    
    $(this).parent().fadeOut(300, () => $(this).parent().remove());
    $("#cover").fadeOut();

    //ui.js
    updateListNumber();
  });

  //trigggers if the trash icon in the list_popup was clicked
  $("body").on("click", "#list_popup .PopUp_middle .fa-trash", function(e){
    let row = $(this).parent().parent();
    let id = row.find(".id").html();
    let storage_old = JSON.parse(localStorage.getItem("list"));
    //filter sesseionStorage to remove the clicked element
    let storage_filtered = storage_old.filter(obj => obj.id != id);
    //save changes to session
    localStorage.setItem("list", JSON.stringify(storage_filtered));
    //remove row from popup
    row.remove();

    if(storage_filtered.length == 0){
      $("#list_popup").find("table").append($(`<tr><td colspan="100">Speichern Sie Artikel ab, um sie hier einsehen zu können.</td></tr>`));
      $("#list_popup").find("#qrSubmit").attr("disabled", true);
    }
    //ui.js
    updateListNumber();
  })

  //stores on list entry in cookies
  function addToList(entry){
    let list = localStorage.getItem("list");
    let newList = [];

    if(list == null){
      newList[0] = entry;
    }else{
      newList = JSON.parse(list);
      //delete duplicate entries
      newList = newList.filter(obj => obj.id != entry.id);
      newList.push(entry);
    }
    localStorage.setItem("list", JSON.stringify(newList));
  }

  function clearList(){
    localStorage.removeItem('list');
    updateListNumber();
    $("#list_popup").find("table tr").not(':first').remove();
    $("#list_popup").find("table").append($(`<tr><td colspan="100">Speichern Sie Artikel ab, um sie hier einsehen zu können.</td></tr>`));
    $("#list_popup").find("#qrSubmit").attr("disabled", true);
  }

  //handle stock popup submit
  $("body").on("submit", "#PopUp form", function(event){
    event.preventDefault();
    let id;
    //only define id if a row is selected
    if($(".selected").length > 0){
      id = $(".selected").find("td")[1].innerHTML;
    }

    //get all values from popup
    var name = $("#name").val();
    var location = $("#myUL").find("div").first().attr("data-id");
    var number = $("#number").val();
    var minimum_number = $("#minimum_number").val();
    var category = $("#category").val();
    var keywords = $('.select-pure__selected-label');
    var keywordArr = [];
    var unit = $('#unit').val();
    $(keywords).each(function (i){
      keywordArr.push($(this).first().text());
    })

    //only submit if a location was selected
    if(location > 0){
      var formdata = `id=${id}&name=${name}&location=${location}&number=${number}&minimum_number=${minimum_number}&category=${category}&keywords=${keywordArr}&unit=${unit}`;
      if(typeof id === 'undefined'){ 
        $.post('/api/stock', formdata, function (response) {
          //load new data
          table.ajax.reload();
          //close popup
          $("#mdiv").click();

          //find and show the new row
          table.order([1, "desc"]).draw();

          $("#rootUL").text("");
          appendLocationRootNodes();
        });
      }else{
        $.ajax({
          type: 'PATCH',
          url: '/api/stock',
          data: formdata,
          processData: false,
          contentType: 'application/x-www-form-urlencoded',
          success: function () {
            //load new data
            table.ajax.reload();
            //close popup
            $("#mdiv").click();  
            
            //find and show the new row
            table.order([1, "desc"]).draw();

            $("#rootUL").text("");
            appendLocationRootNodes();
          }
        });
      }
    }else{
      $("#myUL").find("div").first().attr("style", "color: red !important");
    }
  });

  //generate qr code
  $("body").on("submit", "#list_popup form", function(e){
    e.preventDefault();
    let rows = $(this).find("tr");
    let list = [];
    for(let i = 1; i < rows.length; i++){
      let article_id = $(rows[i]).find(".id").text();
      let select = $(rows[i]).find("select").val();
      let amount = $(rows[i]).find(".amount").val();
      list.push({
        "stock_id": article_id,
        "lay_in": (select == "in" ? true : false),
        "amount": amount
      });
    }
    console.log(list);
    $.post("/api/mobileList", {"list" : JSON.stringify(list)}, function(data){
      $("#qrcode").text("");
      new QRCode(document.getElementById("qrcode"), data);
      $("#qrcode").append(`<div><a href="${data}">${data}</a></div>`);
      $("#qrcode").show();
      clearList();
    });
  });
