let url = window.location.pathname;
let id = url.substring(url.lastIndexOf('/') + 1);

let req;
$.ajax({
    url: `/api/mobileList/${id}`,
    async: false,
    success: function(reqData) {
        req = JSON.parse(reqData);
    }, error: function(xhr, ajaxOptions, thrownError){
        $("#itemDiv").text("400 Bad Request - Auftrag existiert nicht.");
    }
});

let tableIndex = $("#itemlist_div").data("index"); 
//get all svg´s
let svg_paths = ["../assets/svg/cross.svg", "../assets/svg/check.svg", "../assets/svg/warning.svg"];
let svg_noborder_paths = ["../assets/svg/cross_noborder.svg", "../assets/svg/check_noborder.svg", "../assets/svg/warning_noborder.svg"];
let data = req.data;
if(req.status == 0){
    let ledColor;
    try {
        ledColor = JSON.parse(req.color);
    } catch (error) {
        ledColor = "";        
    }
    loadLedColor(ledColor);
    $("#total_pages").text(data.length);
    renderItemData(tableIndex);
    renderListTableData();
}else{
    $("#itemDiv").text("Auftrag abgeschlossen");
}


//render all data in the table
function renderItemData(tableIndex){
    if(typeof data[tableIndex] !== 'undefined'){
        
        $("#itemlist_div").attr("data-index", tableIndex); //updates the data property of the table
        $("#curr_page").text(tableIndex + 1);      //updates page number

        loadSvg(tableIndex);

        let obj = data[tableIndex];
        $("#id").text(obj.stock_id);
        $("#name").text(obj.articleName);
        $("#amount").text(obj.amount);
        if(obj.lay_in == 1){
            $("#amountTh").text("Einlagern");
            $("#amountDiv").css("background-color", "rgba(131,255,131,0.6)");
        }else{
            $("#amountTh").text("Auslagern");
            $("#amountDiv").css("background-color", "rgba(131,195,255,0.6)");
        }
        $("#storage").text(data[tableIndex].storage);
        $("#storage_place").text(data[tableIndex].storage_place);
    }
}

//displays all entries
function renderListTableData(){
    let tbody = $("#listDiv table tbody");
    let storageStates = JSON.parse(localStorage.getItem("mobileList")).states;
    $(tbody).html("");

    let anyStateisZero = false;

    for(var i = 0; i < data.length; i++){
        $(tbody).append(`
            <tr class="d-flex pr-1" data-index="${i}">
                <td class="col-4">${data[i].articleName}</td>
                <td class="col-4">${data[i].storage}</td>
                <td class="col-4" style="padding-left: 0; padding-right: 0;"><img src="${svg_noborder_paths[storageStates[i]]}" alt=""></td>
            </tr>
        `)

        if(storageStates[i] == 0){
            anyStateisZero = true;
        }
    }

    if(anyStateisZero){
        $("#listDiv button").attr("disabled", true);
    }else{
        $("#listDiv button").attr("disabled", false);
    }
}

function loadSvg(tableIndex){
    let storage = localStorage.getItem("mobileList");

    if(storage === null || JSON.parse(storage).id != id){
        let states = new Array(data.length).fill(0);
        let json = {"id": id, "states": states};
        localStorage.setItem("mobileList", JSON.stringify(json));
    }else if(JSON.parse(storage).id == id){
        let state = JSON.parse(storage).states[tableIndex];
        $("#switch img").attr("src", svg_paths[state]);
    }
}

function loadLedColor(color){
    if(Array.isArray(color) && color.length == 3){
        $("#led").css("background-color", `rgb(${color[0]}, ${color[1]}, ${color[2]})`);
    }else{
        $("#led").remove();
    }
}

//switch svg when button was clicked
$("#switch img").click(function(){
    let curr_path = $(this).attr("src");
    let curr_index = svg_paths.findIndex(ele => ele == curr_path);
    let next_index;
    //set index to 0 if the end of the array is reached 
    curr_index == svg_paths.length - 1 ? next_index = 0 : next_index = curr_index + 1;
    //set new svg
    $(this).attr("src", svg_paths[next_index]);
    $(this).attr("data-index", next_index);

    
    //update localStorage
    let table_index = document.getElementById("itemlist_div").dataset.index;

    $.ajax({
        url: '/api/mobileList',
        type: 'PUT',
        data: `list_id=${data[table_index].list_id}&stock_id=${ data[table_index].stock_id}&status=${next_index}`,
        success: function(data) {
        }
    });
    let storage = JSON.parse(localStorage.getItem("mobileList"));
    storage.states[table_index] = next_index;
    localStorage.setItem("mobileList", JSON.stringify(storage));
});

//load item if it was clicked in list
$("body").on("click", "#listDiv tbody tr", function(){
    let index = $(this).attr("data-index");
    toggleView();
    renderItemData(parseInt(index));
})

//submit finished list
$("body").on("click", "#listDiv button", function() {
    for(let i = 0; i < data.length; i++){
        let number;
        if(data[i].lay_in == 0){
            number = data[i].number - data[i].amount;
        }else{
            number = data[i].number + data[i].amount;
        }
        $.ajax({
            url: '/api/storagePlace',
            type: 'PATCH',
            data: `id=${data[i].stock_id}&number=${number}&username=${data[i].creator}`,
            success: function(data){

            }
        })
    }
    $.ajax({
        url: '/api/mobileList',
        type: 'DELETE',
        data: `auftrag=${data[0].list_id}`,
        success: function(data){

        }
    })

    $("#listDiv button").attr("disabled", true);
})

function toggleView(){
    $("#itemDiv").toggle();
    $("#listDiv").toggle();
}