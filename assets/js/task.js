const closePopUp = function () {
  $(".cover").fadeOut();
  $(".cover").remove();
  $(".popup").fadeOut();
  $(".popup").remove();
};

$("#task tbody").on("click", "tr", function (e) {
  if (typeof $(this).attr("role") == "undefined") {
    return;
  }
  taskTable.rows().every(function (rowIdx, tableLoop, rowLoop) {
    this.nodes().to$().removeClass("selected");
  });
  $(this).toggleClass("selected");

  let task_id = parseInt($(this).find("td:nth-child(2)").text());
  if (isNaN(task_id)) {
    return;
  }
  task_entriesTable.ajax.url(`/api/tasklog/${task_id}`).load(function () {
    loadEntryStatus();
  });

  function loadEntryStatus() {
    let tr = $("#task_entries tbody tr");
    if ($(tr).find("td").length == 1) {
      return;
    }
    $(tr).each(function (i) {
      let td = $(this).find("td").last();
      let status = parseInt(td.text());
      if (status == 1) {
        td.html("<img src='../assets/svg/check_noborder.svg'/>");
      } else {
        td.html("<img src='../assets/svg/warning_noborder.svg'/>");
      }
    });
  }
});

$("#task tbody").on("click", "#qr", function (e) {
  let qrRow = $(this).parents("tbody").parents("tr").prev();
  let id = qrRow.find("td:nth-child(2)").text();
  let data = `http://10.132.20.30:8090/mobileList/${id}`;
  $("#qrcode").text("");
  new QRCode(document.getElementById("qrcode"), data);
  $("#qrcode").append(`<div><a href="${data}">${data}</a></div>`);
  $("#qrcode").show();
});

// display delete popup when the "delete" button is clicked
$("#task tbody").on("click", "#delete-task", function (e) {
  const row = $(this).parents("tbody").parents("tr").prev();
  const id = row.find("td:nth-child(2)").text();
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

$("body").on("click", ".cover, #mdiv", closePopUp);
