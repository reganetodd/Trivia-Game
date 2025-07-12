let socket;

function connect() {
  const name = document.getElementById("nameInput").value;
  if (!name) {
    alert("Enter your name");
    return;
  }

  // Replace this with your actual Replit backend URL
  const url = "wss://your-replit-name.your-username.repl.co/ws/" + name;
  socket = new WebSocket(url);

  socket.onopen = () => {
    document.getElementById("game").style.display = "block";
    document.getElementById("status").innerText = "Connected!";
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.question) {
      document.getElementById("question").innerText = data.question;
    }
    if (data.feedback) {
      document.getElementById("status").innerText = data.feedback;
    }
  };

  socket.onclose = () => {
    document.getElementById("status").innerText = "Disconnected.";
  };
}

function submitAnswer() {
  const answer = document.getElementById("answerInput").value;
  socket.send(JSON.stringify({ answer }));
  document.getElementById("answerInput").value = "";
}
