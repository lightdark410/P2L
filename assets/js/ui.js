// $(function () {
  let stammdaten = function () {
    var location = null;
    var category = null;
    var unit = null;
    var keyword = null;

    $.ajax({
      'async': false,
      'type': "GET",
      'global': false,
      'url': "/lagerorte",
      'success': function (data) {
        location = data;
      }
    });

    $.ajax({
      'async': false,
      'type': "GET",
      'global': false,
      'url': "/stammdaten/category",
      'success': function (data) {
        category = data;
      }
    });

    $.ajax({
      'async': false,
      'type': "GET",
      'global': false,
      'url': "/stammdaten/unit",
      'success': function (data) {
        unit = data;
      }
    });

    $.ajax({
      'async': false,
      'type': "GET",
      'global': false,
      'url': "/stammdaten/keyword",
      'success': function (data) {
          keyword = data;
      }
    });
    return {"category": category.data, "keyword": keyword.data, "unit": unit.data, "storage_location": location};
  }();

  //create stock Popup
  var popup = $('<div/>', {'id':'PopUp'}).append(
    $('<form/>', {'action': '/stock'}).append(
      $('<div/>', {'class': 'PopUp_topBar'})
    ).append(
      $('<div/>', {'class': 'PopUp_middle'}).append(
        $('<table/>').append(
          $('<tr/>').append(
            $('<td/>', {'text': 'Artikel:'})
          ).append(
            $('<td/>').append(
              $('<input/>', {'type': 'text', 'id': 'name', 'name': 'name', 'maxlength': '20'})
            )
          ).append(
            $('<td/>', {'text': 'Ort:'})
          ).append(
            $('<td/>').append(
              $('<ul/>', {'id': 'location', 'class': 'navbar-nav border'}).append(
                $('<li/>', {'class': 'nav-item dropdown'}).append(
                  $('<span/>', {'class': 'nav-link dropdown-toggle', 'data-toggle': 'dropdown', 'text': 'Ort auswählen'})
                ).append(
                  $('<ul/>', {'class': 'dropdown-menu'})
                )
              )
            )
          )
        ).append(
          $('<tr/>').append(
            $('<td/>', {'text': 'Anzahl:'})
          ).append(
            $('<td/>', {'style': 'text-align:center'}).append(
              $('<input/>', {'type': 'number', 'id': 'number', 'name': 'number', 'min': '0', 'max': '10000'})
            )
          ).append(
            $('<td/>', {'text': 'Mindestanzahl:'})
          ).append(
            $('<td>').append(
              $('<input/>', {'type': 'number', 'id': 'minimum_number', 'name': 'minimum_number', 'min': '0', 'max': '10000'})
            )
          )
        ).append(
          $('<tr/>').append(
            $('<td/>', {'text': 'Kategorie:'})
          ).append(
            $('<td/>').append(
              $('<select/>', {'name': 'category', 'id': 'category', 'oninvalid': 'this.setCustomValidity(`Wählen Sie bitte eine Kategorie aus.\n Diese müssen vorher in den Stammdaten eingetragen werden.`)'})
            )
          ).append(
            $('<td/>', {'text': 'Stichwörter:'})
          ).append(
            $('<td/>').append(
              $('<div/>', {'class': 'select-wrapper'}).append(
                $('<span/>', {'class': 'autocomplete-select'})
              )
            )
          )
        ).append(
          $('<tr/>').append(
            $('<td/>', {'text': 'Einheit:'})
          ).append(
            $('<td/>').append(
              $('<select/>', {'name': 'unit', 'id': 'unit', 'oninvalid': 'this.setCustomValidity(`Wählen Sie bitte eine Einheit aus.\n Diese müssen vorher in den Stammdaten eingetragen werden.`)'})
            )
          )
        )
      )
    ).append(
      $('<div/>', {'class': 'PopUp_footer'}).append(
        $('<button/>', {'type': 'submit', 'id': 'PopUpSubmit', 'text': 'Speichern'})
      )
    )
  );

  popup.find("#name").prop("required", "true");
  popup.find("#name").attr("autocomplete", "off");
  popup.find("#number").prop("required", "true");
  popup.find("#minimum_number").prop("required", "true");
  popup.find("#category").prop("required", "true");
  popup.find("#unit").prop("required", "true");

  let ul = popup.find("#location").find("ul");

  const emptyPlaceIsZero = (currentValue) => currentValue.empty_places === 0;

  //handles clicks on the location tab in the popup
  $("body").on("click", "#location span", function(){
    //checks if there every 'emptyPlaces' property is 0 
    if(stammdaten.storage_location.every(emptyPlaceIsZero)){
      $("#location").parent().append(
        $("<span/>", {"id": "LocationNotification", "text": "Es sind keine freien Lagerplätze verfügbar."})
      );
    };
  })

  //displays all root locations in the popup
  $.each(stammdaten.storage_location, function(i, p){
    if(p.parent == 0){
      $(ul).append(
        $('<li/>').append(
          $('<span/>', {'class': 'dropdown-item', 'text': p.name, 'data-id': p.id, 'data-parent': p.parent, 'data-places': p.places, 'data-empty_places': p.empty_places})
        )
      );
      appendChild(p.id);
    }
  });
  
  //apply option tags for selection
  $.each(stammdaten.category, function(i, p) {
    popup.find('#category').append($('<option></option>').val(p.category).html(p.category));
  });

  $.each(stammdaten.unit, function(i, p) {
    popup.find('#unit').append($('<option></option>').val(p.unit).html(p.unit));
  });

  //append children locations in the popup
  function appendChild(parentId){
    $.get(`/lagerorte/parent/${parentId}`, function(data){

      if(data.length > 0){
        let parentSpan = $(ul).find(`*[data-id=${parentId}]`);
        $(parentSpan).addClass("submenuIcon");
        
        $(parentSpan).parent().append(
          $("<ul/>", {'class': 'submenu dropdown-menu'})
        );

        $.each(data, function(i, p){
            $(parentSpan).parent().find(".submenu").append(
              $("<li/>").append(
                $('<span/>', {'class': 'dropdown-item', 'text': p.name, 'data-id': p.id, 'data-parent': p.parent, 'data-places': p.places, 'data-empty_places': p.empty_places})
    
              )
            )
            appendChild(p.id);   
        });
      }else{
        removeEndNode(parentId);
      }
    })
  }

  //remove child nodes without free storage places
  function removeEndNode(nodeDataId){

    let endNode = popup.find(`[data-id='${nodeDataId}']`);
    let endNodeParent = $(endNode).data("parent");
    let parentUl = $(endNode).parent().parent();

    if($(endNode).data("empty_places") == 0){
      $(endNode).parent().remove();

      if(parentUl.children().length == 0){
        $(parentUl).remove();

        let parentNode = popup.find(`[data-id="${endNodeParent}"]`);
        $(parentNode).removeClass("submenuIcon");
        removeEndNode(endNodeParent);
      }
    }
  }

  //apply selected location to popup
  $("body").on("click", "#location ul li span", function(e){
    let locationHasFreeStoragePlaces = $(this).data("empty_places") > 0;
    if(locationHasFreeStoragePlaces){
      let name = $(this).text();
      let dataId = $(this).data("id");
      let dataParent = $(this).data("parent");
      let selectedItem = $("#location li span").first()[0];
  
      $(selectedItem).text(name);
      $(selectedItem).attr("data-id", dataId);
      $(selectedItem).attr("data-parent", dataParent);
    }    
  })

  //check if new Item already exists
  $("body").on("change, keyup", "#name", function () {
    let name = $("#name").val();
    let nameIsNotEmpty = /([^\s])/.test(name);

    let selectedName;
    $("#table tbody tr").each(function () {
      //get selected line
      if ($(this).hasClass("selected")) {
        //get name from selected row
        selectedName = ($(this).children().eq(1).html());
      };
    });

    let nameIsNotEqualToSelectedName = selectedName != name.replace(/\s/g, '');

    //Only check for a match if the input is not empty and not the same as in the selected row
    if (nameIsNotEmpty && nameIsNotEqualToSelectedName) {
      $.get(`/stock/name/${name}`, function (data) {
        if (data) {
          let noErrMsgExists = $("#notification").length == 0;
          if (noErrMsgExists) {
            $("#name")
              .parent()
              .append(
                "<br id='notificationBreak'><span id='notification'>Dieser Artikel extistiert bereits</span>"
              );
          }
          $(".ui-autocomplete").css("z-index", "0");
        }else{
          $("#notificationBreak").remove();
          $("#notification").remove();
        }
      });
    }
  });

  $("body").on("click", ".numberButton", function (e) {
    e.preventDefault();
    var number = $("#number").val();
    var sum = parseInt(number) + parseInt($(this).html());
    if (sum >= 0) {
      $("#number").val(sum);
    } else {
      $("#number").val(0);
    }

  });

  var KeywordsAutocomplete;

  $("#New").click(function () {
    popup = toCreatePopup(popup);
    $(".selected").removeClass('selected');
    selectHandler();
    $('#tableDiv').after(popup);
    popup.fadeIn();


    //apply multi dropdown field for keywords
    $('.select-pure__select').remove();
    $.ajax({
      url: 'stammdaten/keyword',
      success: function(data) {
          var optionsArr = [];
          for(var i = 0; i < data.data.length; i ++){
            optionsArr.push({"label": data.data[i].keyword, "value": data.data[i].keyword, "data-id": data.data[i].id});
          }
          KeywordsAutocomplete = new SelectPure(".autocomplete-select", {
            options: optionsArr,
            value: "",
            multiple: true,
            autocomplete: true,
            icon: "fa fa-times",
            onChange: value => {
                  var element = $(".select-pure__label");
                  $(element[0]).scrollTop(element[0].scrollHeight);
              },
            classNames: {
              select: "select-pure__select",
              dropdownShown: "select-pure__select--opened",
              multiselect: "select-pure__select--multiple",
              label: "select-pure__label",
              placeholder: "select-pure__placeholder",
              dropdown: "select-pure__options",
              option: "select-pure__option",
              autocompleteInput: "select-pure__autocomplete",
              selectedLabel: "select-pure__selected-label",
              selectedOption: "select-pure__option--selected",
              placeholderHidden: "select-pure__placeholder--hidden",
              optionHidden: "select-pure__option--hidden",
            }
          });
          var resetAutocomplete = function() {
            KeywordsAutocomplete.reset();
          };
        }
    });

    $("#name").focus();
    $("#cover").fadeIn();
  });

  $("#Edit").click(function () {
    
    var id;
    $("#table tbody tr").each(function () {
      if ($(this).hasClass("selected")) {
        //get marked line
        id = $(this).children().eq(1).html(); //get id from line
        id = id.replace(/ /g, ""); //cut spaces
        id = id.replace(/\r?\n|\r/g, "");
      };
    });
    var result = "";
    $.ajax({
      "async": false,
      "type": "GET",
      "global": false,
      "url": `/stock/${id}`,
      "success": function(data){
        result = {
          "name": data.name,
          "storage_location": data.storage_location,
          "storage_place": data.storage_place,
          "storage_parent": data.storage_parent,
          "storage_location_id": data.storage_location_id,
          "number": data.number,
          "minimum_number": data.minimum_number,
          "category": data.category,
          "keywords": data.keyword,
          "unit": data.unit
        };
      }
    })
    popup = toUpdatePopup(popup);
    $('#tableDiv').after(popup);
    popup.fadeIn();

    //apply multi dropdown field for keywords
    $('.select-pure__select').remove();
    $.ajax({
      url: 'stammdaten/keyword',
      success: function(data) {
          var optionsArr = [];
          for(var i = 0; i < data.data.length; i ++){
            optionsArr.push({"label": data.data[i].keyword, "value": data.data[i].keyword});
          }
          KeywordsAutocomplete = new SelectPure(".autocomplete-select", {
            options: optionsArr,
            value: result.keywords ? result.keywords.split(",") : "",
            multiple: true,
            autocomplete: true,
            icon: "fa fa-times",
            onChange: value => {
                  //var element = document.getElementsByClassName('.select-pure__label')[0];
                  //element.scrollTop = element.scrollHeight;
                  var element = $(".select-pure__label");
                  $(element[0]).scrollTop(element[0].scrollHeight);
              },
            classNames: {
              select: "select-pure__select",
              dropdownShown: "select-pure__select--opened",
              multiselect: "select-pure__select--multiple",
              label: "select-pure__label",
              placeholder: "select-pure__placeholder",
              dropdown: "select-pure__options",
              option: "select-pure__option",
              autocompleteInput: "select-pure__autocomplete",
              selectedLabel: "select-pure__selected-label",
              selectedOption: "select-pure__option--selected",
              placeholderHidden: "select-pure__placeholder--hidden",
              optionHidden: "select-pure__option--hidden",
            }
          });
          var resetAutocomplete = function() {
            KeywordsAutocomplete.reset();
          };
        }
    });

    let location = $("#location li span").first()[0];

    $("#name").val(result.name);
    $(location).text(result.storage_location);
    $(location).attr("data-id", result.storage_location_id);
    $(location).attr("data-parent", result.storage_parent);
    $("#number").val(result.number);
    $("#minimum_number").val(result.minimum_number);
    $("#category").val(result.category);
    $("#unit").val(result.unit);

    $("#cover").fadeIn();

  });

  function toCreatePopup(popup){
    popup.find(".PopUp_topBar").text("Neuen Artikel anlegen");
    popup.find(".PopUp_topBar").append('<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div>');
    popup.find("#location span").first().text("Ort auswählen");
    popup.find("#location span").first().attr("data-id", 0);
    popup.find("#location span").first().data("parent", 0);
    popup.find("form").prop("action", "/stock");
    popup.find(".numberButton").remove();
    $(popup.find("#minimum_number")).css("margin-bottom", "0");
    
    return popup;

  }

  function toUpdatePopup(popup){
    popup.find(".PopUp_topBar").text("Artikel bearbeiten");
    popup.find(".PopUp_topBar").append('<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div>')
    popup.find("form").prop("action", "/entry");

    popup.find(".numberButton").remove();
    $(popup.find("#minimum_number")).css("margin-bottom", "22px");

    popup.find("#number").after('<button class="numberButton">+10</button>');
    popup.find("#number").after('<button class="numberButton">+1</button>');
    popup.find("#number").after('<button class="numberButton">-1</button>');
    popup.find("#number").after('<button class="numberButton">-10</button>');

    return popup;
  }

  //triggers when click on the cover, navbar or close button on popup
  $("body").on("click", "#cover, .navbar, #mdiv",function () {
    //only do smth if the keyword dropdown in the stock popup is closed 
    if($(".select-pure__select--opened").length == 0){

      //closes all popups
      $("#PopUp").fadeOut(300, () => $("#PopUp").remove());
      $("#PopUpDelete").fadeOut(300, () => $("PopUpDelete").remove());
      $("#list_number_popup").fadeOut(300, () => $("#list_number_popup").remove());
      $("#list_popup").fadeOut(300, () => $("#list_popup").remove());
      //closes cover 
      $("#cover").fadeOut();
      $("#notification").fadeOut();

      //remove 
      // $(".Tags").remove();

      //clears all input field
      $("#PopUp input").each(function (i) {
        $(this).val("");
      });

      //clears the number buttons in edit popup
      $("#number, #minimum_number").parent().find("span").remove();
      $("#number , #minimum_number").parent().find("br").remove();

      $("#number , #minimum_number").css("border", "none");
      $("#number , #minimum_number").css("border-bottom", "1px solid rgb(0,60,121)");

      $("#keywords , #minimum_number").val("");
  }

  });

   //show popup if save icon was clicked
   $("#table").on("click", "td", function (e) {

    //only show popup if the td contains the save icon
    if(!$(this).find(".save").length){
      return;
    }

    //gets id of clicked row
    let id = $(this).parent().children().eq(1).html().trim();
    let name = $(this).parent().children().eq(2).html().trim();
    let num = $(this).parent().children().eq(3).html().trim();

    let list_number_popup = $(`
      <div id="list_number_popup">
        <form data-id="${id}">
          <div class="PopUp_topBar">${name} in Liste speichern<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div></div>
          <div class="PopUp_middle">
            <br>
            <input type="number" name="value" min="0" max="${num}"/>
            <br/>
            <div>
              <span>Einlagern</span>
              <label for="ein_auslagern" class="switch_list">
                <input id="ein_auslagern" onchange="updateMaxval(this, ${num})" name="auslagern" checked type="checkbox">
                <span class="slider_list round"></span>
              </label>
              <span>Auslagern</span>
            </div>
          </div>
          <div class="PopUp_footer">
            <button type="submit">
              Speichern
            </button>
          </div>
        </form>
      </div>
    `);

    $('#tableDiv').after(list_number_popup);
    list_number_popup.fadeIn();
    let input = $(list_number_popup).find("input").first();
    input.focus();
    input.val(1);
    $("#cover").fadeIn();


  });

  //updates the max attribute in the list_number popup
  function updateMaxval(ele, max){
    let input = $(ele).parent().parent().parent().find("input[type=number]");
    if(ele.checked){
      $(input).attr({"max": max});
    }else{
      $(input).attr({"max": 9999});
    };
  }

  //updates number in the list button
  function updateListNumber(){
    let list = localStorage.getItem("list");
    let number_of_listitems = 0;
    if(list !== null){
      number_of_listitems = JSON.parse(list).length;
    }
    $("#list span").text(number_of_listitems);
  };
  updateListNumber();

  //show popup if list button was clicked
  $("body").on("click", "#list", function(e){
    let list = JSON.parse(localStorage.getItem("list"));
    let tableData = '';

    //the popup that will be shown
    let list_popup = $(`
      <div id="list_popup">
        <form>
          <div class="PopUp_topBar">Artikelliste<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div></div>
          <div class="PopUp_middle">
            <table>
              <tr>
                <td>Artikelnummer</td>
                <td>Artikel</td>
                <td>Anzahl (aktuell)</td>
                <td>Ein-/Auslagern</td>
                <td>Menge</td>
                <td>Anzahl (danach)</td>
                <td>Mindestbestand</td>
                <td>Einheit</td>
                <td>Lagerort</td>
                <td>Lagerplatz</td>
                <td></td>
              </tr>
            </table>
          </div>
          <div id="qrcode"></div>
          <div class="PopUp_footer">
            <button id="qrSubmit" type="submit">
              QR-Code generieren
            </button>
          </div>
        </form>
      </div>
    `);
    //checks is session is empty
    if(list == null || list.length == 0){
      tableData = $(`<tr><td colspan="100">Speichern Sie Artikel ab, um sie hier einsehen zu können.</td></tr>`);
      $(list_popup).find("#qrSubmit").attr("disabled", true);
    }else{
      //fills tableData
      for(let i = 0; i < list.length; i++){
        let list_id = list[i]["id"];
        let select_in = "selected";
        let select_out ="selected";
        let out = list[i]["change"] < 0;
        (out) ? select_in = "" : select_out = "";

        table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
          var data = this.data();
          //if a table row matches with the session storage
          if(list_id == data.id){
            //adds a tr to tableData
            tableData += `
              <tr>
                <td class="id">${data.id}</td>
                <td>${data.name}</td>
                <td class="curr_val">${data.number}</td>
                <td>
                  <select>
                    <option value="in" ${select_in}>Einlagern</option>
                    <option value="out" ${select_out}>Auslagern</option>
                  </select>
                </td>
                <td><input class="amount" type="number" min="1" max="${(out) ? data.number : 9999}" value="${Math.abs(list[i]['change'])}"/></td>
                <td class="sum">0</td>
                <td class="min">${data.minimum_number}</td>
                <td>${data.unit}</td>
                <td>${data.storage_location}</td>
                <td>${data.storage_place}</td>
                <td class="delete"><i class="fas fa-trash"></i></td>
              </tr>
            `;
          };
        });
      }
    }

    //triggers if the list_popup dropdown or number input was changed
    $("body").on("change keyup", "#list_popup .amount, #list_popup select", function(e){
      let row = $(this).parent().parent();
      let id = row.find(".id").text();
      let num = parseInt(row.find(".amount").val());
      let curr_val = row.find(".curr_val").text();
      let select_val = row.find("select").val();
      let change = num;
      
      if(select_val == "out"){
        change = num * -1;
        row.find(".amount").attr({"max": curr_val});
        if(num > curr_val){
          row.find(".amount").val(curr_val);
        }
      }else{
        row.find(".amount").attr({"max": 9999});
        if(num > 9999){
          row.find(".amount").val(9999);
        }
      }
      let entry = {"id": id, "change": change};
      //add updated entry to storage
      addToList(entry);
      //calculate new sum
      calcListPopupSum();
    });

    $("body").on("click", "#list_popup", function(){
      $("#qrcode").text("");
    })

    list_popup.find("table").append(tableData);
    $('#tableDiv').after(list_popup);
    calcListPopupSum();
    list_popup.fadeIn();
    $("#cover").fadeIn();
    
  })

  //updates the sum td in the popup
  function calcListPopupSum(){
    let rows = $("#list_popup").find("tr");
    for(let i = 1; i < rows.length; i++){
      let current_val = parseInt($(rows[i]).find(".curr_val").text());
      let val = parseInt($(rows[i]).find(".amount").val());
      let select = $(rows[i]).find("select").val();
      let sum;

      sum = select == "in" ? current_val + val : current_val - val;
      
      sum = isNaN(sum) ? current_val : sum;
      $(rows[i]).find(".sum").text(sum);
    }
  }
// });
