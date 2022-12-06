$("#Logout").click(function () {
  $.get("/logout", function (data) {
    window.location.href = "/";
  });
});
// });
