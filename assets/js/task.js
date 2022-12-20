const closePopUp = function () {
  $(".cover").fadeOut();
  $(".cover").remove();
  $(".popup").fadeOut();
  $(".popup").remove();
  $(".reset-popup").fadeOut();
  $(".reset-popup").remove();
};

$("#task tbody").on("click", "tr", function (e) {
  if (typeof $(this).attr("role") == "undefined") {
    return;
  }
  taskTable.rows().every(function (rowIdx, tableLoop, rowLoop) {
    this.nodes().to$().removeClass("selected");
  });
  $(this).toggleClass("selected");

  const task_id = parseInt($(this).find("td.task-id").text());
  if (isNaN(task_id)) {
    return;
  }
  task_entriesTable.ajax
    .url(`/api/taskEntriesById/${task_id}`)
    .load(function () {
      loadEntryStatus();
    });

  function loadEntryStatus() {
    const tr = $("#task_entries tbody tr");
    if ($(tr).find("td").length == 1) {
      return;
    }
    $(tr).each(function (i) {
      const statusTD = $(this).find("td.status-indicator");
      switch (statusTD.text()) {
        case "1":
          statusTD.html("<img src='../assets/svg/check_noborder.svg'/>");
          break;
        case "2":
          statusTD.html("<img src='../assets/svg/warning_noborder.svg'/>");
          break;
        default:
          statusTD.html("<img src='../assets/svg/cross_noborder.svg'/>");
      }
      const layInTD = $(this).find("td.lay-in");
      switch (layInTD.text()) {
        case "0":
          layInTD.text("Nein");
          break;
        case "1":
          layInTD.text("Ja");
          break;
        default:
          layInTD.text("n/a");
      }
    });
  }
});

$("#task tbody").on("click", "#qr", function (e) {
  let qrRow = $(this).parents("tbody").parents("tr").prev();
  let id = qrRow.find("td.task-id").text();
  let data = `http://10.132.20.30:8090/mobileList/${id}`;
  $("#qrcode").text("");
  new QRCode(document.getElementById("qrcode"), data);
  $("#qrcode").append(`<div><a href="${data}">${data}</a></div>`);
  $("#qrcode").show();
});

// display delete popup when the "delete" button is clicked
$("#task tbody").on("click", "#delete-task", function (e) {
  const row = $(this).parents("tbody").parents("tr").prev();
  const id = row.find("td.task-id").text();
  let authorised;

  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: "/api/user",
    success: function (data) {
      authorised = !(data.title === "Auszubildender");
    },
  });

  const popUpMid = authorised
    ? `
        <span>Sicher, dass Sie den Auftrag Nummmer ${id} <b><u>unwiderruflich</u></b></span>
        <span>löschen wollen?</span>
        <br>
        <button class="btn btn-danger delete" type="button">Löschen</button>
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `
    : `
        Sie haben keine Berechtigung Aufträge zu löschen!
        <br />
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `;

  const popUp = `
        <div class="popup">
            <form>
            <div class="popup_top">
                Auftrag Nummer ${id} löschen?
                <div id="mdiv">
                    <div class="mdiv">
                        <div class="md"></div>
                    </div>
                </div>
            </div>
            <div class="popup_mid">
            ${popUpMid}
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

  const cover = '<div class="cover"></div>';

  $("body").prepend(
    $(cover + popUp)
      .hide()
      .fadeIn()
  );

  $(".popup").on("click", ".popup_mid > .cancel", closePopUp);

  if (authorised) {
    $(".popup_mid > .delete").click(function () {
      $.ajax({
        type: "POST",
        url: "/api/deleteTask",
        data: `taskID=${id}`,
        processData: false,
        contentType: "application/x-www-form-urlencoded",
        success: function () {
          // reload the task table
          taskTable.ajax.reload();
          // close the popup
          closePopUp();
        },
        error: function (jqXHR, textStatus, error) {
          let errorMessage;
          switch (jqXHR.status) {
            case 403: {
              errorMessage =
                "Sie sind nicht berechtigt diese Aktion auszuführen!";
              break;
            }
            case 400: {
              errorMessage =
                jqXHR.responseJSON?.code === "ERR_TASK_IN_PROGRESS"
                  ? "Ein Auftrag der gerade in Bearbeitung ist kann nicht gelöscht werden!"
                  : "Es ist ein Fehler aufgetreten!";
              break;
            }
            default: {
              errorMessage = "Es ist ein Fehler aufgetreten!";
            }
          }
          $(".popup .popup_mid").html(
            `<span>${errorMessage}</span>
             <br/>
             <button class="btn btn-secondary cancel" type="button">Abbrechen</button>`
          );
        },
      });
    });
  }
});

// display reset processor popup when the "reset processor" button is clicked
$("#task tbody").on("click", "#reset-processor", function (e) {
  const row = $(this).parents("tbody").parents("tr").prev();
  const id = row.find("td.task-id").text();
  let authorised;

  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: "/api/user",
    success: function (data) {
      authorised = !(data.title === "Auszubildender");
    },
  });

  const popUpMid = authorised
    ? `
        <span>Möchten Sie den Auftragsstatus oder die bearbeitende Person für den Auftrag Nummer ${id} zurücksetzen?</span>
        <br>
        <div class="row justify-content-around mt-3">
          <div>
            <label for="processor-checkbox">BearbeiterIn</label>
            <input type="checkbox" id="processor-checkbox">
          </div>
          <div>
            <label for="status-checkbox">Auftragsstatus</label>
            <input type="checkbox" id="status-checkbox">
          </div>
        </div>
        <br />
        <button class="btn btn-danger reset mb-3" type="button">Zurücksetzen</button>
        <button class="btn btn-secondary cancel mb-3" type="button">Abbrechen</button>
        `
    : `
        Sie haben keine Berechtigung Auftragsinformationen zurückzusetzen!
        <br />
        <button class="btn btn-secondary cancel mb-3" type="button">Abbrechen</button>
        `;

  const popUp = `
        <div class="reset-popup">
            <form>
            <div class="popup_top">
                Auftragsinformationen zu Nummer ${id} zurücksetzen?
                <div id="mdiv">
                    <div class="mdiv">
                        <div class="md"></div>
                    </div>
                </div>
            </div>
            <div class="popup_mid">
            ${popUpMid}
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

  const cover = '<div class="cover"></div>';

  $("body").prepend(
    $(cover + popUp)
      .hide()
      .fadeIn()
  );

  $(".reset-popup").on("click", ".popup_mid > .cancel", closePopUp);

  if (authorised) {
    $(".popup_mid > .reset").click(function () {
      const processor = $(".reset-popup .popup_mid #processor-checkbox")[0]
        .checked;
      const status = $(".reset-popup .popup_mid #status-checkbox")[0].checked;

      $.ajax({
        type: "POST",
        url: "/api/resetTaskInfo",
        data: JSON.stringify({
          taskID: id,
          processor: processor,
          status: status,
        }),
        processData: false,
        contentType: "application/json",
        success: function () {
          // reload the task table
          taskTable.ajax.reload();
          // close the popup
          closePopUp();
        },
        error: function (jqXHR, textStatus, error) {
          let errorMessage;
          switch (jqXHR.status) {
            case 403: {
              errorMessage =
                "Sie sind nicht berechtigt diese Aktion auszuführen!";
              break;
            }
            case 400: {
              errorMessage =
                jqXHR.responseJSON?.code === "ERR_ALREADY_FINISHED"
                  ? "Dieser Auftrag ist bereits abgeschlossen und kann daher nicht geändert werden."
                  : "Es ist ein Fehler aufgetreten!";
              break;
            }
            default: {
              errorMessage = "Es ist ein Fehler aufgetreten!";
            }
          }
          $(".reset-popup .popup_mid").html(
            `<span>${errorMessage}</span>
             <br/>
             <button class="btn btn-secondary cancel" type="button">Abbrechen</button>`
          );
        },
      });
    });
  }
});

// display edit popup when the "edit" button is clicked
$("#task tbody").on("click", "#edit-task", function (e) {
  const row = $(this).parents("tbody").parents("tr").prev();
  const id = row.find("td.task-id").text();
  let authorised;

  $.ajax({
    async: false,
    type: "GET",
    global: false,
    url: "/api/user",
    success: function (data) {
      authorised = !(data.title === "Auszubildender");
    },
  });

  const popUpMid = authorised
    ? `
        <span>Möchten Sie die kommisierten Mengen für den Auftrag Nummer ${id} bearbeiten?</span>
        <br>
        <table>
          <thead>
            <th>Art. Nummer</th>
            <th>Name</th>
            <th>Anzahl Soll</th>
            <th>Anzahl Ist</th>
          </thead>
          <tbody>
          </tbody>
        </table>
        <br />
        <button class="btn btn-primary submit mb-3" type="button">Absenden</button>
        <button class="btn btn-secondary cancel mb-3" type="button">Abbrechen</button>
        `
    : `
        Sie haben keine Berechtigung bereits abgeschlossene Aufträge zu bearbeiten!
        <br />
        <button class="btn btn-secondary cancel mb-3" type="button">Abbrechen</button>
        `;

  const popUp = `
        <div class="reset-popup">
            <form>
            <div class="popup_top">
                Kommisionierte Mengen zu Auftrag Nummer ${id} bearbeiten?
                <div id="mdiv">
                    <div class="mdiv">
                        <div class="md"></div>
                    </div>
                </div>
            </div>
            <div class="popup_mid">
            ${popUpMid}
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

  const cover = '<div class="cover"></div>';

  $("body").prepend(
    $(cover + popUp)
      .hide()
      .fadeIn()
  );

  $(".reset-popup").on("click", ".popup_mid > .cancel", closePopUp);

  if (authorised) {
    $.ajax({
      type: "GET",
      url: `/api/taskEntriesById/${id}`,
    }).then((response) => {
      let tableEntries = "";
      for (const elem of response.data) {
        tableEntries += `
            <tr>
              <td class="stock-id">${elem.stock_id}</td>
              <td>${elem.name}</td>
              <td>${elem.amount}</td>
              <td><input type="number" class="newAmount" min="0" value="${elem.amount_real}"></td>
            </tr>`;
      }
      $(".popup_mid table tbody").append(tableEntries);
    });

    $(".popup_mid > .submit").click(function () {
      const entryList = [];
      const rows = $(".popup_mid table tbody tr");
      for (const row of rows) {
        entryList.push({
          stockID: $(row).find(".stock-id").text(),
          newAmount: $(row).find(".newAmount").val(),
        });
      }

      $.ajax({
        type: "POST",
        url: "/api/overrideTaskAmounts",
        data: JSON.stringify({
          taskID: id,
          entryList: entryList,
        }),
        processData: false,
        contentType: "application/json",
        success: function () {
          // reload the task table
          taskTable.ajax.reload();
          // close the popup
          closePopUp();
        },
        error: function (jqXHR, textStatus, error) {
          let errorMessage;
          switch (jqXHR.status) {
            case 403: {
              errorMessage =
                "Sie sind nicht berechtigt diese Aktion auszuführen!";
              break;
            }
            case 400: {
              errorMessage =
                jqXHR.responseJSON?.code === "ERR_NOT_FINISHED_YET"
                  ? "Dieser Auftrag ist noch nicht abgeschlossen und kann daher nicht geändert werden."
                  : "Es ist ein Fehler aufgetreten!";
              break;
            }
            default: {
              errorMessage = "Es ist ein Fehler aufgetreten!";
            }
          }
          $(".reset-popup .popup_mid").html(
            `<span>${errorMessage}</span>
             <br/>
             <button class="btn btn-secondary cancel" type="button">Abbrechen</button>`
          );
        },
      });
    });
  }
});

$("body").click(function (e) {
  let target = $(e.target);
  let targetParent = target.parent();
  if (
    target.attr("id") !== "qrcode" &&
    targetParent.attr("id") !== "qrcode" &&
    target.attr("id") !== "qr"
  ) {
    $("#qrcode").hide();
  }
});

$("#task-col-select-btn").click(function (event) {
  $("#task-col-select").toggle();
});

$("#task-col-select").on("click", "input", function (event) {
  const taskTable = $("#task").DataTable();
  const column = taskTable.column($(this).attr("value"));

  column.visible(!column.visible());
});

$("body").on("click", ".cover, #mdiv", closePopUp);
