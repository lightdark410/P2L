$(document).ready(function () {

  function closePopup(){
    //when grey background or x button is clicked
    if($(".select-pure__select--opened").length == 0){

      $("#PopUp").fadeOut();
      $("#PopUpUpdate").fadeOut();
      $("#PopUpDelete").fadeOut();
      // $(document).unbind("keypress");
      $("#cover").fadeOut();
      $("#notification").fadeOut();

      $(".Tags").remove();

      $("#PopUp input").each(function (i) {
        $(this).val("");
      });

      $("#number, #minimum_number").parent().find("span").remove();
      $("#number , #minimum_number").parent().find("br").remove();

      $("#number , #minimum_number").css("border", "none");
      $("#number , #minimum_number").css("border-bottom", "1px solid rgb(0,60,121");

      $("#keywords , #minimum_number").val("");
  }

  }

  $("#Logout").click(function () {
    $.get("/logout", function (data) {
      window.location.href = "/";
    });
  });

  $("body").on("submit", "#PopUp form", function(event){
    event.preventDefault();
    var post_url = $(this).attr("action"); //get form action url 

    if(post_url == "/entry"){
      var id = $(".selected").find("td")[0].innerHTML;

    }
    var name = $("#name").val();
    var location = $("#location li span").first()[0].dataset.id;
    var number = $("#number").val();
    var minimum_number = $("#minimum_number").val();
    var category = $("#category").val();
    var keywords = $('.select-pure__selected-label');
    var keywordArr = [];
    var unit = $('#unit').val();
    $(keywords).each(function (i){
      keywordArr.push($(this).first().text());
    })

    if(location > 0){
      var formdata = `id=${id}&name=${name}&location=${location}&number=${number}&minimum_number=${minimum_number}&category=${category}&keywords=${keywordArr}&unit=${unit}`;
    
      switch (post_url) {
        case "/create":
          $.post(post_url, formdata, function (response) {
            //post data to server after submit
            // console.log("response: " + response);
            $('#table').DataTable().ajax.reload();
            closePopup();
            // history.go(0);
          });
          break;
        case "/entry":
          $.ajax({
            type: 'PATCH',
            url: post_url,
            data: formdata,
            processData: false,
            contentType: 'application/x-www-form-urlencoded',
            success: function () {
              history.go(0);          
            }
            /* success and error handling omitted for brevity */
          });
          break;
        default:
          break;
      }
    }else{
      console.log($("#location span").first());
      $("#location span").first().attr("style", "color: red !important");
    }


  });

  $("body").on("mouseenter", "#location ul li span", function(e){
    if($(this).data("empty_places") == 0){
      $(this).css("cursor", "no-drop");
    }
  })


});
