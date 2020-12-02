
$(".AddRow").click(function () {
    $(this).parent().children().eq(1).find("i").toggleClass("fa-chevron-down fa-chevron-up");
    var th = $(this).parent().parent().parent().find("th:eq(0)").html();
    console.log($(this).parent().siblings());
    if ($(this).parent().siblings().length == 0) {
        //console.log($(this));
        $(this).parent().after(`
            <tr>
            <td><input maxlength="20" class="StammInput" type="text" placeholder="${th}..."></td>
            <td><input type="submit" value="Speichern" onclick="addStamm(this)" class="StammSave" /></td>
            </tr>
    `);

        $(function () {
            var input = $(`input[placeholder="${th}..."`).get(0);
            console.log(input);
            input.focus();
        });

    } else {
        console.log("fehler");
        $(this).parent().siblings().first().remove();
    }

});

displayNodesWithoutParent();

function displayNodesWithoutParent(){
    $.get( "/lagerorte/parent/0", function( data ) {
        $("#myUL li").remove();
        for(var i = 0; i < data.length; i++){
            $("#myUL").append(
                $("<li/>").append(
                    $("<span/>", {"class": "caret", "text": data[i].name, "data-id": data[i].id})
                ).append(
                    $("<ul/>", {"class": "nested"})
                )
            )
        }
      });
}

function getChildren(parent){
    var result = null;
    $.ajax({
        url: `/lagerorte/parent/${parent}`,
        type: 'get',
        async: false,
        success: function(data) {
            result = data;
        } 
    });
    return result;
}

function getLagerortById(id){
    var result = null;
    $.ajax({
        url: `/lagerorte/${id}`,
        type: 'get',
        async: false,
        success: function(data) {
            result = data;
        } 
    });
    return result;
}

function displayNodeFromParent(parent){

    let parentDataId = $(parent).data("id");

    let data = getChildren($(parent).data("id"));

    $(parent).parent().find("ul").empty();

    for(var i = 0; i < data.length; i++){
        $($(parent).parent().find("ul").first()).append(
            $("<li/>").append(
                $("<span/>", {"class": "caret", "text": data[i].name, "data-id": data[i].id})
            ).append(
                $("<ul/>", {"class": "nested"})
            )
        )
    }

    let parentExists = parent.length > 0 ? true : false;
    if(parentExists){
        let dataFromSelectedEle = getLagerortById(parentDataId);
        dataFromSelectedEle = dataFromSelectedEle[0];
        
        if(dataFromSelectedEle.places != "0"){
            $(parent).parent().find("ul").first().prepend(
                $("<span/>", {"text": `Lagerplätze: ${dataFromSelectedEle.places}`})
            )
        }
    }else{
        displayNodesWithoutParent();
    }

}

function displayCreateNode(){
    let node = $("<li/>", {"class": "CreateNode"}).append(
        $("<form/>", {"class": "lagerortForm", "action": "", "method": "POST"}).append(
            $("<span/>", {"class": "caret create"}).append(
                $("<input/>", {"type": "text", "placeholder": "Name...", "name": "name", "height": "32"})
                ).append(
                    $("<input/>", {"type": "number", "value": 0, "name": "number", "height": "32", "width": "55", "min": "0", "max": "9999"})
                ).append(
                    $("<button/>", {"type": "submit", "class": "btn btn-outline-success mb-1", "text": "Speichern"})
                )
        ).append(
            $("<ul/>", {"class": "nested"})
        )
    );
    
    $(node).find("input:first").attr("autocomplete", "off");
    return node;
}

$("#myUL").on("keyup", "input[name='name']", function() {
    let currentVal = $(this).val();
    let liElements = $("#myUL li:not(:last)");
    let siblings = $(this).closest("li").siblings("li");
    let match = false;

    $(siblings).each(function(index, ele){
        let siblingText = $(ele).find("span").text();
        console.log(siblingText);
        if(siblingText.replace(/\s/g, '').toLowerCase() == currentVal.replace(/\s/g, '').toLowerCase()){
            match = true;
        }
    })

    let button = $(this).parent().find("button");
    if(match){
        console.log(match);
        $(this).css("color", "red");
        $(button).prop("disabled", true);

        if($(".LagerortErrorMsg").length == 0){
            $(this).parent().append(
                    $("<br/>")
                ).append(
                    $("<span/>", {"class": "LagerortErrorMsg", "text": "Dieser Eintrag existiert bereits."})
            )
        }
      

    }else{
        if($(".LagerortErrorMsg").length != 0){
            $(this).parent().find("br").remove();
            $(this).parent().find("span").remove();
        }

        $(this).css("color", "black");
        $(button).prop("disabled", false);
    }

});

$("#myUL").on("click", ".caret", function() {

    $(".caret").removeClass("selectedNode");

    this.parentElement.querySelector(".nested").classList.toggle("active");

    if($(this).find("input").length == 0){
        this.classList.toggle("caret-down");
        $(".CreateNode").remove();
    }
    if($(this).hasClass("caret-down")){
        if($(this).find("input").length == 0){
            $(this).addClass("selectedNode");
        }

        displayNodeFromParent($(this));
        
    }

});

$("#CreateNode").click(function(){
    let parentNode;
    if($(".selectedNode").length != 0){
        parentNode = $(".selectedNode").parent().find("ul").first();
        console.log(parentNode);
    }else{
        parentNode = $("#myUL");
    }

    let noCreateNodeExists = $(".CreateNode").length == 0;
    if(noCreateNodeExists){
        let createNode = displayCreateNode();
        $(parentNode).append(
            $(createNode)
        )
    }

    $(".lagerortForm").find("input[type='text']").focus();
    $(".lagerortForm").find("input[type='text']").attr("required", "true");
});

$("#myUL").on("submit", ".lagerortForm", function(e){
    e.preventDefault();

    let span = $(this).find("span");
    if($(span).hasClass("create")){
        let parentEle = $(this).parent().parent().parent("li").find("span").first();
        let parentId = $(parentEle).data("id");
        parentId = parentId ? parentId : 0;

        let places = $(this).find("input[type='number']").val();
        if($.isNumeric(places)){
            let data = {
                name : $(span).find("input[type='text']").val(),
                parent : parentId,
                places: places
            };

            $.post("/lagerorte", data, function(data){
                console.log(data);
                displayNodeFromParent(parentEle);
            })
        }

    }




});

$(".AddRow").hover(function () {
    $(this).css("cursor", "pointer");
});

function addStamm(x) {
    var input = $(x).parent().siblings(1).children();

    var placeholder = input.attr('placeholder');
    placeholder = placeholder.slice(0, placeholder.length - 3);

    var text = input.val();

    switch (placeholder) {
        case "Kategorie":
            placeholder = "category";
            break;
        case "Stichwörter":
            placeholder = "keyword";
            break;
        case "Einheit":
            placeholder = "unit";
            break;
        default:
            break;
    }
    if (text != "") {
        $(x).prop("disabled", true);
        $.post(`/stammdaten/${placeholder}`, { value: text }, function (data) {
            location.reload();
        });
    }
}

$("table").on("click", ".fa-trash", function () {

    let table = $(this).closest("table").find("th").first().text();
    let val = $(this).parent().prev().text();
    let number = $(this).parent().text();

    console.log("~~~~~~");
    console.log(table);
    console.log(val);
    console.log(number);
    console.log("~~~~~~");
    
    // var id = $(this).parent().siblings().first().html().trim();

    let popUpMid = ``;

    if(number == 0){
        popUpMid = `
        <span>Sicher, dass Sie "${val}" <b><u>unwiderruflich</u></b></span>
        <br>
        <span>von den Stammdaten löschen wollen?</span>
        <br>
        <input type="button" value="Löschen" />
        <input type="button" value="Abbrechen" />
        `;
    }else{
        popUpMid = `
        "${val}" Wird aktuell von ${number} Artikeln genutzt <br> und kann daher nicht gelöscht werden.
        <br>
        <input type="button" value="Abbrechen" />
        `;
    }

    let popUp = `
        <div class="popup">
            <form>
            <div class="popup_top">
                Stammdatum von "${table}" löschen
                <div id="mdiv"><div class="mdiv"><div class="md"></div></div></div>
            </div>
            <div class="popup_mid">
            `+popUpMid+`
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

    let cover = '<div class="cover"></div>';

    console.log($(popUp));
    $(".Stamm_container").prepend($(cover + popUp).hide().fadeIn());

    $(".cover, .popup_top > span, .popup_mid > input[value='Abbrechen']").click(function () {
        $(".cover").remove();
        $(".popup").remove();
    })

    $(".popup_mid > input[value='Löschen']").click(function () {
        console.log(val);
        $.ajax({
            url: `/stammdaten/${table}/${val}`,
            type: "DELETE",
            success: function (result) {
                location.reload();
            },
        });
    });


});
