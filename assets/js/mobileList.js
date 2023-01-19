const url = window.location.pathname;
const id = url.substring(url.lastIndexOf("/") + 1);

let data;
$.ajax({
  url: `/api/mobileList/${id}`,
}).then((response) => {
  if (response.error) {
    switch (response.error) {
      case "ERR_IN_PROGRESS_BY_OTHER_USER":
        $("#itemDiv").html(
          "Dieser Auftrag wird bereits von einer anderen Person bearbeitet.<br />Bei Fragen wenden Sie sich bitte an Ihren zuständigen Ausbilder."
        );
        break;
      case "ERR_ALREADY_FINISHED":
        $("#itemDiv").text("Auftrag abgeschlossen");
        break;
      case "ERR_TASK_NOT_FOUND":
        $("#itemDiv").text("Auftrag existiert nicht.");
        break;
      default:
        $("#itemDiv").text("Es ist ein Fehler aufgetreten.");
    }
    return;
  }

  data = response.data;
  data.sort((a, b) => {
    const locA = a.storage.toUpperCase();
    const locB = b.storage.toUpperCase();

    if (locA < locB) {
      return -1;
    }
    if (locA > locB) {
      return 1;
    }
    return 0;
  });

  if (response.status === -1) {
    $.ajax({
      url: "/api/updateTaskStatus",
      data: `taskID=${id}&newStatus=0`,
      method: "POST",
    });
    response.status = 0;
  } else {
    $("#already-in-progress-notification").show();
  }
  if (response.status === 0) {
    let ledColor;
    try {
      ledColor = JSON.parse(req.color);
    } catch (error) {
      ledColor = "";
    }
    loadLedColor(ledColor);
    $("#total_pages").text(response.data.length);
    // show first item by default
    renderItemData(0);
    renderListTableData();
  } else {
    $("#already-in-progress-notification").hide();
    $("#itemDiv").text("Auftrag abgeschlossen");
  }
});

//render all data in the table
function renderItemData(tableIndex) {
  if (typeof data[tableIndex] !== "undefined") {
    $("#itemlist_div").attr("data-index", tableIndex); //updates the data property of the table
    $("#curr_page").text(tableIndex + 1); //updates page number
    const obj = data[tableIndex];
    $("#id").text(obj.articleNumber);
    $("#name").text(obj.articleName);
    $("#amount").text(obj.amount);
    if (obj.lay_in == 1) {
      $("#amountTh").text("Einlagern");
      $("#amountDiv").css("background-color", "rgba(131,255,131,0.6)");
    } else {
      $("#amountTh").text("Auslagern");
      $("#amountDiv").css("background-color", "rgba(131,195,255,0.6)");
    }
    $("#storage").text(data[tableIndex].storage);
    $("#storage_place").text(data[tableIndex].storage_place);
    $("#amount-selector input").val(obj.amount_real ?? 0);
    // style button based on whether an amount has been submitted
    if (obj.amount_real === null) {
      $("#amount-selector button")
        .text("Anzahl bestätigen")
        .removeClass("bg-primary bg-success disabled")
        .addClass("bg-primary")
        .attr("disabled", false);
    } else {
      $("#amount-selector button")
        .text("Anzahl bestätigt")
        .removeClass("bg-primary bg-success disabled")
        .addClass("bg-success disabled")
        .attr("disabled", true);
    }
  }
}

//displays all entries
function renderListTableData() {
  let tbody = $("#listDiv table tbody");
  $(tbody).html("");

  for (var i = 0; i < data.length; i++) {
    $(tbody).append(`
            <tr class="d-flex pr-1" data-index="${i}">
                <td class="col-4">${data[i].articleName}</td>
                <td class="col-4">${data[i].storage}</td>
                <td class="col-4">${data[i].amount_real ?? "-"}/${
      data[i].amount
    }</td>
            </tr>
        `);
  }

  // disable button to finish task if any amount has not been confirmed yet
  $("#listDiv button").attr(
    "disabled",
    data.some((elem) => elem.amount_real === null)
  );
}

function loadLedColor(color) {
  if (Array.isArray(color) && color.length == 3) {
    $("#led").css(
      "background-color",
      `rgb(${color[0]}, ${color[1]}, ${color[2]})`
    );
  } else {
    $("#led").remove();
  }
}

$("#amount-selector button").click(function () {
  const amount = parseInt($("#amount-selector input").val());
  if (isNaN(amount)) {
    return;
  }
  const table_index = document.getElementById("itemlist_div").dataset.index;
  const targetButton = $(this);
  $.ajax({
    url: "/api/updateTaskEntry",
    type: "POST",
    data: `task_id=${data[table_index].task_id}&stock_id=${data[table_index].stock_id}&amount_real=${amount}`,
    success: function (jqXHR, textStatus, error) {
      data[table_index].amount_real = amount;
      targetButton
        .removeClass("bg-primary")
        .addClass("bg-success disabled")
        .text("Anzahl bestätigt")
        .attr("disabled", true);
    },
  });
});

$("#itemDiv").on("click", "#amount-selector input", function () {
  this.select();
});

$("#itemDiv").on("change", "#amount-selector input", function () {
  const targetButton = $(this).next();
  if (targetButton.hasClass("disabled")) {
    targetButton
      .removeClass("bg-success disabled")
      .addClass("bg-primary")
      .text("Anzahl bestätigen")
      .attr("disabled", false);
  }
});

//load item if it was clicked in list
$("body").on("click", "#listDiv tbody tr", function () {
  let index = $(this).attr("data-index");
  toggleView();
  renderItemData(parseInt(index));
});

//submit finished list
$("body").on("click", "#listDiv button", function () {
  $.ajax({
    type: "POST",
    url: `/api/finishTask/${data[0].task_id}`,
    success: function (jqXHR, textstatus, error) {
      $("#listDiv button").attr("disabled", true);
      $("#listDiv button").html("Auftrag abgeschlossen");
      $("#listDiv button").removeClass("btn-success");
      $("#listDiv button").addClass("btn-outline-success");
    },
  });
});

function toggleView() {
  $("#itemDiv").toggle();
  $("#listDiv").toggle();
}
