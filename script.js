// Establish socket connection and swap screens
function connect() {
  const playerName = document.getElementById("nameInput").value;
  if (!playerName) {
    alert("Please enter your name!");
    return;
  }

  // Show game UI, update status
  document.getElementById("game").style.display = "block";
  document.getElementById("status").innerText = `Connecting as "${playerName}"…`;

  // Example socket setup (adjust URL/logic as needed)
  const socket = io("https://your-trivia-server.com");
  socket.emit("join", { name: playerName });

  socket.on("joined", () => {
    document.getElementById("status").innerText = "Waiting for other players…";
  });

  socket.on("question", (q) => {
    // TODO: render question & answers
    console.log("New question:", q);
  });

  // handle further socket events…
}
