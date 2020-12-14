$(function(){
    $(".input-group-text").on("click", function(){
        checkValue();
    });

    $("input[type='number'").on("change keyup", function(){
        checkValue();
    });

    function checkValue(){
        let val = parseInt($("input[type='number']").val());
        let number = parseInt($("#Anzahl").text());
        
        if((number + val) < 0){
            $("#Speichern").prop("disabled", true);
            $("#ErrorMsg").html(`Sie können nur maximal ${number} Artikel entnehmen.`);
        }else if(val == 0){
            $("#Speichern").prop("disabled", true);
        }
        else{
            $("#ErrorMsg").html("");    
            $("#Speichern").prop("disabled", false);
        }
        
    }

    $("#Speichern").on("click", function(){

        let val = parseInt($("input[type='number']").val());
        let number = parseInt($("#Anzahl").text());

        if((number + val) >= 0){
            let id = $("#id").text();
            number = number + val;
            let formdata = `id=${id}&number=${number}`;

            $.ajax({
                type: 'PATCH',
                url: "/storagePlace",
                data: formdata,
                processData: false,
                contentType: 'application/x-www-form-urlencoded',
                success: function () {
                  history.go(0);          
                }
                /* success and error handling omitted for brevity */
              });
        }
    });
});