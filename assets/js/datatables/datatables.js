// DataTable
let table_ids = []; //used to store all id´s from table data
let table = $("#table").DataTable({
  processing: true,
  ajax: {
    url: "/api/stock",
    type: "GET",
  },
  pageLength: 10,
  lengthMenu: [
    [5, 10, 25, 50, 100],
    [5, 10, 25, 50, 100],
  ],
  responsive: false,
  columns: [
    //{ data: "hidden" },
    { data: "id" }, //mock data for saveIcon
    { data: "id" },
    { data: "articlenumber" },
    { data: "name" },
    { data: "number" },
    { data: "minimum_number" },
    { data: "unit" },
    { data: "storage_location" },
    { data: "storage_place" },
    { data: "category" },
    { data: "creator" },
    { data: "change_by" },
    { data: "date" },
    { data: "keyword" },
    { data: "id" }, //mock data for logs
  ],
  rowCallback: function (row, rowdata, index) {
    //add icons at the first and last column
    //$(row).find("td").first().data("articlenumber", "Zukünftige");
    $(row)
      .find("td")
      .first()
      .html(
        '<img class="save" src="assets/iconfinder_add.png" alt="" title="Artikel speichern">'
      );
    $(row)
      .find("td")
      .last()
      .html(
        '<img class="log" src="assets/iconfinder_link.svg" alt="" title="Zu den Logs..">'
      );

    //add background colors if number is less that the minimum number
    if (parseInt(rowdata.number) < parseInt(rowdata.minimum_number)) {
      if (parseInt(rowdata.number) > 0) {
        $(row).find("td:nth-child(4)").addClass("notEnough_left");
        $(row).find("td:nth-child(5)").addClass("notEnough_right");
      } else {
        $(row).find("td:nth-child(4)").addClass("notEnough2_left");
        $(row).find("td:nth-child(5)").addClass("notEnough2_right");
      }
    }

    table_ids.push(rowdata.article_id);
  },
  order: [[1, "asc"]],
  columnDefs: [{ targets: [0, 13], orderable: false }], //{target: 5, visible: false}
  initComplete: function () {
    // Apply the search
    this.api()
      .columns()
      .every(function () {
        var that = this;

        $("input", this.footer()).on("keyup change clear", function () {
          if (that.search() !== this.value) {
            that.search(this.value).draw();
          }
        });
      });

    var r = $("#table tfoot tr");
    r.find("th").each(function () {
      $(this).css("padding", 8);
    });
    $("#table thead").append(r);
    $("#search_0").css("text-align", "center");

    let list = JSON.parse(localStorage.getItem("list"));

    //filter listitems that are not in the table anymore
    if (list !== null) {
      res = list.filter((item) => table_ids.includes(item.id));
      localStorage.setItem("list", JSON.stringify(res));
      $("#list").find("span").text(res.length);
    }
  },
  stateSave: true,
  language: {
    url: "/assets/js/datatables/German.json",
  },
  oLanguage: { sSearch: "" },
});

// Clear all Search filter (after reload)
if (table.state.loaded()) {
  table.search("").columns().search("").draw();
}

/* Formatting function for row details of task table */
function format(d) {
  // `d` is the original data object for the row
  return `<table cellpadding="0" cellspacing="0" border="0">
      <tr>
          <td style="padding: 0 5px 0 0">
            <button class="btn btn-danger">
              Auftrag löschen
            </button>
          </td>
          <td style="padding: 0">
            <button class="btn btn-primary" id="qr">
              QR-Code
            </button>
          </td>
      </tr>
  </table>`;
}

let taskTable = $("#task").DataTable({
  processing: true,
  ajax: {
    url: "/api/task",
    type: "GET",
  },
  columns: [
    {
      className: "details-control",
      orderable: false,
      data: null,
      defaultContent: "",
    },
    { data: "id" }, //mock data for saveIcon
    { data: "date" },
    { data: "creator" },
    { data: "status" },
  ],
  columnDefs: [{ width: "30%", targets: 4 }],
  order: [[1, "desc"]],
  createdRow: function (row, data, index) {
    //add status to last column
    let td = $(row).find("td").last();
    let status = parseInt(td.text());
    if (status == 0) {
      td.html("<span>In Bearbeitung </span><img src='../assets/loading.png'/>");
    } else {
      td.html(
        "<span>Abgeschlossen </span><img src='../assets/check-mark.png'/>"
      );
    }
  },
  initComplete: function () {
    //get first task id
    let taskId = parseInt(
      $("#task tbody tr:eq(0)").find("td:nth-child(2)").text()
    );
    //load task entries for the first task
    if (!isNaN(taskId)) {
      task_entriesTable.ajax.url(`/api/tasklog/${taskId}`).load();
    }
  },
  language: {
    url: "/assets/js/datatables/German.json",
  },
});

// Add event listener for opening and closing details
$("#task tbody").on("click", "td.details-control", function () {
  let tr = $(this).closest("tr");
  let row = taskTable.row(tr);
  let childIsShown = row.child.isShown();

  //Close all open rows
  taskTable.rows().every(function () {
    // If row has details expanded
    if (this.child.isShown()) {
      // Collapse row details
      this.child.hide();
      $(this.node()).removeClass("shown");
    }
  });

  if (childIsShown) {
    // This row is already open - close it
    row.child.hide();
    tr.removeClass("shown");
  } else {
    // Open this row
    row.child(format(row.data())).show();
    tr.addClass("shown");
  }
});

let task_entriesTable = $("#task_entries").DataTable({
  processing: true,
  language: {
    url: "/assets/js/datatables/German.json",
  },
  columns: [
    { data: "stock_id" },
    { data: "name" },
    { data: "storage_location" },
    { data: "storage_place" },
    { data: "amount_pre" },
    { data: "amount_post" },
    { data: "status" },
  ],
  columnDefs: [
    { width: "15%", targets: 0 },
    { width: "30%", targets: 1 },
    { width: "20%", targets: 2 },
    { width: "15%", targets: 3 },
  ],
});

let url = window.location.pathname;
let id = url.substring(url.lastIndexOf("/") + 1);
let ajax_url;
!isNaN(id) ? (ajax_url = `/api/logs/${id}`) : (ajax_url = "/api/logs");
$("#logsTable").DataTable({
  ordering: false,
  language: {
    url: "/assets/js/datatables/German.json",
  },
  processing: true,
  ajax: {
    url: ajax_url,
    type: "GET",
  },
  columns: [
    { data: "event" },
    { data: "stock_id" },
    { data: "name" },
    { data: "category" },
    { data: "keywords" },
    { data: "location" },
    { data: "date" },
    { data: "creator" },
    { data: "change_by" },
    { data: "number" },
    { data: "minimum_number" },
  ],
  rowCallback: function (row, data, index) {
    //add background colors for the events
    switch (data.event) {
      case "delete":
        $(row).find("td").first().css("background-color", "#ffadad");
        break;
      case "change":
        $(row).find("td").first().css("background-color", "#fdffb6");
        break;
      case "create":
        $(row).find("td").first().css("background-color", "#9bf6ff");
        break;
      default:
        break;
    }
  },
});

$("#kategorieTable").DataTable({
  processing: true,
  ajax: {
    url: "/api/stammdaten/category",
    type: "GET",
  },
  columns: [
    {
      data: "category",
      render: function (data, type, row) {
        return "" + data + '<i class="fas fa-trash"></i>';
      },
    },
  ],
  language: {
    url: "/assets/js/datatables/German.json",
  },
  scrollY: "300px",
  scrollCollapse: true,
  paging: false,
});

$("#keywordsTable").DataTable({
  processing: true,
  ajax: {
    url: "/api/stammdaten/keyword",
    type: "GET",
  },
  columns: [
    {
      data: "keyword",
      render: function (data, type, row) {
        return "" + data + '<i class="fas fa-trash"></i>';
      },
    },
  ],
  language: {
    url: "/assets/js/datatables/German.json",
  },
  scrollY: "300px",
  scrollCollapse: true,
  paging: false,
});

$("#unitTable").DataTable({
  processing: true,
  ajax: {
    url: "/api/stammdaten/unit",
    type: "GET",
  },
  columns: [
    {
      data: "unit",
      render: function (data, type, row) {
        return "" + data + '<i class="fas fa-trash"></i>';
      },
    },
  ],
  language: {
    url: "/assets/js/datatables/German.json",
  },
  scrollY: "300px",
  scrollCollapse: true,
  paging: false,
});
//save all rows with errors in array warnArr

//search for warn rows
$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
  if ($("#OnlyWarnRows").prop("checked")) {
    var warnArr = [];

    if (parseInt(data[3]) < parseInt(data[4])) {
      warnArr.push($($("table.dataTable").DataTable().row(dataIndex).node()));
    }
    for (var i = 0; i < warnArr.length; i++) {
      if (
        warnArr[i][0] ==
        $($("table.dataTable").DataTable().row(dataIndex).node())[0]
      ) {
        return true;
      }
    }
    return false;
  }
  return true;
});

//triggers if user wants to show only rows with errors
//refreshes table with search above
$("#OnlyWarnRows").on("change", function () {
  table.draw();
});

$("#table tbody").on("dblclick", "tr", function (e) {
  var that = $(this);

  if (!$(this).hasClass("selected")) {
    selectRows(that, e);
  }

  if (!e.ctrlKey && $(this).children().length > 1) {
    $("#Edit").trigger("click");
  }
});

$("#table tbody").on("click", "tr", function (e) {
  var that = $(this);
  selectRows(that, e);
});

//selects row(s)
function selectRows(that, e) {
  var thisClass = that.hasClass("selected");

  if (e.ctrlKey) {
    that.toggleClass("selected");
  } else {
    table.rows().every(function (rowIdx, tableLoop, rowLoop) {
      this.nodes().to$().removeClass("selected");
    });
    if (!thisClass) {
      that.toggleClass("selected");
    }
  }

  selectHandler();
}

function selectHandler() {
  var rowsSelected = table.rows(".selected").data().length;

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
  let deleteRows = table.rows(".selected").data().to$();
  let taskentries = [];
  for (let i = 0; i < deleteRows.length; i++) {
    let id = table.rows(".selected").data().to$()[i].id;
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
  var counter = table.rows(".selected").data().length;
  $("#PopUpDelete").show();
  $("#cover").show();
  if (counter > 1) {
    if (taskentries.length > 0) {
      $(".PopUpDelete_middle").html(
        `<span>Diese Artikel können zurzeit nicht gelöscht werden, da mindestens einer teil eines aktiven Auftrags ist.<span>`
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
        `<span>Dieser Artikel kann zurzeit nicht gelöscht werden, da er teil eines aktiven Auftrags ist.<span>`
      );
      $(".PopUp_footer button").hide(0);
    } else {
      var artikel = table.rows(".selected").data()[0].name;
      $(".PopUpDelete_middle").html(
        `<span>Sind Sie sicher, dass Sie "${artikel}" <u><b>unwiderruflich</b></u> löschen möchten?<span>`
      );
      $(".PopUp_footer button").show(0);
    }
  }
});

$("#deleteForm").submit(function (event) {
  event.preventDefault(); //prevent default action

  var post_url = $(this).attr("action"); //get form action url
  var deleteRows = table.rows(".selected").data().to$();
  for (var i = 0; i < deleteRows.length; i++) {
    var id = table.rows(".selected").data().to$()[i].id;

    post_urlNew = post_url + "/" + id;
    $.ajax({
      url: post_urlNew,
      type: "DELETE",
      success: function (result) {
        let localeStorageList = JSON.parse(localStorage.getItem("list"));
        if (localeStorageList != null) {
          let filterList = localeStorageList.filter((el) => {
            return el.id !== id;
          });
          localStorage.setItem("list", JSON.stringify(filterList));
        }
        location.reload();
      },
    });
  }
});

//------------------------------------
