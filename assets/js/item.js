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
        let name = $("#Name").text();
        let sum = val + number;

        let store = val < 0 ? "Auslagern" : "Einlagern";

        let popUp = `
            <div class="popup">
                <form>
                <div class="popup_top">
                    ${store} von "${name}"
                    <div id="mdiv">
                        <div class="mdiv">
                            <div class="md"></div>
                        </div>
                    </div>
                </div>
                <div class="popup_mid">
                    <table>
                        <tr>
                            <td>
                                Aktuelle Anzahl:
                            </td>
                            <td>
                                ${number}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                ${store}:
                            </td>
                            <td>
                                ${Math.abs(val)}
                            </td>
                        </tr>
                        <tr>
                        <td>
                            Neue Anzahl:
                        </td>
                        <td>
                            ${sum}
                        </td>
                    </tr>
                    </table>
                    <button class="btn btn-success save mt-2 mb-1" type="button">Speichern</button>
                    <button class="btn btn-secondary cancel mt-2 mb-1" type="button">Abbrechen</button>
                </div>
                <div class="popup_foot"></div>
                </form>
            </div>
        `;

        let cover = '<div class="cover"></div>';

        $("body").prepend($(cover + popUp).hide().fadeIn());

        $(".popup_mid > .cancel").click(function () {
            $(".cover").fadeOut();
            $(".popup").fadeOut();
        })

    });
});

$("body").on("click", ".save", function(){
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
})
$("body").on("click", ".cover, #mdiv", function(){
    $(".cover").fadeOut();
    $(".popup").fadeOut();
})
