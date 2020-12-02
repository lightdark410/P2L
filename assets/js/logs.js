$('tr > td:first-child').each(function (i) {
    switch ($(this).html().trim()) {
        case "delete":
            // $(this).css("border", "1px solid red");
            $(this).css("background-color", "#ffadad");
            break;
        case "change":
            // $(this).css("border", "1px solid orange");
            $(this).css("background-color", "#fdffb6");
            break;
        case "create":
            // $(this).css("border", "1px solid #0096c7");
            $(this).css("background-color", "#9bf6ff");
            break;
        default:
            break;
    }
});