$(document).ready(function () {
  let standartIP = "127.0.0.1:8000";
  let standartProtocol = "https"; // "://" is added in code
  let standartBuilding = "Main";
  let standartShelf = "1";
  let standartWidth = "2";
  let standartHeight = "3";
  let standartQRWidth = "128"; //width in px, recommended size min 64px

  const sym = String.fromCodePoint(0x00d7); //window closing unicode symbol

  let typingTimer;
  let doneTypingInterval = 5000;
  let baseString = "";

  const prefixIdBuilding = "#building-";
  const prefixIdShelf = "#shelf-";

  setup();

  async function setup() {
    setupBaseParameters();
    setupInputHandler();
    //generateQRCode("qrexample", "ftp://124.023.232.12:21")
    let dataTable = await getInputData();
    Promise.resolve(dataTable).then(function (data) {
      console.log(data);
    });

    // let inputIP = new Input("IP", standartIP, "standart")
    // inputIP.setupInput()
    // inputIP.createInput()
  }

  async function getInputData() {
    //[[Gebäude],[Etagen],...] -> aufgrund length die inputs generieren
    let ipData = ["IP", standartIP];
    let testData = ["Gebäude", ["Main", "Keller", "Dachboden", "Garage"]];
    let data = [ipData, testData];
    return data;
  }

  function setupInput() {
    let inputDiv = document.createElement("div");
    $(inputDiv)
      .attr({
        class: "input",
        id: "input",
      })
      .appendTo("body");
  }

  function setupBaseParameters() {
    // Sets the basic variables
    $("#input-ip").val(standartIP);
    $("#input-building").val(standartBuilding);
    $("#input-shelf").val(standartShelf);
    $("#input-width").val(standartWidth);
    $("#input-height").val(standartHeight);
  }

  function setupInputHandler() {
    ///// DROPDOWN
    $(".dropdown-item").unbind("click");
    $(".dropdown-item").click(function () {
      //let x = $(".dropdown-item").text()
      let buildingType = $(this).text();
      //console.log(x);
      $("#input-building").val(buildingType);
    });

    checkInput();

    ///// GENERATE BUTTON
    $("#generate-qr-all").unbind("click");
    $("#generate-qr-all").click(function () {
      //console.log("generating"); //Todo
      generate();
    });
  }

  function generate() {
    // get current input variables
    let building = $("#input-building").val();
    let shelfNo = $("#input-shelf").val();
    let shelfWidth = $("#input-width").val();
    let shelfHeight = $("#input-height").val();

    setupBuilding(building);
    setupShelf(building, shelfNo, shelfWidth, shelfHeight);
  }

  ///// REWORK NEEDED
  function checkInput() {
    $(".noNegAndChar").keyup(function () {
      clearTimeout(typingTimer);
      //console.log($(this).attr("id"));
      let inputId = $(this).attr("id");
      //console.log($(this).val());
      let inputVal = $(this).val();
      //console.log(inputVal);
      if ($(this).val()) {
        typingTimer = setTimeout(doneTyping(inputVal), doneTypingInterval);
      }
    });
  }

  function doneTyping(input) {
    //console.log("done typing");
    if ((input < 1) | isNaN(input)) {
      alert("Input must a whole Number greater than 0");
    }
  }
  ///// REWORK END

  function getInuptsVariables() {
    let host = $("#input-ip").val();
    let buildingNo = $("#input-building").val();
    let shelfNo = $("#input-shelf").val();
    return [host, buildingNo, shelfNo];
  }

  function generateQRCode(element, str) {
    //console.log(`el: ${element}, str: ${str}`);
    let qrcode = new QRCode(element, {
      text: str,
      width: standartQRWidth,
      height: standartQRWidth,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    return qrcode;
  }

  function setupBuilding(building) {
    //add building window if not existing already
    if ($(prefixIdBuilding + building).length == true) {
      //building already existing
    } else {
      generateBuilding($("#input-building").val());
    }
  }

  ///// generating a new jumbotron for every new building
  function generateBuilding(name) {
    //main div
    let d = document.createElement("div");
    $(d)
      .attr({
        class: `jumbotron px-3 py-2 mb-3 ${name}`,
        id: `building-${name}`,
      })

      //addClass(`jumbotron px-3 py-2 mb-3 ${name}`)
      .appendTo($("#qrcode"));

    //paragraph for text
    let p = document.createElement("p");
    $(p)
      .addClass("mx-1 pt-1 font-weight-bold")
      .appendTo($(`.${name}`))
      .text(`${name}`);

    //window closing button
    let b = document.createElement("button");
    $(b)
      .attr({
        type: "button",
        class: "close building-close",
        id: `del-building-${name}`,
        "data-toggle": "modal",
        "data-target": "#warning",
        //"data-dismiss": "alert",
        "aria-label": "close",
      })
      .appendTo($(p))
      .on("click", function () {
        console.log("id: " + this.id);
        //removing "btn-" prefix to remove the parent building div
        //and not only the button itself
        generateModal(
          "Warning",
          "Do you really want to delete the current element?",
          "Delete",
          "Keep",
          resolveModalAction($(b).attr("id"))
        );
        console.log("modal popup");
        //$(`#${this.id.slice(4)}`).remove()
      });

    //symbol of the button
    let s = document.createElement("span");
    $(s)
      .attr({
        "aria-hidden": true,
      })
      .text(sym)
      .appendTo($(b));

    //horizontal row for splitting
    let hr = document.createElement("hr");
    $(hr).addClass(`my-2 mt-1 pb-2 spacer-${name}`).appendTo($(d));

    //div for individual shelfs
    let mainShelfDiv = document.createElement("div");
    $(mainShelfDiv).addClass(`shelfs-${name}`).appendTo($(d));

    //div for printing related stuff
    let printDiv = document.createElement("div");
    $(printDiv).addClass(`text-right pb-1 pt-4 print-${name}`).appendTo($(d));

    //print button to print the whole "main div"
    let printBtn = document.createElement("a");
    $(printBtn)
      .attr({
        class: "btn btn-primary btn-lg",
        href: "#",
        role: "button",
      })
      .text(`Print ${name}`)
      .appendTo($(printDiv));
  }

  ///// setup a shelf
  function setupShelf(parentId, shelfNo, width, height) {
    // update existing shelf
    if ($(prefixIdBuilding + parentId + "-shelf-" + shelfNo).length == true) {
      updateShelf(prefixIdShelf + shelfNo);
    }
    //generate new shelfs
    else {
      generateShelf(shelfNo, parentId, null);
    }
  }

  ///// generating a new shelf in a "main div" / building
  function generateShelf(shelfNo, buildingName, qrcodes) {
    let shelfDiv = document.createElement("div");
    $(shelfDiv)
      .attr({
        class: `jumbotron p-0 m-0 shelf-${buildingName}`,
        id: `building-${buildingName}-shelf-${shelfNo}`,
      })
      .appendTo($(`.shelfs-${buildingName}`));
    let shelfDesc = document.createElement("p");
    $(shelfDesc)
      .addClass("m-1 font-italic")
      .text(`Shelf No ${shelfNo}`)
      .appendTo($(shelfDiv));
    let shelfDeleteBtn = document.createElement("button");
    $(shelfDeleteBtn)
      .attr({
        type: "button",
        class: "close",
        "data-dismiss": "alert",
        "aria-label": "close",
      })
      .appendTo($(shelfDesc));
    let shelfDelIcon = document.createElement("span");
    $(shelfDelIcon)
      .attr({
        "aria-hidden": true,
      })
      .text(sym)
      .appendTo($(shelfDeleteBtn));

    let x = $("#input-width").val();
    let y = $("#input-height").val();

    let imageDiv = document.createElement("div");

    $(imageDiv)
      .attr({
        class: "",
        id: `img-${buildingName}-${shelfNo}`,
      })
      .appendTo($(`#building-${buildingName}-shelf-${shelfNo}`));

    populateShelf(
      buildingName,
      shelfNo,
      $("#input-ip").val(),
      x,
      y,
      standartProtocol
    );
  }

  function populateShelf(buildingName, shelfNo, link, x, y, protocol) {
    for (j = 1; j <= y; j++) {
      for (i = 1; i <= x; i++) {
        let div = document.createElement("div");

        $(div)
          .attr({
            class: `print print-all print-shelf-${buildingName} print-shelf-${buildingName}-${shelfNo}`,
            id: `img-${buildingName}-${shelfNo}-${i}-${j}`,
          })
          .appendTo(`#img-${buildingName}-${shelfNo}`);

        let completeLink = `${protocol}://${link}/${buildingName}-${shelfNo}-${i}-${j}`;
        let code = generateQRCode(
          `img-${buildingName}-${shelfNo}-${i}-${j}`,
          completeLink
        );
      }
    }
  }

  function updateShelf(updateId) {
    console.log(`updating ${updateId}`);
  }

  function generateModal(title, msg, posText, negText, action) {
    $("#warningTitle").text(title);
    $("#warningMessage").text(msg);
    $("#positiveOption")
      .attr({
        onclick: action,
      })
      .text(posText);
    $("#negativeOption").text(negText);
  }

  function resolveModalAction(e) {
    console.log(e);
  }

  //setupParent / setupChild()
});
