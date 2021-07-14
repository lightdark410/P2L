  // DataTable
  let table_ids = []; //used to store all id´s from table data
  let table = $("#table").DataTable({
    "processing": true,
    "ajax": {
      "url": "/stock",
      "type": "GET"
    },
    pageLength : 10,
    "lengthMenu": [[5, 10, 25, 50, 100], [5, 10, 25, 50, 100]],
    responsive: false,
    "columns": [
      { data: "id" }, //mock data for saveIcon
      { data: "id" }, 
      { data: "name" }, 
      { data: "number" },
      { data: "minimum_number" },
      { data: "unit"},
      { data: "storage_location"},
      { data: "storage_place" }, 
      { data: "category" }, 
      { data: "creator" }, 
      { data: "change_by" }, 
      { data: "date" }, 
      { data: "keyword" },
      { data: "id"} //mock data for logs
    ],
    "rowCallback": function (row, data, index) {
      //add icons at the first and last column
      $(row).find("td").first().html('<img class="save" src="assets/iconfinder_add.png" alt="" title="Artikel speichern">');
      $(row).find("td").last().html('<img class="log" src="assets/iconfinder_link.svg" alt="" title="Zu den Logs..">');

      //add background colors if number is less that the minimum number
      if (parseInt(data.number) < parseInt(data.minimum_number)) {
        if (parseInt(data.number) > 0) {
          $(row).find("td:nth-child(4)").addClass("notEnough_left");
          $(row).find("td:nth-child(5)").addClass("notEnough_right");
        } else {
          $(row).find("td:nth-child(4)").addClass("notEnough2_left");
          $(row).find("td:nth-child(5)").addClass("notEnough2_right");
        }

      }
      
      table_ids.push(data.article_id);

    },
    "order": [[1, "asc"]],
    "columnDefs": [{ "targets": [0, 13], "orderable": false }],
    "initComplete": function () {
      // Apply the search
      this.api().columns().every(function () {
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

      res = list.filter(item => table_ids.includes(item.id));
      localStorage.setItem("list", JSON.stringify(res));
      $("#list").find("span").text(res.length);
    },
    stateSave: true,
    language: {
      "url": "/assets/js/datatables/German.json",
      "searchPlaceholder": "Suchen..."
    },
    "oLanguage": { "sSearch": "" }
});

// Clear all Search filter (after reload)
if (table.state.loaded()) {
  table
    .search('')
    .columns().search('')
    .draw();

}


let url = window.location.pathname;
let id = url.substring(url.lastIndexOf('/') + 1);
let ajax_url;
(!isNaN(id)) ? ajax_url = `/logData/${id}` : ajax_url = "/logData";
$('#logsTable').DataTable({
    "ordering": false,
    language: {
      "url": "/assets/js/datatables/German.json",
      "searchPlaceholder": "Suchen..."
    },
    "processing": true,
    "ajax": {
      "url": ajax_url,
      "type": "GET"
    },
    "columns": [
      { data: "event" }, 
      { data: "stock_id" }, 
      { data: "name" },
      { data: "category" },
      { data: "keywords"},
      { data: "location" }, 
      { data: "date" },
      { data: "creator" }, 
      { data: "change_by" }, 
      { data: "number" }, 
      { data: "minimum_number" },
    ],
    "rowCallback": function (row, data, index) {

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

  $('#kategorieTable').DataTable({
    "processing": true,
    "ajax":{
      "url": "/stammdaten/category",
      "type": "GET"
    },
    "columns":  [
      { data: "category",
      render : function(data, type, row) {
        return ''+data+'<i class="fas fa-trash"></i>'
    }  },
    ],
    language: {
      "url": "/assets/js/datatables/German.json",
      "searchPlaceholder": "Suchen..."
    },
    "scrollY":        "300px",
    "scrollCollapse": true,
    "paging":         false
  });
  
  $('#keywordsTable').DataTable({
    "processing": true,
    "ajax":{
      "url": "/stammdaten/keyword",
      "type": "GET"
    },
    "columns":  [
      { data: "keyword",
      render : function(data, type, row) {
        return ''+data+'<i class="fas fa-trash"></i>'
    }  },
    ],
    language: {
      "url": "/assets/js/datatables/German.json",
      "searchPlaceholder": "Suchen..."
    },
    "scrollY":        "300px",
    "scrollCollapse": true,
    "paging":         false
  });

  $('#unitTable').DataTable({
    "processing": true,
    "ajax":{
      "url": "/stammdaten/unit",
      "type": "GET"
    },
    "columns":  [
      { data: "unit",
      render : function(data, type, row) {
        return ''+data+'<i class="fas fa-trash"></i>'
    }  },
    ],
    language: {
      "url": "/assets/js/datatables/German.json",
      "searchPlaceholder": "Suchen..."
    },
    "scrollY":        "300px",
    "scrollCollapse": true,
    "paging":         false
  });
  //save all rows with errors in array warnArr


  //search for warn rows
  $.fn.dataTable.ext.search.push(
    function (settings, data, dataIndex) {
      if ($('#OnlyWarnRows').prop('checked')) {

        var warnArr = [];
    
        if (parseInt(data[3]) < parseInt(data[4])) {
          warnArr.push($($('table.dataTable').DataTable().row(dataIndex).node()));
        }
        for (var i = 0; i < warnArr.length; i++) {
          if (warnArr[i][0] == $($('table.dataTable').DataTable().row(dataIndex).node())[0]) {
            return true;
          }
        }
        return false;
      }
      return true;
    }
  );

  //triggers if user wants to show only rows with errors
  //refreshes table with search above
  $('#OnlyWarnRows').on('change', function () {
    table.draw();
  });

  $('#table tbody').on('dblclick', 'tr', function (e) {
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
      $("#Edit").prop("title", "Wähle eine Zeile aus um sie bearbeiten zu können");
    }

    if (rowsSelected > 0) {
      $("#Delete").prop("disabled", false);
      $("#Delete").prop("title", "Aktuell ausgewählte Zeile(n) löschen");
    } else {
      $("#Delete").prop("disabled", true);
      $("#Delete").prop("title", "Wähle mindestens eine Zeile aus um sie löschen zu können");

    }
  }

  //----------Delete Entry---------------

  $("#Delete").click(function () {
    var counter = table.rows(".selected").data().length;
    $("#PopUpDelete").show();
    $("#cover").show();
    if (counter > 1) {
      $(".PopUpDelete_middle").html(`<span>Sind Sie sicher, dass Sie ${counter} Einträge <u><b>unwiderruflich</b></u> löschen möchten?<span>`);
    } else {
      var artikel = table.rows(".selected").data()[0].name;
      $(".PopUpDelete_middle").html(`<span>Sind Sie sicher, dass Sie "${artikel}" <u><b>unwiderruflich</b></u> löschen möchten?<span>`);
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
          let filterList = localeStorageList.filter((el) =>{
            return el.id !== id;
          })
          localStorage.setItem("list", JSON.stringify(filterList));
          location.reload(); 
        },
      });
 
    }
  });

  //------------------------------------
