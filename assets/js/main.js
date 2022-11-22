const checkForDuplicateArtNum = function (event) {
  const currentArtNum = parseInt(event.target.value);
  if (
    !currentArtNum || // if NaN
    currentArtNum < parseInt(event.target.min) ||
    currentArtNum > parseInt(event.target.max)
  ) {
    if (event.target.nextElementSibling) {
      $("#artNumNotificationBreak").remove();
      $("#artNumNotification").remove();
    }
    return;
  }
  const selectedRows = $("#table tbody tr.selected");
  if (
    selectedRows.length !== 0 &&
    selectedRows.children().eq(2).text() === currentArtNum.toString()
  ) {
    if (event.target.nextElementSibling) {
      $("#artNumNotificationBreak").remove();
      $("#artNumNotification").remove();
    }
    return;
  }
  $.ajax({
    async: false,
    method: "GET",
    url: `/api/stock/articlenumber/${currentArtNum}`,
    success: function (jqXHR, testStatus, error) {
      if (!event.target.nextElementSibling) {
        event.target.insertAdjacentHTML(
          "afterend",
          "<br id='artNumNotificationBreak'><span id='artNumNotification'>Diese Artikelnummer existiert bereits</span>"
        );
      }
      $(".ui-autocomplete").css("z-index", "0");
    },
    error: function (jqXHR, textStatus, error) {
      if (jqXHR.status === 404) {
        if (event.target.nextElementSibling) {
          $("#artNumNotificationBreak").remove();
          $("#artNumNotification").remove();
        }
      }
    },
  });
};

const submitFormByEnterKey = function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.target
      .closest("form")
      .getElementsByTagName("button")
      .namedItem("PopUpSubmit")
      .click();
  }
};

function stammdaten() {
  var location = null;
  var category = null;
  var unit = null;
  var keyword = null;

  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: "/api/storageLocation",
    success: function (data) {
      location = data;
    },
  });

  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: "/api/stammdaten/category",
    success: function (data) {
      category = data;
    },
  });

  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: "/api/stammdaten/unit",
    success: function (data) {
      unit = data;
    },
  });

  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: "/api/stammdaten/keyword",
    success: function (data) {
      keyword = data;
    },
  });
  return {
    category: category.data,
    keyword: keyword.data,
    unit: unit.data,
    storage_location: location,
  };
}

const buildSubTrees = function (rootLI, rootNodes) {
  let nodesAdded = false;
  for (const node of rootNodes) {
    const childNodes = stammdatenResult.storage_location.filter(
      (elem) => elem.parent === node.id
    );
    let LIEntry = $("<li/>", {
      "data-id": node.id,
      "data-parent": node.parent,
      "data-places": node.places,
      "data-empty_places": node.empty_places,
    });
    let childNodesExist = false;
    if (childNodes.length > 0) {
      LIEntry.append(
        '<div class="location_caret"></div><ul class="location_nested"></ul>'
      );
      LIEntry.children(".location_caret").text(node.name);
      childNodesExist = buildSubTrees(LIEntry, childNodes);
      if (!childNodesExist) {
        LIEntry.children().remove();
        LIEntry.text(node.name);
      }
    } else {
      LIEntry.text(node.name);
    }
    if (node.empty_places !== 0 || childNodesExist) {
      $(rootLI).children(".location_nested").append(LIEntry);
      nodesAdded = true;
    } else {
      console.log("not adding child node:", JSON.stringify(node, null, 2));
    }
  }
  return nodesAdded;
};

const buildNodeTree = function () {
  const rootNodes = stammdatenResult.storage_location.filter(
    (elem) => elem.parent === 0
  );
  for (const node of rootNodes) {
    const childNodes = stammdatenResult.storage_location.filter(
      (elem) => elem.parent === node.id
    );
    let LIEntry = $("<li/>", {
      "data-id": node.id,
      "data-parent": node.parent,
      "data-places": node.places,
      "data-empty_places": node.empty_places,
    });
    let childNodesExist = false;
    if (childNodes.length > 0) {
      LIEntry.append(
        '<div class="location_caret"></div><ul class="location_nested"></ul>'
      );
      LIEntry.children(".location_caret").text(node.name);
      childNodesExist = buildSubTrees(LIEntry, childNodes);
      if (!childNodesExist) {
        LIEntry.children().remove();
        LIEntry.text(node.name);
      }
    } else {
      LIEntry.text(node.name);
    }
    if (node.empty_places !== 0 || childNodesExist) {
      $(rootUL[0]).find(".location_nested").first().append(LIEntry);
    } else {
      console.log("not adding root node", JSON.stringify(node, null, 2));
    }
  }
};

//create stock Popup
let popup = $(`
  <div id="PopUp">
    <form>
      <div class="PopUp_topBar"></div>
      <div class="PopUp_middle">
        <table>
          <tr>
            <td>Artikel:</td>
            <td>
              <input type="text" id="name" name="name" maxlength="50" required autocomplete="off"/>
            </td>
            <td>Ort:</td>
            <td style="text-align:left">
              <ul id="myUL">
              <li>
                <div class="location_caret">Ort auswählen</div>
                <ul id="rootUL" class="location_nested">
                </ul>
              </li>
              </ul>
            </td>
          </tr>
          <tr>
            <td>Anzahl:</td>
            <td style="text-align: center">
              <input type="number" id="number" name="number" min="0" max="10000" required />
            </td>
            <td>Mindestanzahl:</td>
            <td>
              <input type="number" id="minimum_number" value="0" name="minimum_number" min="0" max="10000" required />
            </td>
          </tr>
          <tr>
            <td>Kategorie:</td>
            <td>
              <select name="category" id="category" oninvalid="this.setCustomValidity('Wählen Sie bitte eine Kategorie aus.\n Diese müssen vorher in den Stammdaten eingetragen werden.')" required></select>
            </td>
            <td>Stichwörter:</td>
            <td>
              <div class="select-wrapper">
                <span class="autocomplete-select" tabindex="0"></span>
              </div>
            </td>
          </tr>
          <tr>
            <td>Einheit:</td>
            <td>
              <select name="unit" id="unit" oninvalid="this.setCustomValidity('Wählen Sie bitte eine Einheit aus.\n Diese müssen vorher in den Stammdaten eingetragen werden.')" required></select>
            </td>
            <td> Artikelnummer:</td>
            <td>
              <input type="number" id="articlenumber" value="0" name="articlenumber" min="10000" max="999999" required />
            </td>
          </tr>
        </table>
      </div>
      <div class="PopUp_footer">
        <button type="submit" id="PopUpSubmit">
          Speichern
        </button>
      </div>
    </form>
  </div>
`);

//create inventur Popup
let inventurPopup = $(`
  <div id="InventurPopUp">
    <form>
      <div class="PopUp_topBar">
        Inventur durchführen
        <div id="mdiv"><div class="mdiv"><div class="md"></div></div></div>
      </div>
      <div class="PopUp_middle">
        <table>
          <tr>
            <td> Artikelnummer:</td>
            <td>
              <input type="number" id="articlenumber" value="0" name="articlenumber" min="10000" max="999999" required />
            </td>
            <td>Anzahl:</td>
            <td style="text-align: right">
              <input type="number" id="number" name="number" min="0" max="10000" required />
            </td>
          </tr>
        </table>
        <span id="InventurSuccess"></span>
        <span id="InventurError"></span>
      </div>
      <div class="PopUp_footer">
        <button type="submit" id="PopUpSubmit">
          Speichern
        </button>
      </div>
    </form>
  </div>
`);

const emptyPlaceIsZero = (currentValue) => currentValue.empty_places === 0;

//handles clicks on the location tab in the popup
$("body").on("click", ".location_caret:first-child", function (e) {
  checkForEmptyStoragePlaces();
});

let rootUL = popup.find("#myUL");

let stammdatenResult = stammdaten();
buildNodeTree();

function checkForEmptyStoragePlaces() {
  //checks if every 'emptyPlaces' property is 0
  if (stammdatenResult.storage_location.every(emptyPlaceIsZero)) {
    $("#LocationNotification").remove();
    //add error message
    $("#myUL")
      .parent()
      .append(
        $("<span/>", {
          id: "LocationNotification",
          text: "Es sind keine freien Lagerplätze verfügbar.",
        })
      );
  }
}

//apply option tags for selection
$.each(stammdatenResult.category, function (i, p) {
  popup
    .find("#category")
    .append($("<option></option>").val(p.category).html(p.category));
});

$.each(stammdatenResult.unit, function (i, p) {
  popup.find("#unit").append($("<option></option>").val(p.id).html(p.unit));
});

//apply selected location to popup
$("body").on("click", "#myUL li", function (e) {
  let locationHasFreeStoragePlaces = $(this).data("empty_places") > 0;
  if (locationHasFreeStoragePlaces) {
    let dataId = $(this).data("id");
    let dataParent = $(this).data("parent");

    var path = [];
    var el = $(this);

    do {
      if (el.children().length == 0) {
        path.unshift(el.text());
      } else {
        path.unshift(el.find("div").first().text());
      }
      el = el.parent().parent();
    } while (el.parent().attr("id") != "myUL");

    let location = $("#myUL").find("div").first();

    location.text(path.join("-"));
    location.attr("data-id", dataId);
    location.attr("data-parent", dataParent);
    location.attr("style", "color: black !important");

    return false;
  }
});

//toggle location classes on click
$("body").on("click", ".location_caret", function () {
  if ($("#myUL").children().length > 0) {
    this.parentElement
      .querySelector(".location_nested")
      .classList.toggle("active");
  }
});

//close location dropdown on outside click
$("body").on("click", "#PopUp", function (e) {
  let target = $(e.target);
  if (!target.is(".location_caret") && target.closest("#myUL").length == 0) {
    $("#rootUL").removeClass("active");
  }
});

//change cursor if no empty places are available
$("body").on("mouseenter", "#myUL li div", function (e) {
  if ($(this).parent().data("empty_places") == 0) {
    $(this).css("cursor", "default");
  }
});

//check if new Item already exists
$("body").on("change, keyup", "#name", function () {
  let name = $("#name").val();
  let nameIsNotEmpty = /([^\s])/.test(name);

  let selectedName;
  $("#table tbody tr").each(function () {
    //get selected line
    if ($(this).hasClass("selected")) {
      //get name from selected row
      selectedName = $(this).children().eq(3).html();
    }
  });

  let nameIsNotEqualToSelectedName = selectedName != name.replace(/\s/g, "");

  //Only check for a match if the input is not empty and not the same as in the selected row
  if (nameIsNotEmpty && nameIsNotEqualToSelectedName) {
    $.get(`/api/stock/name/${name}`, function (data) {
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
      } else {
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
  $(".selected").removeClass("selected");
  selectHandler();
  $("#tableDiv").after(popup);
  popup.fadeIn();
  checkForEmptyStoragePlaces();

  //apply multi dropdown field for keywords
  $(".select-pure__select").remove();
  $.ajax({
    url: "/api/stammdaten/keyword",
    success: function (data) {
      var optionsArr = [];
      for (var i = 0; i < data.data.length; i++) {
        optionsArr.push({
          label: data.data[i].keyword,
          value: data.data[i].keyword,
          "data-id": data.data[i].id,
        });
      }
      KeywordsAutocomplete = new SelectPure(".autocomplete-select", {
        options: optionsArr,
        value: "",
        multiple: true,
        autocomplete: true,
        icon: "fa fa-times",
        onChange: (value) => {
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
        },
      });
      var resetAutocomplete = function () {
        KeywordsAutocomplete.reset();
      };
    },
  });

  $("#PopUp form").on("keydown", submitFormByEnterKey);
  $("#articlenumber")[0].addEventListener("input", checkForDuplicateArtNum);
  $("#notificationBreak").remove();
  $("#notification").remove();
  $("#name").focus();
  $("#cover").fadeIn();
});

$("#Edit").click(function () {
  //get data from selected line
  var id;
  $("#table tbody tr").each(function () {
    if ($(this).hasClass("selected")) {
      //get marked line
      id = $(this).children().eq(1).html(); //get id from line
      id = id.replace(/ /g, ""); //cut spaces
      id = id.replace(/\r?\n|\r/g, "");
    }
  });
  var result = "";
  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: `/api/stock/${id}`,
    success: function (data) {
      result = {
        name: data.name,
        storage_location: data.storage_location,
        storage_place: data.storage_place,
        storage_parent: data.storage_parent,
        storage_location_id: data.storage_location_id,
        number: data.number,
        articlenumber: data.articlenumber,
        minimum_number: data.minimum_number,
        category: data.category,
        keywords: data.keyword,
        unit: data.unit_id,
      };
    },
  });
  popup = toUpdatePopup(popup);
  $("#tableDiv").after(popup);
  popup.fadeIn();

  //apply multi dropdown field for keywords
  $(".select-pure__select").remove();
  $.ajax({
    url: "/api/stammdaten/keyword",
    success: function (data) {
      var optionsArr = [];
      for (var i = 0; i < data.data.length; i++) {
        optionsArr.push({
          label: data.data[i].keyword,
          value: data.data[i].keyword,
        });
      }
      KeywordsAutocomplete = new SelectPure(".autocomplete-select", {
        options: optionsArr,
        value: result.keywords ? result.keywords.split(",") : "",
        multiple: true,
        autocomplete: true,
        icon: "fa fa-times",
        onChange: (value) => {
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
        },
      });
      var resetAutocomplete = function () {
        KeywordsAutocomplete.reset();
      };
    },
  });

  let location = $("#myUL").find("div").first();

  $("#name").val(result.name);
  $(location).text(result.storage_location);
  $(location).attr("data-id", result.storage_location_id);
  $(location).attr("data-parent", result.storage_parent);
  $("#number").val(result.number);
  $("#articlenumber").val(result.articlenumber);
  $("#minimum_number").val(result.minimum_number);
  $("#category").val(result.category);
  $("#unit").val(result.unit);
  $("#articlenumber")[0].addEventListener("input", checkForDuplicateArtNum);
  $("#PopUp form").on("keydown", submitFormByEnterKey);

  $("#cover").fadeIn();
});

$("#Inventur").click(function () {
  $(".selected").removeClass("selected");
  selectHandler();
  $("#tableDiv").after(inventurPopup);
  inventurPopup.fadeIn();

  $("#articlenumber").focus();
  $("#cover").fadeIn();
  $("#InventurPopUp form")[0].addEventListener("keydown", submitFormByEnterKey);
});

function toCreatePopup(popup) {
  popup.find(".PopUp_topBar").text("Neuen Artikel anlegen");
  popup
    .find(".PopUp_topBar")
    .append(
      '<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div>'
    );
  popup.find("#location div").first().text("Ort auswählen");
  popup.find("#location div").first().attr("data-id", 0);
  popup.find("#location div").first().data("parent", 0);
  popup.find(".numberButton").remove();
  $(popup.find("#minimum_number")).css("margin-bottom", "0");

  return popup;
}

function toUpdatePopup(popup) {
  popup.find(".PopUp_topBar").text("Artikel bearbeiten");
  popup
    .find(".PopUp_topBar")
    .append(
      '<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div>'
    );

  popup.find(".numberButton").remove();
  $(popup.find("#minimum_number")).css("margin-bottom", "22px");

  popup.find("#number").after('<button class="numberButton">+10</button>');
  popup.find("#number").after('<button class="numberButton">+1</button>');
  popup.find("#number").after('<button class="numberButton">-1</button>');
  popup.find("#number").after('<button class="numberButton">-10</button>');

  return popup;
}

//redirect if log icon was clicked
$("#table").on("click", ".log", function (e) {
  //gets id of clicked row
  let id = $(this).parent().parent().children().eq(1).html().trim();
  window.location.href = `/logs/${id}`;
});

//hanlde list_number popup submit
$("body").on("submit", "#list_number_popup form", function (event) {
  event.preventDefault();
  let id = $(this).data("id");
  let change = $(this).serializeArray()[0].value;

  //check if the toggle was checked
  if ($(this).serializeArray().length == 2) {
    change = (change * -1).toString();
  }

  //create list entry to store in cookies
  let newEntry = { id: id, change: change };
  addToList(newEntry);

  $(this)
    .parent()
    .fadeOut(300, () => $(this).parent().remove());
  $("#cover").fadeOut();

  //ui.js
  updateListNumber();
});

//trigggers if the trash icon in the list_popup was clicked
$("body").on("click", "#list_popup .PopUp_middle .fa-trash", function (e) {
  let row = $(this).parent().parent();
  let id = row.find(".id").html();
  let storage_old = JSON.parse(localStorage.getItem("list"));
  //filter sesseionStorage to remove the clicked element
  let storage_filtered = storage_old.filter((obj) => obj.id != id);
  //save changes to session
  localStorage.setItem("list", JSON.stringify(storage_filtered));
  //remove row from popup
  row.remove();

  if (storage_filtered.length == 0) {
    $("#list_popup")
      .find("table")
      .append(
        $(
          `<tr><td colspan="100">Speichern Sie Artikel ab, um sie hier einsehen zu können.</td></tr>`
        )
      );
    $("#list_popup").find("#qrSubmit").attr("disabled", true);
  }
  //ui.js
  updateListNumber();
});

//stores on list entry in cookies
function addToList(entry) {
  let list = localStorage.getItem("list");
  let newList = [];

  if (list == null) {
    newList[0] = entry;
  } else {
    newList = JSON.parse(list);
    //delete duplicate entries
    newList = newList.filter((obj) => obj.id != entry.id);
    newList.push(entry);
  }
  localStorage.setItem("list", JSON.stringify(newList));
}

function clearList() {
  localStorage.removeItem("list");
  updateListNumber();
  $("#list_popup").find("table tr").not(":first").remove();
  $("#list_popup")
    .find("table")
    .append(
      $(
        `<tr><td colspan="100">Speichern Sie Artikel ab, um sie hier einsehen zu können.</td></tr>`
      )
    );
  $("#list_popup").find("#qrSubmit").attr("disabled", true);
}

//handle stock popup submit
$("body").on("submit", "#PopUp form", function (event) {
  event.preventDefault();
  let id;
  //only define id if a row is selected
  if ($(".selected").length > 0) {
    id = $(".selected").find("td")[1].innerHTML;
  }

  //get all values from popup
  var articlenumber = $("#articlenumber").val();
  var name = $("#name").val();
  var location = $("#myUL").find("div").first().attr("data-id");
  var number = $("#number").val();
  var minimum_number = $("#minimum_number").val();
  var category = $("#category").val();
  var keywords = $(".select-pure__selected-label");
  var keywordArr = [];
  var unit = $("#unit").val();
  $(keywords).each(function (i) {
    keywordArr.push($(this).first().text());
  });

  //only submit if a location was selected
  if (location > 0) {
    var formdata = `id=${id}&articlenumber=${articlenumber}&name=${name}&location=${location}&number=${number}&minimum_number=${minimum_number}&category=${category}&keywords=${keywordArr}&unit=${unit}`;
    if (typeof id === "undefined") {
      $.post("/api/stock", formdata, function (response) {
        //load new data
        table.ajax.reload();
        //close popup
        $("#mdiv").click();

        //find and show the new row
        table.order([1, "desc"]).draw();

        $("#rootUL").text("");
        stammdatenResult = stammdaten();
        buildNodeTree();
      });
    } else {
      $.ajax({
        type: "PATCH",
        url: "/api/stock",
        data: formdata,
        processData: false,
        contentType: "application/x-www-form-urlencoded",
        success: function () {
          //load new data
          table.ajax.reload();
          //close popup
          $("#mdiv").click();

          //find and show the new row
          table.order([1, "desc"]).draw();

          $("#rootUL").text("");
          stammdatenResult = stammdaten();
          buildNodeTree();
        },
      });
    }
  } else {
    $("#myUL").find("div").first().attr("style", "color: red !important");
  }
});

//handle inventur popup submit
$("body").on("submit", "#InventurPopUp form", function (event) {
  event.preventDefault();
  //get all values from popup
  var articlenumber = $("#articlenumber").val();
  var number = $("#number").val();

  var formdata = `articlenumber=${articlenumber}&number=${number}`;
  $.ajax({
    type: "PATCH",
    url: "/api/updateStockNumber",
    data: formdata,
    processData: false,
    contentType: "application/x-www-form-urlencoded",
    success: function (jqXHR, textStatus, error) {
      //clear error message
      $("#InventurError").text("");
      // show success message
      $("#InventurSuccess").text(
        `Artikel mit Artikelnummmer ${articlenumber} wurde aktualisiert.`
      );
      //load new data
      table.ajax.reload();
      $("#articlenumber").val("");
      $("#number").val("");
      $("#articlenumber").focus();
    },
    error: function (jqXHR, textStatus, error) {
      $("#InventurSuccess").text("");
      $("#InventurError").text(
        jqXHR?.status
          ? "Artikelnummer nicht gefunden!"
          : "Es ist ein Fehler aufgetreten."
      );
    },
  });
});

//generate qr code
$("body").on("submit", "#list_popup form", function (e) {
  e.preventDefault();
  let rows = $(this).find("tr");
  let list = [];
  for (let i = 1; i < rows.length; i++) {
    let article_id = $(rows[i]).find(".id").text();
    let select = $(rows[i]).find("select").val();
    let amount = $(rows[i]).find(".amount").val();
    list.push({
      stock_id: article_id,
      lay_in: select == "in" ? true : false,
      amount: amount,
    });
  }
  $.post("/api/mobileList", { list: JSON.stringify(list) }, function (data) {
    $("#qrcode").text("");
    new QRCode(document.getElementById("qrcode"), data);
    $("#qrcode").append(`<div><a href="${data}">${data}</a></div>`);
    $("#qrcode").show();
    clearList();
  });
});

//show popup if save icon was clicked
$("#table").on("click", "td", function (e) {
  //only show popup if the td contains the save icon
  if (!$(this).find(".save").length) {
    return;
  }

  //gets id of clicked row
  let id = $(this).parent().children().eq(1).html().trim();
  let name = $(this).parent().children().eq(3).html().trim();
  let num = $(this).parent().children().eq(4).html().trim();

  let errMsg =
    "Kann nicht ausgelagert werden, da kein ausreichender Bestand vorliegt";
  if (num > 0) {
    errMsg = "";
  }
  let list_number_popup = $(`
      <div id="list_number_popup">
        <form data-id="${id}">
          <div class="PopUp_topBar">${name} in Liste speichern<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div></div>
          <div class="PopUp_middle">
            <br>
            <input type="number" name="value" min="1" max="${num}"/>
            <br/>
            <div>
              <span>Einlagern</span>
              <label for="ein_auslagern" class="switch_list">
                <input id="ein_auslagern" onchange="updateMaxval(this, ${num})" name="auslagern" checked type="checkbox">
                <span class="slider_list round"></span>
              </label>
              <span>Auslagern</span>
            </div>
            <span style="color:red">${errMsg}</span>
          </div>
          <div class="PopUp_footer">
            <button type="submit">
              Speichern
            </button>
          </div>
        </form>
      </div>
    `);

  $("#tableDiv").after(list_number_popup);
  list_number_popup.fadeIn();
  let input = $(list_number_popup).find("input").first();
  input.focus();
  input.val(1);
  $("#cover").fadeIn();
});

//updates the max attribute in the list_number popup
function updateMaxval(ele, max) {
  let middle = $(ele).parent().parent().parent();
  let input = middle.find("input[type=number]");
  let span = middle.find("span").last();
  if (ele.checked) {
    $(input).attr({ max: max });
    if (max == 0) {
      span.html(
        "Kann nicht ausgelagert werden, da kein ausreichender Bestand vorliegt"
      );
    }
  } else {
    $(input).attr({ max: 9999 });
    span.html("");
  }
}

//updates number in the list button
function updateListNumber() {
  let list = localStorage.getItem("list");
  let number_of_listitems = 0;
  if (list !== null) {
    number_of_listitems = JSON.parse(list).length;
  }
  $("#list span").text(number_of_listitems);
}
updateListNumber();

//show popup if list button was clicked
$("body").on("click", "#list", function (e) {
  let list = JSON.parse(localStorage.getItem("list"));
  let tableData = "";

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
  if (list == null || list.length == 0) {
    tableData = $(
      `<tr><td colspan="100">Speichern Sie Artikel ab, um sie hier einsehen zu können.</td></tr>`
    );
    $(list_popup).find("#qrSubmit").attr("disabled", true);
  } else {
    //fills tableData
    for (let i = 0; i < list.length; i++) {
      let task_id = list[i]["id"];
      let select_in = "selected";
      let select_out = "selected";
      let out = list[i]["change"] < 0;
      out ? (select_in = "") : (select_out = "");

      table.rows().every(function (rowIdx, tableLoop, rowLoop) {
        var data = this.data();
        //if a table row matches with the session storage
        if (task_id == data.id) {
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
                <td><input class="amount" type="number" min="1" max="${
                  out ? data.number : 9999
                }" value="${Math.abs(list[i]["change"])}"/></td>
                <td class="sum">0</td>
                <td class="min">${data.minimum_number}</td>
                <td>${data.unit}</td>
                <td>${data.storage_location}</td>
                <td>${data.storage_place}</td>
                <td class="delete"><i class="fas fa-trash"></i></td>
              </tr>
            `;
        }
      });
    }
  }

  //triggers if the list_popup dropdown or number input was changed
  $("body").on(
    "change keyup",
    "#list_popup .amount, #list_popup select",
    function (e) {
      let row = $(this).parent().parent();
      let id = row.find(".id").text();
      let num = parseInt(row.find(".amount").val());
      let curr_val = row.find(".curr_val").text();
      let select_val = row.find("select").val();
      let change = num;

      if (select_val == "out") {
        change = num * -1;
        row.find(".amount").attr({ max: curr_val });
        if (num > curr_val) {
          row.find(".amount").val(curr_val);
        }
      } else {
        row.find(".amount").attr({ max: 9999 });
        if (num > 9999) {
          row.find(".amount").val(9999);
        }
      }
      let entry = { id: id, change: change };
      //add updated entry to storage
      addToList(entry);
      //calculate new sum
      calcListPopupSum();
    }
  );

  $("body").on("click", "#list_popup", function (e) {
    if (!$(e.target).is("img")) {
      $("#qrcode").text("");
      $("#qrcode").hide();
    }
  });

  list_popup.find("table").append(tableData);
  $("#tableDiv").after(list_popup);
  calcListPopupSum();
  list_popup.fadeIn();
  $("#cover").fadeIn();
});

//updates the sum td in the popup
function calcListPopupSum() {
  let rows = $("#list_popup").find("tr");
  for (let i = 1; i < rows.length; i++) {
    let current_val = parseInt($(rows[i]).find(".curr_val").text());
    let val = parseInt($(rows[i]).find(".amount").val());
    let select = $(rows[i]).find("select").val();
    let sum;

    sum = select == "in" ? current_val + val : current_val - val;

    sum = isNaN(sum) ? current_val : sum;
    $(rows[i]).find(".sum").text(sum);
  }
}
