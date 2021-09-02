
$("#task tbody").on("click", "tr", function (e) {
    taskTable.rows().every(function (rowIdx, tableLoop, rowLoop) {
        this.nodes().to$().removeClass("selected");
    });
    $(this).toggleClass("selected");

    let task_id = parseInt($(this).find("td").first().text());
    task_entriesTable.ajax.url( `/api/tasklog/${task_id}` ).load(function(){
        loadEntryStatus();
    });

    function loadEntryStatus(){
        let tr = $('#task_entries tbody tr');
        if($(tr).find("td").length == 1){return};
        $(tr).each(function(i){
        let td = $(this).find("td").last();
        let status = parseInt(td.text());
        if(status == 1){
            td.html("<img src='../assets/svg/check_noborder.svg'/>");
        }else{
            td.html("<img src='../assets/svg/warning_noborder.svg'/>");
        }
        })
      }
    
});