displayRootNodes();

//displays all locations without a parent
function displayRootNodes() {
  $.get("/api/storageLocation/parent/0", function (data) {
    $("#locationUL li").remove();
    for (const node of data) {
      $("#locationUL").append(
        $("<li/>")
          .append(
            $("<span/>", {
              class: "caret node-name",
              text: node.name,
              "data-id": node.id,
            })
          )
          .append($("<ul/>", { class: "nested" }))
      );
    }
  });
}

//gets all children storage location with a specific parent
function getChildrenByParentId(parentId) {
  let result = null;
  $.ajax({
    url: `/api/storageLocation/parent/${parentId}`,
    type: "get",
    async: false,
    success: function (data) {
      result = data;
    },
  });
  return result;
}

//gets one specific storage location by it´s id
function getLocationById(id) {
  let result = null;
  $.ajax({
    url: `/api/storageLocation/${id}`,
    type: "get",
    async: false,
    success: function (data) {
      result = data;
    },
  });
  return result;
}

//displays all children nodes from a parent
function displayChildNodes(parent) {
  const parentId = $(parent).data("id");
  const children = getChildrenByParentId(parentId);

  //clears old children nodes before displaying the new ones
  $(parent).parent().find("ul").empty();

  for (const node of children) {
    $($(parent).parent().find("ul").first()).append(
      $("<li/>")
        .append(
          $("<span/>", {
            class: "caret node-name",
            text: node.name,
            "data-id": node.id,
          })
        )
        .append($("<ul/>", { class: "nested" }))
    );
  }

  if (parent.length > 0) {
    const dataFromSelectedEle = getLocationById(parentId);

    if (dataFromSelectedEle.places !== 0) {
      $(parent)
        .parent()
        .find("ul")
        .first()
        .prepend(
          $("<span/>", {
            text: `Freie Lagerplätze: ${dataFromSelectedEle.empty_places}`,
            class: "empty_places",
          })
        )
        .prepend($("<br/>"))
        .prepend(
          $("<span/>", {
            text: `Lagerplätze: ${dataFromSelectedEle.places}`,
            class: "places",
            "data-places": dataFromSelectedEle.places,
            "data-empty_places": dataFromSelectedEle.empty_places,
          })
        );
    }
  } else {
    displayRootNodes();
  }
}

//return input fields to add a new location
function getCreateNode() {
  const node = $("<li/>", { class: "CreateNode" }).append(
    $("<form/>", { class: "createForm", action: "", method: "POST" })
      .append(
        $("<span/>", { class: "caret create" })
          .append(
            $("<input/>", {
              type: "text",
              placeholder: "Name...",
              name: "name",
              height: "32",
              maxlength: "15",
            })
          )
          .append(
            $("<input/>", {
              type: "number",
              value: 1,
              name: "number",
              height: "32",
              width: "65",
              min: "0",
              max: "1000",
            })
          )
          .append(
            $("<button/>", {
              type: "submit",
              class: "btn btn-success mb-1",
              text: "Speichern",
            })
          )
      )
      .append($("<ul/>", { class: "nested" }))
  );
  $(node).find("input:first").attr("autocomplete", "off");
  return node;
}

//checks if a location already exists
$("#locationUL").on("keyup", "input[name='name']", function () {
  const currentVal = $(this).val();
  const siblings = $(this).closest("li").siblings("li");
  let match = false;
  for (const elem of siblings) {
    const siblingText = $(elem).find("span.node-name").first().text();
    if (
      siblingText.replace(/\s/g, "").toLowerCase() ===
      currentVal.replace(/\s/g, "").toLowerCase()
    ) {
      match = true;
    }
  }

  const button = $(this).siblings("button");
  if (match) {
    //apply error message if a match was found
    $(this).css("color", "red");
    $(button).prop("disabled", true);

    if ($(".LocationErrorMsg").length === 0) {
      $(this)
        .parent()
        .append($("<br/>", { class: "LocationErrorBr" }))
        .append(
          $("<span/>", {
            class: "LocationErrorMsg",
            text: "Dieser Eintrag existiert bereits.",
          })
        );
    }
  } else {
    if ($(".LocationErrorMsg").length !== 0) {
      $(this).parent().find("br.LocationErrorBr").remove();
      $(this).parent().find("span.LocationErrorMsg").remove();
    }

    $(this).css("color", "black");
    $(button).prop("disabled", false);
  }
});

//toggles arrow and edit/delete button when a location is clicked
$("#locationUL").on("click", ".caret", function () {
  if ($(this).hasClass("create")) {
    // ignore click events on the create form
    return true;
  }
  $(".caret").removeClass("selectedNode");
  $(this).addClass("selectedNode");

  $(this).parent().find(".nested").toggleClass("active");
  $(this).toggleClass("caret-down");
  $(".CreateNode").remove();
  $(".editForm").remove();

  $("#EditNode").prop("disabled", false);
  $("#DeleteNode").prop("disabled", false);
  $("#CreateQRCode").prop("disabled", false);


  if ($(this).hasClass("caret-down")) {
    displayChildNodes($(this));
  }
});

//apply input fields to add a new location
$("#CreateNode").click(function () {
  $(".editForm").remove();

  let parentNode;
  if ($(".selectedNode").length !== 0) {
    //find correct parent element
    if (!$(".selectedNode").hasClass("caret-down")) {
      $(".selectedNode").click();
    }
    parentNode = $(".selectedNode").siblings("ul").first();
  } else {
    parentNode = $("#locationUL");
  }

  if ($(".CreateNode").length === 0) {
    let createNode = getCreateNode();
    $(parentNode).append($(createNode));
  }

  $(".createForm").find("input[name='name']").focus();
  $(".createForm").find("input[name='name']").attr("required", "true");
});

//apply input fields to edit an existing location
$("#EditNode").click(function () {
  $(".CreateNode").remove();
  $(".editForm").remove();

  const selectedText = $(".selectedNode").text();
  const selectedId = $(".selectedNode").data("id");
  const selectedEmptyPlaces =
    $(".selectedNode").parent().find(".places").data("empty_places") ?? 0;
  const places =
    $(".selectedNode").parent().find(".places").data("places") ?? 0;

  $(".selectedNode").after(
    $("<form/>", { class: "editForm", style: "margin-top: -20px" })
      .append($("<br>"))
      .append(
        $("<input/>", {
          type: "text",
          value: selectedText,
          name: "name",
          "data-id": selectedId,
          height: "32",
          maxlength: "15",
        })
      )
      .append(
        $("<input/>", {
          type: "number",
          value: places,
          name: "number",
          height: "32",
          width: "65",
          min: "0",
          max: "1000",
        })
      )
      .append(
        $("<button/>", {
          type: "submit",
          class: "btn btn-success mb-1",
          text: "Speichern",
        })
      )
  );

  $(".selectedNode").parent().find("input[name='name']").focus();
  $(".selectedNode")
    .parent()
    .find("input[name='name']")
    .attr("required", "true");
  $(".selectedNode").parent().find("input").attr("autocomplete", "off");

  $(".selectedNode")
    .parent()
    .find("input[type='number']")
    .on("input", function () {
      if ($(this).val < places - selectedEmptyPlaces) {
        $(".selectedNode").parent().find("button").prop("disabled", true);
      } else {
        $(".selectedNode").parent().find("button").prop("disabled", false);
      }
    });
});

//displays QR popup
$("#CreateQRCode").click(function () {
  $(".CreateNode").remove();
  $(".editForm").remove();

  const selectedText = $(".selectedNode").text();
  const selectedId = $(".selectedNode").data("id");
  

  let popUpMid = ``;

  
    popUpMid = `
        <div id="QR"></div>
        <div><a href="/inventur/${selectedId}">/inventur/${selectedId}</a></div>
        `;
  

  let popUp =
    `
        <div class="popup">
            <form>
            <div class="popup_top">
                
                <div id="mdiv">
                    <div class="mdiv">
                        <div class="md"></div>
                    </div>
                </div>
            </div>
            <div class="popup_mid">
            ` +
    popUpMid +
    `
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

  let cover = '<div class="cover"></div>';


  $("body").prepend(
    $(cover + popUp)
      .hide()
      .fadeIn()
  );

  new QRCode(document.getElementById("QR"), `/inventur/${selectedId}`);

  $(".popup_mid > .cancel").click(function () {
    $(".cover").fadeOut();
    $(".popup").fadeOut();
  });

  
});





//displays delete popup
$("#DeleteNode").click(function () {
  $(".CreateNode").remove();
  $(".editForm").remove();

  const selectedText = $(".selectedNode").text();
  const selectedId = $(".selectedNode").data("id");
  const selectedEmptyPlaces = $(".selectedNode").parent().find(".places").data("empty_places") ?? 0;
  const places =
    $(".selectedNode").parent().find(".places").data("places") ?? 0;

  const numberOfChildren = $(".selectedNode")
    .parent()
    .find("ul")
    .find("*[data-id]").length;

  let popUpMid = ``;

  if (numberOfChildren === 0 && places === selectedEmptyPlaces) {
    popUpMid = `
        <span>Sicher, dass Sie den Lagerort "${selectedText}" <b><u>unwiderruflich</u></b></span>
        <br>
        <span>von den Stammdaten löschen wollen?</span>
        <br>
        <button class="btn btn-danger delete" type="button">Löschen</button>
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `;
  } else {
    popUpMid = `
        "${selectedText}" Wird aktuell von Artikeln genutzt, oder enthält weitere Lagerorte und kann daher nicht gelöscht werden.
        <br>
        <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
        `;
  }

  let popUp =
    `
        <div class="popup">
            <form>
            <div class="popup_top">
                Lagerort löschen?
                <div id="mdiv">
                    <div class="mdiv">
                        <div class="md"></div>
                    </div>
                </div>
            </div>
            <div class="popup_mid">
            ` +
    popUpMid +
    `
            </div>
            <div class="popup_foot"></div>
            </form>
        </div>
    `;

  let cover = '<div class="cover"></div>';

  $("body").prepend(
    $(cover + popUp)
      .hide()
      .fadeIn()
  );

  $(".popup_mid > .cancel").click(function () {
    $(".cover").fadeOut();
    $(".popup").fadeOut();
  });

  $(".popup_mid > .delete").click(function () {
    $.ajax({
      url: `/api/storageLocationById/${selectedId}`,
      type: "DELETE",
      success: function (result) {
        location.reload();
      },
    });
  });
});

//submits a new storage location
$("#locationUL").on("submit", ".createForm", function (e) {
  e.preventDefault();

  const span = $(this).find("span");
  if ($(span).hasClass("create")) {
    const parentEle = $(this)
      .parent()
      .parent()
      .parent("li")
      .find("span")
      .first();
    const parentId = $(parentEle).data("id") ?? 0;

    const places = $(this).find("input[type='number']").val();
    if ($.isNumeric(places)) {
      const data = {
        name: $(span).find("input[type='text']").val(),
        parent: parentId,
        places: places,
      };

      $.post("/api/createStorageLocation", data, function (data) {
        displayChildNodes(parentEle);
      });
    }
  }
});

//submits a change to a storage location
$("#locationUL").on("submit", ".editForm", function (e) {
  e.preventDefault();

  const id = $(this).find("*[data-id]").data("id");
  const formdata = `${$(this).serialize()}&id=${id}`;

  $.ajax({
    type: "PATCH",
    url: "/api/storageLocation",
    data: formdata,
    processData: false,
    contentType: "application/x-www-form-urlencoded",
    success: function () {
      location.reload();
    },
  });
});

$("body").on("click", function (e) {
  let target = $(e.target);
  //remove selected location if user clicks anywhere besides these tags
  if (
    target.is(".caret") ||
    target.is("button") ||
    target.is(".places") ||
    target.is(".empty_places") ||
    target.is("i")
  ) {
    return;
  } else {
    $("span").removeClass("selectedNode");
    $("#EditNode").prop("disabled", true);
    $("#DeleteNode").prop("disabled", true);
    $("#CreateQRCode").prop("disabled", true);
  }
});
