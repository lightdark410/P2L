const closePopUp = function () {
  $(".cover").fadeOut();
  $(".cover").remove();
  $(".popup").fadeOut();
  $(".popup").remove();
};
// higher-order function returning the handler to show the create form
const createStammdatenTemplate = function (stammdatenType) {
  const validTypes = ["category", "keyword", "unit"];
  if (!validTypes.includes(stammdatenType)) {
    return () => console.log("invalid stammdatenType");
  }
  const tableWrapperName = {
    category: "#kategorieTable_wrapper",
    keyword: "#keywordsTable_wrapper",
    unit: "#unitTable_wrapper",
  };
  const placeholderText = {
    category: "Kategorie",
    keyword: "Stichwort",
    unit: "Einheit",
  };
  return function () {
    //toggle arrow icon
    $(this).find("i").first().toggleClass("fa-chevron-down fa-chevron-up");
    const inputMask = $(
      tableWrapperName[stammdatenType] + " .create-stammdaten-mask"
    );
    if (inputMask.length !== 0) {
      inputMask.remove();
    } else {
      $(this).parent().after(`
              <tr class="create-stammdaten-mask">
                <td>
                  <form data-type="${stammdatenType}">
                    <input maxlength="20" class="StammInput" type="text" placeholder="${placeholderText[stammdatenType]}...">
                    <input type="submit" value="Speichern" class="StammSave" />
                  </form>
                </td>
              </tr>
          `);
      //apply focus
      const input = $(
        tableWrapperName[stammdatenType] + " .create-stammdaten-mask input"
      ).get(0);
      input.focus();
    }
  };
};
// higher-order function returning the hanlder to delete a Stammdatum
const deleteStammdatenTemplate = function (stammdatenType) {
  const validTypes = ["category", "keyword", "unit"];
  if (!validTypes.includes(stammdatenType)) {
    return () => console.log("invalid stammdatenType");
  }
  const tableName = {
    category: "#kategorieTable",
    keyword: "#keywordsTable",
    unit: "#unitTable",
  };
  const translatedType = {
    category: "Kategorie",
    keyword: "Stichwort",
    unit: "Einheit",
  };
  return function () {
    const name = $(this).parent().text();
    const currTR = $(this).closest("tr");
    const id = $(tableName[stammdatenType]).DataTable().row(currTR).data()[
      "id"
    ];
    let number = null;
    let authorised;

    $.ajax({
      async: false,
      type: "GET",
      global: false,
      url: "/api/user",
      success: function (data) {
        if (data.title === "Auszubildender") {
          authorised = false;
        } else {
          authorised = true;
        }
      },
    });

    let popUpMid = ``;
    if (authorised) {
      $.ajax({
        async: false,
        type: "GET",
        global: false,
        url: `/api/${stammdatenType}ById/${id}`,
        success: function (data) {
          number = data.article_count;
        },
      });

      if (number === 0) {
        popUpMid = `
            <span>Sicher, dass Sie das ${translatedType[stammdatenType]} "${name}" <b><u>unwiderruflich</u></b></span>
            <br>
            <span>von den Stammdaten löschen wollen?</span>
            <br>
            <button class="btn btn-danger delete" type="button">Löschen</button>
            <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
            `;
      } else {
        popUpMid = `
            "${name}" Wird aktuell von ${number} Artikeln genutzt <br> und kann daher nicht gelöscht werden.
            <br>
            <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
            `;
      }
    } else {
      popUpMid = `
          Sie haben keine Berechtigung Stammdaten zu löschen!
          <br />
          <button class="btn btn-secondary cancel" type="button">Abbrechen</button>
          `;
    }

    let popUp = `
          <div class="popup">
              <form>
              <div class="popup_top">
                  ${translatedType[stammdatenType]} löschen?
                  <div id="mdiv">
                      <div class="mdiv">
                          <div class="md"></div>
                      </div>
                  </div>
              </div>
              <div class="popup_mid">
              ${popUpMid}
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

    $(".popup_mid > .cancel").click(closePopUp);

    if (authorised) {
      $(".popup_mid > .delete").click(function () {
        $.ajax({
          url: `/api/${stammdatenType}ById/${id}`,
          type: "DELETE",
          success: function (result) {
            location.reload();
          },
        });
      });
    }
  };
};

// displays input field to create a new Stammdatum
$("body").on(
  "click",
  "#keywordsTable_wrapper .AddRow",
  createStammdatenTemplate("keyword")
);
$("body").on(
  "click",
  "#kategorieTable_wrapper .AddRow",
  createStammdatenTemplate("category")
);
$("body").on(
  "click",
  "#unitTable_wrapper .AddRow",
  createStammdatenTemplate("unit")
);

// submits the request to create a new Stammdatum
$("body").on("submit", ".create-stammdaten-mask form", function (event) {
  event.preventDefault();
  const inputVal = $(this).find("input").val();
  const type = $(this).data("type");
  $.post(`/api/stammdaten/${type}`, { value: inputVal }, function () {
    location.reload();
  });
});

//handles scrolling if location inputs on tablet were clicked
$("#locationUL").on("focusin", "input", function () {
  if (screen.width < 1400) {
    this.scrollIntoView();
    let scrolledY = window.scrollY;
    window.scrollTo(0, scrolledY - 100);
  }
});

$(".AddRow").hover(function () {
  $(this).css("cursor", "pointer");
});

// displays delete popup when clicking on the "trash" icon
$("#keywordsTable").on(
  "click",
  ".fa-trash",
  deleteStammdatenTemplate("keyword")
);
$("#kategorieTable").on(
  "click",
  ".fa-trash",
  deleteStammdatenTemplate("category")
);
$("#unitTable").on("click", ".fa-trash", deleteStammdatenTemplate("unit"));

// closes popup if "x" button or background is clicked
$("body").on("click", ".cover, #mdiv", closePopUp);
