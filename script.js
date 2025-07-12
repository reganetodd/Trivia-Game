let socket;  // Make socket accessible globally

function connect() {
  const playerName = document.getElementById("nameInput").value;
  if (!playerName) {
    alert("Please enter your name!");
    return;
  }

  // Show game UI, update status
  document.getElementById("game").style.display = "block";
  document.getElementById("status").innerText = `Connecting as "${playerName}"…`;

  // ✅ Use native WebSocket for FastAPI
  socket = new WebSocket(`wss://trivia-game-2-5x8n.onrender.com/ws/${playerName}`);

  socket.onopen = () => {
    document.getElementById("status").innerText = "Connected. Waiting for questions…";
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("📨 New message:", data);

    if (data.type === "new_question") {
      document.getElementById("questionText").innerText = data.question;
    }

    if (data.type === "scores") {
      const leaderboard = Object.entries(data.scores)
        .map(([name, score]) => `${name}: ${score}`)
        .join("\n");
      document.getElementById("leaderboard").innerText = leaderboard;
    }
  };

  socket.onerror = (err) => {
    document.getElementById("status").innerText = "Connection error!";
    console.error("WebSocket error:", err);
  };

  socket.onclose = () => {
    document.getElementById("status").innerText = "Disconnected.";
  };
}

// To submit an answer:
function submitAnswer() {
  const answer = document.getElementById("answerInput").value;
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "submit_answer", answer }));
    document.getElementById("status").innerText = "Answer submitted.";
  } else {
    alert("You're not connected!");
  }
}

