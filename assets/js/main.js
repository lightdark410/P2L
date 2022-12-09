




let duplicateArtNumRequestTracker;
const checkForDuplicateArtNum = function (event) {
  const currentArtNum = parseInt(event.target.value);
  if (
    isNaN(currentArtNum) ||
    currentArtNum < parseInt(event.target.min) ||
    currentArtNum > parseInt(event.target.max)
  ) {
    if (event.target.nextElementSibling) {
      $("#artNumNotificationBreak").remove();
      $("#artNumNotification").remove();
    }
    return;
  }
  const selectedID = $("#table tbody tr.selected td.stock-art-num");
  if (
    selectedID.length !== 0 &&
    selectedID.text() === currentArtNum.toString()
  ) {
    if (event.target.nextElementSibling) {
      $("#artNumNotificationBreak").remove();
      $("#artNumNotification").remove();
    }
    return;
  }
  if (duplicateArtNumRequestTracker) {
    duplicateArtNumRequestTracker.abort();
  }
  duplicateArtNumRequestTracker = $.ajax({
    method: "GET",
    url: `/api/stock/articlenumber/${currentArtNum}`,
    success: function (jqXHR, textStatus, error) {
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
    complete: function () {
      duplicateArtNumRequestTracker = null;
    },
  });
};

let duplicateArtNameRequestTracker;
// TODO: refactor this API endpoint to properly return 404 if not found etc.
const checkForDuplicateArtName = function (event) {
  const currentArtName = event.target.value;
  if (currentArtName === "") {
    if (event.target.nextElementSibling) {
      $("#notificationBreak").remove();
      $("#notification").remove();
    }
    return;
  }
  const selectedName = $("#table tbody tr.selected td.stock-art-name");
  if (selectedName.length !== 0 && selectedName.text() === currentArtName) {
    if (event.target.nextElementSibling) {
      $("#notificationBreak").remove();
      $("#notification").remove();
    }
    return;
  }
  if (duplicateArtNameRequestTracker) {
    duplicateArtNameRequestTracker.abort();
  }
  duplicateArtNameRequestTracker = $.ajax({
    method: "GET",
    url: `/api/stock/name/${currentArtName}`,
    success: function (jqXHR, textStatus, error) {
      if (jqXHR) {
        if (!event.target.nextElementSibling) {
          event.target.insertAdjacentHTML(
            "afterend",
            "<br id='notificationBreak'><span id='notification'>Dieser Artikel extistiert bereits</span>"
          );
          $(".ui-autocomplete").css("z-index", "0");
        }
      } else {
        if (event.target.nextElementSibling) {
          $("#notificationBreak").remove();
          $("#notification").remove();
        }
      }
    },
    error: function (jqXHR, textStatus, error) {
      if (jqXHR.status === 404) {
        if (event.target.nextElementSibling) {
          $("#notificationBreak").remove();
          $("#notification").remove();
        }
      }
    },
    complete: function () {
      duplicateArtNameRequestTracker = null;
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

let KeywordsAutocomplete;

const keywordsSelectOptions = {
  options: [],
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
};
const stammdatenResult = {};

const getStorageLocationTree = function () {
  return $.ajax({
    type: "GET",
    global: false,
    url: "/api/storageLocation",
  });
};

const getCategoryList = function () {
  return $.ajax({
    type: "GET",
    global: false,
    url: "/api/stammdaten/category",
  });
};

const getUnitList = function () {
  return $.ajax({
    type: "GET",
    global: false,
    url: "/api/stammdaten/unit",
  });
};

const getKeywordList = function () {
  return $.ajax({
    type: "GET",
    global: false,
    url: "/api/stammdaten/keyword",
  });
};

const buildSubTrees = function (locationTree, rootLI, rootNodes) {
  let nodesAdded = false;
  for (const node of rootNodes) {
    const childNodes = locationTree.filter((elem) => elem.parent === node.id);
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
      childNodesExist = buildSubTrees(locationTree, LIEntry, childNodes);
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
    }
  }
  return nodesAdded;
};

const buildNodeTree = function (locationTree) {
  const rootNodes = locationTree.filter((elem) => elem.parent === 0);
  for (const node of rootNodes) {
    const childNodes = locationTree.filter((elem) => elem.parent === node.id);
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
      childNodesExist = buildSubTrees(locationTree, LIEntry, childNodes);
      if (!childNodesExist) {
        LIEntry.children().remove();
        LIEntry.text(node.name);
      }
    } else {
      LIEntry.text(node.name);
    }
    if (node.empty_places !== 0 || childNodesExist) {
      $(rootUL[0]).find(".location_nested").first().append(LIEntry);
    }
  }
};

// TODO: refactor this API endpoint
getStorageLocationTree().then((locationTree) => {
  stammdatenResult.storage_location = locationTree;
  buildNodeTree(locationTree);
});

getCategoryList().then((response) => {
  stammdatenResult.category = response.data;
  for (const cat of response.data) {
    popup
      .find("#category")
      .append($("<option></option>").val(cat.category).html(cat.category));
  }
});

getUnitList().then((response) => {
  stammdatenResult.unit = response.data;
  for (const unit of response.data) {
    popup
      .find("#unit")
      .append($("<option></option>").val(unit.id).html(unit.unit));
  }
});

getKeywordList().then((response) => {
  stammdatenResult.keywords = response.data;
  for (const keyword of response.data) {
    keywordsSelectOptions.options.push({
      label: keyword.keyword,
      value: keyword.keyword,
      "data-id": keyword.id,
    });
  }
});

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

const rootUL = popup.find("#myUL");

//handles clicks on the location tab in the popup
$("body").on("click", ".location_caret:first-child", function (e) {
  checkForEmptyStoragePlaces();
});

function checkForEmptyStoragePlaces() {
  //checks if every 'emptyPlaces' property is 0
  if (
    stammdatenResult.storage_location.every((loc) => loc.empty_places === 0)
  ) {
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

//apply selected location to popup
// TODO: rewrite this once the corresponding API endpoint is rewritten
$("body").on("click", "#myUL li", function (e) {
  if ($(this).data("empty_places") > 0) {
    const dataId = $(this).data("id");
    const dataParent = $(this).data("parent");

    const path = [];
    let el = $(this);

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
  const target = $(e.target);
  if (!target.is(".location_caret") && target.closest("#myUL").length == 0) {
    $("#rootUL").removeClass("active");
  }
});

//change cursor if no empty places are available
$("body").on("mouseenter", "#myUL li div", function (e) {
  if ($(this).parent().data("empty_places") === 0) {
    $(this).css("cursor", "default");
  }
});

//check if new Item already exists
$("body").on("input", "#name", checkForDuplicateArtName);

$("body").on("click", ".numberButton", function (e) {
  e.preventDefault();
  const number = $("#number").val();
  const sum = parseInt(number) + parseInt($(this).html());
  $("#number").val(Math.max(sum, 0));
});

$("#New").click(function () {
  popup = toCreatePopup(popup);
  $(".selected").removeClass("selected");
  selectHandler();
  $("#tableDiv").after(popup);
  checkForEmptyStoragePlaces();

  //apply multi dropdown field for keywords
  $(".select-pure__select").remove();
  keywordsSelectOptions.value = "";
  KeywordsAutocomplete = new SelectPure(
    ".autocomplete-select",
    keywordsSelectOptions
  );

  $("#PopUp form").on("keydown", submitFormByEnterKey);
  $("#articlenumber")[0].addEventListener("input", checkForDuplicateArtNum);
  $("#name")[0].addEventListener("input", checkForDuplicateArtName);
  $("#name").focus();
  popup.fadeIn();
  $("#cover").fadeIn();
});

$("#Edit").click(function () {
  //get ID from selected line
  const id = $("#table tbody tr.selected td.stock-id").text();
  popup = toUpdatePopup(popup);
  $("#tableDiv").after(popup);
  $.ajax({
    type: "GET",
    global: false,
    url: `/api/stock/${id}`,
  }).then((response) => {
    //apply multi dropdown field for keywords
    $(".select-pure__select").remove();
    keywordsSelectOptions.value = response.keyword?.split(",") ?? "";
    KeywordsAutocomplete = new SelectPure(
      ".autocomplete-select",
      keywordsSelectOptions
    );

    const location = $("#myUL").find("div").first();

    $("#name").val(response.name);
    $(location).text(response.storage_location);
    $(location).attr("data-id", response.storage_location_id);
    $(location).attr("data-parent", response.storage_parent);
    $("#number").val(response.number);
    $("#articlenumber").val(response.articlenumber);
    $("#minimum_number").val(response.minimum_number);
    $("#category").val(response.category);
    $("#unit").val(response.unit_id);
  });

  $("#articlenumber")[0].addEventListener("input", checkForDuplicateArtNum);
  $("#name")[0].addEventListener("input", checkForDuplicateArtName);
  $("#PopUp form").on("keydown", submitFormByEnterKey);

  $("#cover").fadeIn();
  popup.fadeIn();
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
  const id = $(this).closest("tr").find("td.stock-id").text();
  window.location.href = `/logs/${id}`;
});

//hanlde list_number popup submit
$("body").on("submit", "#list_number_popup form", function (event) {
  event.preventDefault();
  const id = $(this).data("id");
  const change =
    $(this).find("input.list-add-amount").val() *
    ($(this).find("input#ein_auslagern")[0].checked ? -1 : 1); // negate if we're taking out

  // create list entry to store in local storage
  addToList({ id: id, change: change });

  $(this)
    .parent()
    .fadeOut(300, () => $(this).parent().remove());
  $("#cover").fadeOut();

  updateListNumber();
});

//trigggers if the trash icon in the list_popup was clicked
$("body").on("click", "#list_popup .PopUp_middle .fa-trash", function (e) {
  const row = $(this).closest("tr");
  const id = parseInt(row.find(".id").text());
  const storage_old = JSON.parse(localStorage.getItem("list"));
  //filter sesseionStorage to remove the clicked element
  const storage_filtered = storage_old.filter((obj) => obj.id !== id);
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
  updateListNumber();
});

//stores on list entry in local storage
function addToList(entry) {
  const list = localStorage.getItem("list");
  let newList = JSON.parse(list) ?? [];
  newList = newList.filter((elem) => elem.id !== entry.id);
  newList.push(entry);

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
  const id = $("table tr.selected td.stock-id").text();

  //get all values from popup
  const articlenumber = $("#articlenumber").val();
  const name = $("#name").val();
  const location = $("#myUL").find("div").first().attr("data-id");
  const number = $("#number").val();
  const minimum_number = $("#minimum_number").val();
  const category = $("#category").val();
  const keywords = $(".select-pure__selected-label");
  const keywordArr = [];
  const unit = $("#unit").val();
  $(keywords).each(function (i) {
    keywordArr.push($(this).first().text());
  });

  //only submit if a location was selected
  if (location > 0) {
    const formdata = `id=${id}&articlenumber=${articlenumber}&name=${name}&location=${location}&number=${number}&minimum_number=${minimum_number}&category=${category}&keywords=${keywordArr}&unit=${unit}`;
    if (id === "") {
      $.post("/api/stock", formdata, function (response) {
        //load new data
        table.ajax.reload();
        //close popup
        $("#mdiv").click();

        //find and show the new row
        table.order([1, "desc"]).draw();

        $("#rootUL").text("");
        getStorageLocationTree().then((locationTree) => {
          stammdatenResult.storage_location = locationTree;
          buildNodeTree(locationTree);
        });
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
          getStorageLocationTree().then((locationTree) => {
            stammdatenResult.storage_location = locationTree;
            buildNodeTree(locationTree);
          });
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
  const articlenumber = $("#articlenumber").val();
  const number = $("#number").val();

  const formdata = `articlenumber=${articlenumber}&number=${number}`;
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
//and sends request rto api 
$("body").on("submit", "#list_popup form", function (e) {
  e.preventDefault();
  const rows = $(this).find(".article tbody tr");
  const list = [];
  for (const row of rows) {
    const article_id   = $(row).find(".id").text();
    const select       = $(row).find("select").val();
    const amount       = $(row).find(".amount").val();

    list.push({
      stock_id: article_id,
      lay_in: select == "in" ? true : false,
      amount: amount,
    });
  }
  $.post("/api/createTask", { list: JSON.stringify(list) }, function (data) {
    $("#qrcode").text("");
    new QRCode(document.getElementById("qrcode"), data);
    $("#qrcode").append(`<div><a href="${data}">${data}</a></div>`);
    $("#qrcode").show();
    clearList();
  });
});

//show popup if save icon was clicked
$("#table").on("click", "td.stock-save-icon", function (e) {
  //only show popup if the td contains the save icon
  if (!$(this).find(".save").length) {
    return;
  }

  //gets id of clicked row
  const id   = $(this).closest("tr").find("td.stock-id").text();
  const name = $(this).closest("tr").find("td.stock-art-name").text();
  const num  = $(this).closest("tr").find("td.stock-amount").text();

  const errMsg =
    num > 0
      ? ""
      : "Kann nicht ausgelagert werden, da kein ausreichender Bestand vorliegt";
  const list_number_popup = $(`
      <div id="list_number_popup">
        <form data-id="${id}">
          <div class="PopUp_topBar">${name} in Liste speichern<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div></div>
          <div class="PopUp_middle">
            <br>
            <input class="list-add-amount" type="number" name="value" min="1" max="${num}"/>
            <br/>
            <div>
              <span>Einlagern</span>
              <label for="ein_auslagern" class="switch_list">
                <input id="ein_auslagern" onchange="updateMaxval(this, ${num})" name="auslagern" checked type="checkbox">
                <span class="slider_list round"></span>
              </label>
              <span>Auslagern</span>
            </div>
            <span class="list-error-span" style="color:red">${errMsg}</span>
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
  const input = $(list_number_popup).find("input").first();
  input.focus();
  input.val(1);
  $("#cover").fadeIn();
});

//updates the max attribute in the list_number popup
function updateMaxval(ele, max) {
  const middle = $(ele).closest(".PopUp_middle");
  const input  = middle.find("input.list-add-amount");
  const span   = middle.find("span.list-error-span");

  if (ele.checked) {
    $(input).attr({ max: max });
    if (max === 0) {
      span.html(
        "Kann nicht ausgelagert werden, da kein ausreichender Bestand vorliegt"
      );
    }
  } else {
    $(input).attr({ max: "" });
    span.html("");
  }
}

//updates number in the list button
function updateListNumber() {
  const list = localStorage.getItem("list");
  const number_of_listitems = JSON.parse(list)?.length ?? 0;
  $("#list span").text(number_of_listitems);
}
updateListNumber();

//show popup if list button was clicked
$("body").on("click", "#list", function (e) {
  const list = JSON.parse(localStorage.getItem("list"));
  let tableData = "";
  let orderTableData="";


  //the popup that will be shown
  const list_popup = $(`
      <div id="list_popup">
        <form>
          <div class="PopUp_topBar">Artikelliste<div id="mdiv"><div class="mdiv"><div class="md"></div></div></div></div>
          <div class="PopUp_middle">
          <table class="order">
              <thead>
                <tr>
                  <td>Besteller</td>
                  <td>Bestellnummer</td>
                  <td></td>
                </tr>
              </thead>
              <tbody></tbody>
            </table>

            <table class="article" >
              <thead>
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
              </thead>
              <tbody>
              </tbody>
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
  if (list === null || list.length === 0) {
    tableData = $(
      `<tr><td colspan="100">Speichern Sie Artikel ab, um sie hier einsehen zu können.</td></tr>`
    );
    $(list_popup).find("#qrSubmit").attr("disabled", true);

  } else {
    orderTableData += ` 
        <tr>
            <td>
                <input type="text" class="orderer" max = "60" min="3" placeholder="Max Mustermann" required>
            </td>
            <td>
                <input type="number" class="order-number" max = "9999" min="1" placeholder="1234" required>
            </td>
        </tr>`;
      
    //fills tableData(for the articles)
    for (const elem of list) {
      const entry_id = elem["id"];
      const lay_in   = elem["change"] <= 0;
      
      const select_in  = lay_in ? "" : "selected";
      const select_out = !lay_in ? "" : "selected";


      //selects the big table from "Artikelstamm" and compares the ids in order to select the correct data
      $("#table")
        .DataTable()
        .rows()
        .every(function (rowIdx, tableLoop, rowLoop) {
          const data = this.data();
          //if a table row matches with the session storage
          if (entry_id == data.id) {
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
                <td>
                  <input
                    class="amount"
                    type="number"
                    min="1"
                    max="${lay_in ? data.number : ""}"
                    value="${Math.abs(elem["change"])}"
                  />
                </td>
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
    "change input",
    "#list_popup .amount, #list_popup select",
    function (e) {
      const row      = $(this).closest("tr");
      const id       = parseInt(row.find(".id").text());
      const num      = parseInt(row.find(".amount").val());
      const curr_val = row.find(".curr_val").text();
      const select_val = row.find("select").val();
      let change = num;

      if (select_val == "out") {
        change = num * -1;
        row.find(".amount").attr({ max: curr_val });
        if (num > curr_val) {
          row.find(".amount").val(curr_val);
        }
      } else {
        row.find(".amount").attr({ max: "" });
      }
      //add updated entry to storage
      addToList({ id: id, change: change });
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

  //displays the table ionside of the popup
  list_popup.find(".article tbody").append(tableData);
  list_popup.find(".order tbody").append(orderTableData);


  $("#tableDiv").after(list_popup);
  calcListPopupSum();
  list_popup.fadeIn();
  $("#cover").fadeIn();
});

//updates the sum td in the popup
function calcListPopupSum() {
  const rows = $("#list_popup").find("tr");
  for (const row of rows) {
    const current_val = parseInt($(row).find(".curr_val").text());
    const val         = parseInt($(row).find(".amount").val());
    const select      = $(row).find("select").val();
    const sum = select == "in" ? current_val + val : current_val - val;

    $(row)
      .find(".sum")
      .text(isNaN(sum) ? current_val : sum);
  }
}

//search for warn rows
$.fn.dataTable.ext.search.push(function (
  settings,
  searchData,
  dataIndex,
  rowData,
  counter
) {
  return (
    !$("#OnlyWarnRows").prop("checked") ||
    rowData["number"] < rowData["minimum_number"]
  );
});

//triggers if user wants to show only rows with errors
//refreshes table with search above
$("#OnlyWarnRows").on("change", function () {
  table.draw();
});

$("#table tbody").on("dblclick", "tr", function (e) {
  const that = $(this);

  if (!$(this).hasClass("selected")) {
    selectRows(that, e);
  }

  if (!e.ctrlKey && $(this).children().length > 1) {
    $("#Edit").trigger("click");
  }
});

$("#table tbody").on("click", "tr", function (e) {
  const that = $(this);
  selectRows(that, e);
});

//selects row(s)
function selectRows(that, e) {
  if (e.ctrlKey) {
    that.toggleClass("selected");
  } else {
    const thisClass = that.hasClass("selected");
    $("#table")
      .DataTable()
      .rows()
      .every(function (rowIdx, tableLoop, rowLoop) {
        this.nodes().to$().removeClass("selected");
      });
    if (!thisClass) {
      that.toggleClass("selected");
    }
  }

  selectHandler();
}

function selectHandler() {
  const rowsSelected = table.rows(".selected").data().length;

  $("#rows").remove();
  $(`<span id="rows">${rowsSelected} Zeile(n) ausgewählt</span>`).insertAfter(
    ".dataTables_info"
  );

  if (rowsSelected === 1) {
    $("#Edit").prop("disabled", false);
    $("#Edit").prop("title", "Aktuell ausgewählte Zeile bearbeiten");
  } else {
    $("#Edit").prop("disabled", true);
    $("#Edit").prop(
      "title",
      "Wähle eine Zeile aus um sie bearbeiten zu können"
    );
  }

  if (rowsSelected > 0) {
    $("#Delete").prop("disabled", false);
    $("#Delete").prop("title", "Aktuell ausgewählte Zeile(n) löschen");
  } else {
    $("#Delete").prop("disabled", true);
    $("#Delete").prop(
      "title",
      "Wähle mindestens eine Zeile aus um sie löschen zu können"
    );
  }
}

//----------Delete Entry---------------

$("#Delete").click(function () {
  const deleteRows = $("table tr.selected");
  const taskentries = [];
  for (const row of deleteRows) {
    const id = $(row).find("td.stock-id").text();
    $.ajax({
      async: false,
      type: "GET",
      url: `/api/taskentries/stock/${id}`,
      dataType: "json",
      success: function (data) {
        if (data.length > 0) {
          taskentries.push(data);
        }
      },
    });
  }
  const counter = $("#table tr.selected").length;
  $("#PopUpDelete").show();
  $("#cover").show();
  if (counter > 1) {
    if (taskentries.length > 0) {
      $(".PopUpDelete_middle").html(
        `<span>Diese Artikel können zurzeit nicht gelöscht werden, da mindestens einer Teil eines aktiven Auftrags ist.<span>`
      );
      $(".PopUp_footer button").hide(0);
    } else {
      $(".PopUpDelete_middle").html(
        `<span>Sind Sie sicher, dass Sie ${counter} Einträge <u><b>unwiderruflich</b></u> löschen möchten?<span>`
      );
      $(".PopUp_footer button").show(0);
    }
  } else {
    if (taskentries.length > 0) {
      $(".PopUpDelete_middle").html(
        `<span>Dieser Artikel kann zurzeit nicht gelöscht werden, da er Teil eines aktiven Auftrags ist.<span>`
      );
      $(".PopUp_footer button").hide(0);
    } else {
      const articleName = $("#table tr.selected td.stock-art-name").text();
      $(".PopUpDelete_middle").html(
        `<span>Sind Sie sicher, dass Sie "${articleName}" <u><b>unwiderruflich</b></u> löschen möchten?<span>`
      );
      $(".PopUp_footer button").show(0);
    }
  }
});

$("#deleteForm").submit(function (event) {
  event.preventDefault(); //prevent default action

  const post_url = $(this).attr("action"); //get form action url
  const deleteRows = $("table tr.selected");
  const promiseArr = [];
  const idArr = [];
  for (const row of deleteRows) {
    const id = $(row).find("td.stock-id").text();
    idArr.push(parseInt(id));
    promiseArr.push(
      $.ajax({
        url: `${post_url}/${id}`,
        type: "DELETE",
      })
    );
  }
  Promise.all(promiseArr).then(() => {
    const localeStorageList = JSON.parse(localStorage.getItem("list"));
    if (localeStorageList !== null) {
      const filterList = localeStorageList.filter((el) => !idArr.includes(el));
      localStorage.setItem("list", JSON.stringify(filterList));
    }
    location.reload();
  });
});

//------------------------------------
