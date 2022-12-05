$("#Logout").click(function () {
  $.get("/logout", function (data) {
    window.location.href = "/";
  });
});

//triggers when click on the cover, navbar or close button on popup
$("body").on("click", "#cover, .navbar, #mdiv", function () {
  //only do smth if the keyword dropdown in the stock popup is closed
  if ($(".select-pure__select--opened").length == 0) {
    // remove articlenumber event listener
    $("#articlenumber")[0]?.removeEventListener(
      "input",
      checkForDuplicateArtNum
    );
    $("#name")[0]?.removeEventListener("input", checkForDuplicateArtName);
    $("#InventurPopUp form")[0]?.removeEventListener(
      "keydown",
      submitFormByEnterKey
    );
    $("#PopUp form").off("keydown", submitFormByEnterKey);

    //closes all popups
    $("#PopUp").fadeOut(300, () => $("#PopUp").remove());
    $("#InventurPopUp").fadeOut(300, () => $("#InventurPopUp").remove());
    $("#PopUpDelete").fadeOut(300, () => $("PopUpDelete").remove());
    $("#list_number_popup").fadeOut(300, () =>
      $("#list_number_popup").remove()
    );
    $("#list_popup").fadeOut(300, () => $("#list_popup").remove());
    //closes cover
    $("#cover").fadeOut();

    //close location dropdown
    $("#myUL ul").removeClass("active");
    // remove error messages
    $("#notificationBreak").remove();
    $("#notification").remove();
    $("#LocationNotification").remove();
    $("#artNumNotificationBreak").remove();
    $("#artNumNotification").remove();
    $("#InventurPopUp #InventurError").text("");

    $("#myUL").find("div").first().attr("style", "color: inherit");
    $("#myUL").find("div").first().removeAttr("data-id");
    $("#myUL").find("div").first().removeAttr("data-parent");
    $("#myUL").find("div").first().text("Ort auswählen");

    //clears all input field
    $("#PopUp input").each(function (i) {
      $(this).val("");
    });

    $("#InventurPopUp input").each(function (i) {
      $(this).val("");
    });

    //clears the number buttons in edit popup
    $("#number, #minimum_number").parent().find("span").remove();
    $("#number , #minimum_number").parent().find("br").remove();

    $("#number , #minimum_number").css("border", "none");
    $("#number , #minimum_number").css(
      "border-bottom",
      "1px solid rgb(0,60,121)"
    );

    $("#keywords").val("");
    $("#minimum_number").val("0");
  }
});
// });
