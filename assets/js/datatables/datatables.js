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
    { data: "id", className: "stock-save-icon", orderable: false }, //mock data for saveIcon
    { data: "id", className: "stock-id" },
    { data: "articlenumber", className: "stock-art-num" },
    { data: "name", className: "stock-art-name" },
    { data: "number", className: "stock-amount" },
    { data: "minimum_number", className: "stock-min-amount" },
    { data: "unit", className: "stock-unit" },
    { data: "storage_location", className: "stock-storage-loc" },
    { data: "storage_place", className: "stock-storage-place" },
    { data: "category", className: "stock-category" },
    { data: "creator", className: "stock-creator" },
    { data: "change_by", className: "stock-changed-by" },
    { data: "date", className: "stock-change-date" },
    { data: "keyword", className: "stock-keyword-list" },
    { data: "id", className: "stock-log-icon", orderable: false }, //mock data for logs
  ],
  createdRow: function (row, rowdata, index) {
    // add icons at the first and last column
    $(row)
      .find("td.stock-save-icon")
      .html(
        '<img class="save" src="assets/iconfinder_add.png" alt="" title="Artikel speichern">'
      );
    $(row)
      .find("td.stock-log-icon")
      .html(
        '<img class="log" src="assets/iconfinder_link.svg" alt="" title="Zu den Logs..">'
      );

    // add background colors if number is less that the minimum number
    if (parseInt(rowdata.number) < parseInt(rowdata.minimum_number)) {
      if (parseInt(rowdata.number) > 0) {
        $(row).find("td.stock-amount").addClass("notEnough_left");
        $(row).find("td.stock-min-amount").addClass("notEnough_right");
      } else {
        $(row).find("td.stock-amount").addClass("notEnough2_left");
        $(row).find("td.stock-min-amount").addClass("notEnough2_right");
      }
    }

    table_ids.push(rowdata.id);
  },
  order: [[1, "asc"]],
  initComplete: function () {
    // Apply the search
    this.api()
      .columns()
      .every(function () {
        const that = this;

        $("input", this.footer()).on("keyup change clear", function () {
          if (that.search() !== this.value) {
            that.search(this.value).draw();
          }
        });
      });

    const r = $("#table tfoot tr");
    r.find("th").each(function () {
      $(this).css("padding", 8);
    });
    $("#table thead").append(r);
    $("#search_0").css("text-align", "center");

    const list = JSON.parse(localStorage.getItem("list"));

    //filter listitems that are not in the table anymore
    if (list !== null) {
      const res = list.filter((item) => table_ids.includes(item.id));
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
            <button class="btn btn-danger" id="delete-task">
              Auftrag löschen
            </button>
          </td>
          <td style="padding: 0 5px 0 0">
            <button class="btn btn-primary" id="qr">
              QR-Code
            </button>
          </td>
          <td style="padding: 0 5px 0 0">
            <button class="btn btn-primary" id="reset-processor">
              BearbeiterIn/Status zurücksetzen
            </button>
          </td>
          <td style="padding: 0 5px 0 0">
            <button class="btn btn-primary" id="edit-task">
              Kommisionierte Anzahl ändern
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
    { data: "id", className: "task-id" },
    { data: "date", className: "task-date" },
    { data: "order_number", className: "task-order-number" },
    { data: "creator", className: "task-creator" },
    { data: "processor", className: "task-processor" },
    { data: "orderer", className: "task-orderer", visible: false },
    {
      data: "delivery_location",
      className: "task-delivery-loc",
      visible: false,
    },
    { data: "status", className: "task-status-indicator" },
  ],
  columnDefs: [{ width: "30%", targets: 8 }],
  order: [[1, "desc"]],
  createdRow: function (row, data, index) {
    //add status to last column
    const statusTD = $(row).find("td.task-status-indicator");
    switch (parseInt(statusTD.text())) {
      case -1:
        statusTD.html("<span>Offen</span>");
        break;
      case 0:
        statusTD.html(
          "<span>In Bearbeitung </span><img src='../assets/loading.png'/>"
        );
        break;
      default:
        statusTD.html(
          "<span>Abgeschlossen </span><img src='../assets/check-mark.png'/>"
        );
    }
  },
  initComplete: function () {
    //get first task id
    const taskId = parseInt(
      $("#task tbody tr:eq(0)").find("td.task-id").text()
    );
    //load task entries for the first task
    if (!isNaN(taskId)) {
      task_entriesTable.ajax
        .url(`/api/taskEntriesById/${taskId}`)
        .load(function () {
          const tr = $("#task_entries tbody tr");
          if ($(tr).find("td").length == 1) {
            return;
          }
          $(tr).each(function (i) {
            const statusTD = $(this).find("td.status-indicator");
            switch (parseInt(statusTD.text())) {
              case 1:
                statusTD.html("<img src='../assets/svg/check_noborder.svg'/>");
                break;
              case 2:
                statusTD.html(
                  "<img src='../assets/svg/warning_noborder.svg'/>"
                );
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
        });
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
    { data: "stock_id", className: "stock-id" },
    { data: "name", className: "article-name" },
    { data: "storage_location", className: "storage-location" },
    { data: "storage_place", className: "storage-place" },
    { data: "lay_in", className: "lay-in" },
    { data: "amount", className: "amount" },
    { data: "amount_real", className: "amount-real" },
    { data: "amount_pre", className: "amount-pre" },
    { data: "amount_post", className: "amount-post" },
    { data: "status", className: "status-indicator" },
  ],
  columnDefs: [
    { width: "15%", targets: [0, 3, 5, 6, 7, 8, 9] },
    { width: "30%", targets: 1 },
    { width: "20%", targets: 2 },
  ],
});

const url = window.location.pathname;
const id = url.substring(url.lastIndexOf("/") + 1);
const ajax_url = !isNaN(id) ? `/api/logs/${id}` : "/api/logs";
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
    { data: "event", className: "event-type" },
    { data: "stock_id", className: "stock-id" },
    { data: "name", className: "article-name" },
    { data: "category", className: "category-name" },
    { data: "keywords", className: "keyword-list" },
    { data: "location", className: "storage-location" },
    { data: "date", className: "log-date" },
    { data: "creator", className: "creator-name" },
    { data: "change_by", className: "change-by-name" },
    { data: "number", className: "current-amount" },
    { data: "minimum_number", className: "minimum-amount" },
  ],
  rowCallback: function (row, data, index) {
    //add background colors for the events
    switch (data.event) {
      case "delete":
        $(row).find("td.event-type").css("background-color", "#ffadad");
        break;
      case "change":
        $(row).find("td.event-type").css("background-color", "#fdffb6");
        break;
      case "create":
        $(row).find("td.event-type").css("background-color", "#9bf6ff");
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
    { data: "id", className: "category-id", visible: false },
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
    { data: "id", className: "keyword-id", visible: false },
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
    { data: "id", className: "unit-id", visible: false },
  ],
  language: {
    url: "/assets/js/datatables/German.json",
  },
  scrollY: "300px",
  scrollCollapse: true,
  paging: false,
});
