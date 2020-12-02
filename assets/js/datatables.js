$(document).ready(function () {

  // DataTable
  var table = $("#table").DataTable({
    "processing": true,
    "ajax": {
      // "url": "/assets/js/data.json",
      "url": "/data",
      "type": "GET"
    },
    "columns": [
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
      { data: "time" }, 
      { data: "keyword" }, 
      { data: "deleted" }
    ],
    "rowCallback": function (row, data, index) {
      $(row).find("td").last().html('<img class="log" src="assets/iconfinder_link.svg" alt="" title="Zu den Logs..">');

      if (parseInt(data.number) < parseInt(data.minimum_number)) {
        if (parseInt(data.number) > 0) {
          $(row).find("td:nth-child(3)").addClass("notEnough_left");
          $(row).find("td:nth-child(4)").addClass("notEnough_right");
          // $(row).find("td:nth-child(3) .warn").remove();
          // $(row).find("td:nth-child(3)").prepend(`<img class="warn" title="Die Mindestanzahl ist unterschritten!" src="assets/iconfinder_warn.svg" alt="">`);
        } else {
          $(row).find("td:nth-child(3)").addClass("notEnough2_left");
          $(row).find("td:nth-child(4)").addClass("notEnough2_right");

          // console.log(0);
          // $(row).find("td:nth-child(3) .error").remove();
          // $(row).find("td:nth-child(3)").prepend(`<img class="error" title="Es sind keine Artikel mehr vorhanden" src="assets/iconfinder_error.svg" alt="">`);
        }

      }
    },
    "columnDefs": [{ "targets": 11, "orderable": false }],
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

      // var input = $(".ui input");
      // console.log(input.first());
      // $("#table_filter label").text("");
      // $("#table_filter").append(input.first());

      var r = $("#table tfoot tr");
      r.find("th").each(function () {
        $(this).css("padding", 8);
      });
      $("#table thead").append(r);
      $("#search_0").css("text-align", "center");
    },
    stateSave: true,
    language: {
      "url": "/assets/js/German.json",
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

  var logsTable = $('#logsTable').DataTable({
    "ordering": false,
    language: {
      "url": "/assets/js/German.json",
      "searchPlaceholder": "Suchen..."
    },
  });

  var kategorieTable = $('#kategorieTable').DataTable({
    "processing": true,
    "ajax":{
      "url": "/stammdaten/category",
      "type": "GET"
    },
    "columns":  [
      { data: "category"}, 
      { data: "number" ,
      render : function(data, type, row) {
        return ''+data+'<i class="fas fa-trash"></i>'
    }  },
    ],
    "columnDefs": [
      { "width": "50%", "targets": 0 },
      { "width": "50%", "targets": 1 },
    ],
    language: {
      "url": "/assets/js/German.json",
      "searchPlaceholder": "Suchen..."
    }
  });
  var keywordsTable = $('#keywordsTable').DataTable({
    "processing": true,
    "ajax":{
      "url": "/stammdaten/keyword",
      "type": "GET"
    },
    "columns":  [
      { data: "keyword"}, 
      { data: "number" ,
      render : function(data, type, row) {
        return ''+data+'<i class="fas fa-trash"></i>'
    }  },
    ],
    "columnDefs": [
      { "width": "50%", "targets": 0 },
      { "width": "50%", "targets": 1 },
    ],
    language: {
      "url": "/assets/js/German.json",
      "searchPlaceholder": "Suchen..."
    }
  });

  var keywordsTable = $('#unitTable').DataTable({
    "processing": true,
    "ajax":{
      "url": "/stammdaten/unit",
      "type": "GET"
    },
    "columns":  [
      { data: "unit"}, 
      { data: "number" ,
      render : function(data, type, row) {
        return ''+data+'<i class="fas fa-trash"></i>'
    }  },
    ],
    "columnDefs": [
      { "width": "50%", "targets": 0 },
      { "width": "50%", "targets": 1 },
    ],
    language: {
      "url": "/assets/js/German.json",
      "searchPlaceholder": "Suchen..."
    }
  });
  //save all rows with errors in array warnArr


  //search for warn rows
  $.fn.dataTable.ext.search.push(
    function (settings, data, dataIndex) {
      if ($('#OnlyWarnRows').prop('checked')) {

        var warnArr = [];
    
        if (parseInt(data[2]) < parseInt(data[3])) {
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

    if (!e.ctrlKey) {
      $("#Edit").trigger("click");

    }
    console.log("double click");
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
        console.log(this.nodes().to$());

      });
      if (!thisClass) {
        // console.log(that);
        that.toggleClass("selected");
      }
    }

    selectHandler();
  }

  function selectHandler() {
    var rowsSelected = table.rows(".selected").data().length;
    //console.log(rowsSelected);

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

  $("#table").on("click", ".log", function (e) {
    // console.log("------------------");
    // console.log($(this));
    // console.log("------------------");
    var id = $(this).parent().parent().children().first().html().trim();
    window.location.href = `/logs/${id}`;
  });

  $(document).on("keypress", function (e) {
    if ($("#ortInput").is(":focus")) {
      if (e.which == 13) {
        alert($("#ortInput").val());
      };
    }

  });

  //------------------------------------
  //----------Delete Entry---------------

  $("#Delete").click(function () {
    var counter = table.rows(".selected").data().length;
    $("#PopUpDelete").show();
    $("#cover").show();
    if (counter > 1) {
      $(".PopUpDelete_middle").html(`<span>Sind Sie sicher, dass Sie ${counter} Einträge löschen möchten?<span>`);
    } else {
      var artikel = table.rows(".selected").data()[0].name;
      $(".PopUpDelete_middle").html(`<span>Sind Sie sicher, dass Sie "${artikel}" löschen möchten?<span>`);
    }
    
    $(document).keypress(function(event){

      var keycode = (event.keyCode ? event.keyCode : event.which);
      if(keycode == '13'){
        $("#deleteForm").submit();
      }
    
    });
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
          location.reload();
        },
      });
    }
  });

  //------------------------------------
});
