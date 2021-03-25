$('tr > td:first-child').each(function (i) {
    switch ($(this).html().trim()) {
        case "delete":
            $(this).css("background-color", "#ffadad");
            break;
        case "change":
            $(this).css("background-color", "#fdffb6");
            break;
        case "create":
            $(this).css("background-color", "#9bf6ff");
            break;
        default:
            break;
    }
});