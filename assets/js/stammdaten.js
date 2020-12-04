
$(".AddRow").click(function () {
    $(this).parent().children().eq(1).find("i").toggleClass("fa-chevron-down fa-chevron-up");
    var th = $(this).parent().parent().parent().find("th:eq(0)").html();
    var label = $(this).closest("form").find("h2").text();
    console.log(label);
    if ($(this).parent().siblings().length == 0) {
        //console.log($(this));
        $(this).parent().after(`
            <tr>
            <td>
                <input maxlength="20" class="StammInput" type="text" placeholder="${label}...">
                <input type="submit" value="Speichern" onclick="addStamm(this)" class="StammSave" />
            </td>
            </tr>
        `);

        $(function () {
            var input = $(`input[placeholder="${label}..."`).get(0);
            input.focus();
        });

    } else {
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
                $("<span/>", {"text": `Freie Lagerplätze: ${dataFromSelectedEle.empty_places}`})
            ).prepend(
                $("<br/>")
            ).prepend(
                $("<span/>", {"text": `Lagerplätze: ${dataFromSelectedEle.places}`, "class": "places", "data-places": dataFromSelectedEle.places, "data-empty_places": dataFromSelectedEle.empty_places})
            )
        }
    }else{
        displayNodesWithoutParent();
    }

}

function displayCreateNode(){
    let node = $("<li/>", {"class": "CreateNode"}).append(
        $("<form/>", {"class": "createForm", "action": "", "method": "POST"}).append(
            $("<span/>", {"class": "caret create"}).append(
                $("<input/>", {"type": "text", "placeholder": "Name...", "name": "name", "height": "32"})
                ).append(
                    $("<input/>", {"type": "number", "value": 0, "name": "number", "height": "32", "width": "55", "min": "0", "max": "9999"})
                ).append(
                    $("<button/>", {"type": "submit", "class": "btn btn-success mb-1", "text": "Speichern"})
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
    $("#EditNode").prop("disabled", true);
    $("#DeleteNode").prop("disabled", true);

    this.parentElement.querySelector(".nested").classList.toggle("active");

    if($(this).find("input").length == 0){
        this.classList.toggle("caret-down");
        $(".CreateNode").remove();
        $(".editForm").remove();

    }
    if($(this).hasClass("caret-down")){
        if($(this).find("input").length == 0){
            $(this).addClass("selectedNode");
            $("#EditNode").prop("disabled", false);
            $("#DeleteNode").prop("disabled", false);
        }

        displayNodeFromParent($(this));
        
    }

});

$("#CreateNode").click(function(){
    $(".editForm").remove();

    let parentNode;
    if($(".selectedNode").length != 0){
        parentNode = $(".selectedNode").parent().find("ul").first();
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

    $(".createForm").find("input[type='text']").focus();
    $(".createForm").find("input[type='text']").attr("required", "true");
});

$("#EditNode").click(function(){
    $(".CreateNode").remove();
    $(".editForm").remove();

    let selectedText = $(".selectedNode").text();
    let selectedId = $(".selectedNode").data("id");
    let selectedEmptyPlaces = $(".selectedNode").parent().find(".places").data("empty_places");
    let places = $(".selectedNode").parent().find(".places").data("places");
    places = places ? places : 0;

    $(".selectedNode").after(
        $("<form/>", {"class": "editForm", "style": "margin-top: -20px"}).append(
            $("<br>")
        ).append(
            $("<input/>", {"type": "text", "value": selectedText, "name": "name", "data-id": selectedId, "height": "32"})
        ).append(
            $("<input/>", {"type": "number", "value": places, "name": "number", "height": "32", "width": "55", "min": "0", "max": "9999"})
        ).append(
            $("<button/>", {"type": "submit", "class": "btn btn-success mb-1", "text": "Speichern"})
        )
    )

    $(".selectedNode").parent().find("input[type='text']").focus();
    $(".selectedNode").parent().find("input[type='text']").attr("required", "true");
    $(".selectedNode").parent().find("input").attr("autocomplete", "off");
    
    $(".selectedNode").parent().find("input[type='number']").on("input", function(){
        let val = $(this).val();
        if(val < (places - selectedEmptyPlaces)){
            $(".selectedNode").parent().find("button").prop("disabled", true);
        }else{
            $(".selectedNode").parent().find("button").prop("disabled", false);

        }
    })
})

$("#DeleteNode").click(function(){
    $(".CreateNode").remove();
    $(".editForm").remove();

    let selectedText = $(".selectedNode").text();
    let selectedId = $(".selectedNode").data("id");
    let selectedEmptyPlaces = $(".selectedNode").parent().find(".places").data("empty_places");
    let places = $(".selectedNode").parent().find(".places").data("places");

    selectedEmptyPlaces = selectedEmptyPlaces ? selectedEmptyPlaces : 0;
    places = places ? places : 0;

    let numberOfChildren = $(".selectedNode").parent().find("ul").find("*[data-id]").length;
    
    if(numberOfChildren == 0 && places == selectedEmptyPlaces){
        console.log("kann gelöscht werden");
    }else{
        console.log("Kann nicht gelöscht werden du fotze");
    }

    let popUpMid = ``;

    if(numberOfChildren == 0 && places == selectedEmptyPlaces){
        popUpMid = `
        <span>Sicher, dass Sie "${selectedText}" <b><u>unwiderruflich</u></b></span>
        <br>
        <span>von den Stammdaten löschen wollen?</span>
        <br>
        <button class="btn btn-danger delete" type="button">Löschen</button>
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `;
    }else{
        popUpMid = `
        "${selectedText}" Wird aktuell von Artikeln genutzt, oder enthällt weiter Lagerorte und kann daher nicht gelöscht werden.
        <br>
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `;
    }

    let popUp = `
        <div class="popup">
            <form>
            <div class="popup_top">
                Stammdatum von Ort löschen
                <div id="mdiv">
                    <div class="mdiv">
                        <div class="md"></div>
                    </div>
                </div>
            </div>
            <div class="popup_mid">
            `+popUpMid+`
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

    let cover = '<div class="cover"></div>';

    $(".Stamm_container").prepend($(cover + popUp).hide().fadeIn());

    $(".popup_mid > .cancel").click(function () {
        $(".cover").fadeOut();
        $(".popup").fadeOut();
    })

    $(".popup_mid > .delete").click(function () {        
        $.ajax({
            url: `/stammdaten/storageLocation/${selectedId}`,
            type: "DELETE",
            success: function (result) {
                location.reload();
            }
        });

    });

})

$("#myUL").on("submit", ".editForm", function(e){
    e.preventDefault();

    let id = $(this).find("*[data-id]").data("id");
    let formdata = $(this).serialize();
    formdata += "&id=" + id;

    $.ajax({
        type: 'PATCH',
        url: "/lagerorte",
        data: formdata,
        processData: false,
        contentType: 'application/x-www-form-urlencoded',
        success: function () {
          history.go(0);          
        }
        /* success and error handling omitted for brevity */
      });
})

$("#myUL").on("submit", ".createForm", function(e){
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
        case "Stichwort":
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
    let val = $(this).parent().text();
    let number = null;

    $.ajax({
        'async': false,
        'type': "GET",
        'global': false,
        'url': `/stammdaten/${table}/${val}`,
        'success': function (data) {
          number = data[0].number;
        }
      });

    let popUpMid = ``;

    if(number == 0){
        popUpMid = `
        <span>Sicher, dass Sie "${val}" <b><u>unwiderruflich</u></b></span>
        <br>
        <span>von den Stammdaten löschen wollen?</span>
        <br>
        <button class="btn btn-danger delete" type="button">Löschen</button>
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `;
    }else{
        popUpMid = `
        "${val}" Wird aktuell von ${number} Artikeln genutzt <br> und kann daher nicht gelöscht werden.
        <br>
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `;
    }

    let popUp = `
        <div class="popup">
            <form>
            <div class="popup_top">
                Stammdatum von "${table}" löschen
                <div id="mdiv">
                    <div class="mdiv">
                        <div class="md"></div>
                    </div>
                </div>
            </div>
            <div class="popup_mid">
            `+popUpMid+`
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

    let cover = '<div class="cover"></div>';

    $(".Stamm_container").prepend($(cover + popUp).hide().fadeIn());

    $(".popup_mid > .cancel").click(function () {
        $(".cover").fadeOut();
        $(".popup").fadeOut();
    })

    $(".popup_mid > .delete").click(function () {
        switch (table) {
            case "Kategorie":
                table = "category"
                break;
            case "Stichwörter":
                table = "keyword"
                break;
            case "Einheit":
                table = "unit"
                break;
            default:
                break;
        }
        $.ajax({
            url: `/stammdaten/${table}/${val}`,
            type: "DELETE",
            success: function (result) {
                location.reload();
            },
        });
    });


});

$("body").on("click", ".cover, #mdiv", function(){
    $(".cover").fadeOut();
    $(".popup").fadeOut();
})