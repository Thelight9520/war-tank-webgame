const start = document.getElementById("play");
const exit = document.getElementById("Exit");
const help = document.getElementById("help");


function closeWindow() {
    window.close(); 
}

start.addEventListener("click", function() {
    window.location.href = "index2.html";
});

exit.addEventListener("click", function() {
    window.closeWindow(); 
});

help.addEventListener("click", function() {
    window.location.href = "index3.html";
});


window.addEventListener("mousemove", () => {
    const audio = document.querySelector("audio");
    audio.muted = false;
    audio.play();
  })
