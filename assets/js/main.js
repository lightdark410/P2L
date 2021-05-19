$(document).ready(function () {

  $("#Logout").click(function () {
    $.get("/logout", function (data) {
      window.location.href = "/";
    });
  });

  //redirect if log icon was clicked
  $("#table").on("click", ".log", function (e) {
    //gets id of clicked row
    let id = $(this).parent().parent().children().eq(1).html().trim();
    window.location.href = `/logs/${id}`;
  });

  //hanlde list popup submit
  $("body").on("submit", ".list_popup form", function(event){
    event.preventDefault();
    let id = $(this).data("id");
    let change = $(this).serializeArray()[0].value;

    //check if the toggle was checked
    if($(this).serializeArray().length == 2){
      change = (change * -1).toString();      
    }

    //create list entry to store in cookies 
    let newEntry = {"id": id, "change": change};
    addToList(newEntry);
    
  });

  //stores on list entry in cookies
  function addToList(entry){
    let list = sessionStorage.getItem("list");
    let newList = [];

    if(list == null){
      newList[0] = entry;
    }else{
      newList = JSON.parse(list);
      //delete duplicate entries
      newList = newList.filter(obj => obj.id != entry.id);
      newList.push(entry);
    }
    sessionStorage.setItem("list", JSON.stringify(newList));
  }

  //handle stock popup submit
  $("body").on("submit", "#PopUp form", function(event){
    event.preventDefault();
    let id;
    //only define id if a row is selected
    if($(".selected").length > 0){
      id = $(".selected").find("td")[1].innerHTML;
    }

    //get all values from popup
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

    //only submit if a location was selected
    if(location > 0){
      var formdata = `id=${id}&name=${name}&location=${location}&number=${number}&minimum_number=${minimum_number}&category=${category}&keywords=${keywordArr}&unit=${unit}`;
    
      if(typeof id === 'undefined'){ 
        $.post('/stock', formdata, function (response) {
          history.go(0);
        });
      }else{
        $.ajax({
          type: 'PATCH',
          url: '/stock',
          data: formdata,
          processData: false,
          contentType: 'application/x-www-form-urlencoded',
          success: function () {
            history.go(0);          
          }
        });
      }
    }else{
      $("#location span").first().attr("style", "color: red !important");
    }
  });

  $("body").on("mouseenter", "#location ul li span", function(e){
    if($(this).data("empty_places") == 0){
      $(this).css("cursor", "no-drop");
    }
  })

});
