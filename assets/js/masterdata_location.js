displayRootNodes();

//displays all locations without a parent
function displayRootNodes(){
    $.get( "/lagerorte/parent/0", function( data ) {
        $("#locationUL li").remove();
        for(var i = 0; i < data.length; i++){
            $("#locationUL").append(
                $("<li/>").append(
                    $("<span/>", {"class": "caret", "text": data[i].name, "data-id": data[i].id})
                ).append(
                    $("<ul/>", {"class": "nested"})
                )
            )
        }
      });
}

function getChildrenByParentId(parent){
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

function getLocationById(id){
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

//displays all children nodes from a parent
function displayChildNodes(parent){
    let parentId = $(parent).data("id");
    let children = getChildrenByParentId(parentId);

    //clears old children nodes before displaying the new ones
    $(parent).parent().find("ul").empty();

    for(var i = 0; i < children.length; i++){
        $($(parent).parent().find("ul").first()).append(
            $("<li/>").append(
                $("<span/>", {"class": "caret", "text": children[i].name, "data-id": children[i].id})
            ).append(
                $("<ul/>", {"class": "nested"})
            )
        )
    }

    let parentExists = parent.length > 0 ? true : false;
    if(parentExists){
        let dataFromSelectedEle = getLocationById(parentId);
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
        displayRootNodes();
    }
}

function getCreateNode(){
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

//checks if a location already exists
$("#locationUL").on("keyup", "input[name='name']", function() {
    let currentVal = $(this).val();
    let siblings = $(this).closest("li").siblings("li");
    let match = false;
    $(siblings).each(function(index, ele){
        let siblingText = $(ele).find("span").first().text();
        if(siblingText.replace(/\s/g, '').toLowerCase() == currentVal.replace(/\s/g, '').toLowerCase()){
            match = true;
        }
    })

    let button = $(this).parent().find("button");
    if(match){  //apply error message if a match was found
        $(this).css("color", "red");
        $(button).prop("disabled", true);

        if($(".LocationErrorMsg").length == 0){
            $(this).parent().append($("<br/>", {"class": "LocationErrorBr"})).append($("<span/>", {"class": "LocationErrorMsg", "text": "Dieser Eintrag existiert bereits."}))
        }
    }else{      
        if($(".LocationErrorMsg").length != 0){
            $(this).parent().find(".LocationErrorBr").remove();
            $(this).parent().find("span").remove();
        }

        $(this).css("color", "black");
        $(button).prop("disabled", false);
    }
});

//toggles arrow and edit/delete button when a location is clicked
$("#locationUL").on("click", ".caret", function() {
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
        displayChildNodes($(this));      
    }

});

//apply input fields to add a new location
$("#CreateNode").click(function(){
    $(".editForm").remove();

    let parentNode;
    if($(".selectedNode").length != 0){ //find correct parent element
        parentNode = $(".selectedNode").parent().find("ul").first();
    }else{
        parentNode = $("#locationUL");
    }

    let noCreateNodeExists = $(".CreateNode").length == 0;
    if(noCreateNodeExists){
        let createNode = getCreateNode();
        $(parentNode).append($(createNode))
    }

    $(".createForm").find("input[type='text']").focus();
    $(".createForm").find("input[type='text']").attr("required", "true");
});

//apply input fields to edit an existing location
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

//displays delete popup
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

$("#locationUL").on("submit", ".createForm", function(e){
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
                displayChildNodes(parentEle);
            })
        }

    }

});

$("#locationUL").on("submit", ".editForm", function(e){
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
      });
})