import time

class TriviaGame:
    def __init__(self):
        self.players = {}  # player_name -> websocket
        self.answers = {}  # player_name -> answer
        self.scores = {}   # player_name -> score
        self.current_question = None
        self.answer_key = {}
        self.question_start_time = None

    async def connect(self, websocket, player_name):
        await websocket.accept()
        self.players[player_name] = websocket
        self.scores.setdefault(player_name, 0)

    def disconnect(self, player_name):
        self.players.pop(player_name, None)

    async def broadcast(self, message: dict):
        for ws in self.players.values():
            await ws.send_json(message)

    async def handle_message(self, websocket, player_name, data):
        if data["type"] == "submit_answer":
            if player_name not in self.answers:
                self.answers[player_name] = {
                    "answer": data["answer"],
                    "time": time.time() - self.question_start_time
                }

        elif data["type"] == "get_score":
            await websocket.send_json({
                "type": "score",
                "score": self.scores[player_name]
            })

    async def start_question(self, question_id, question_text):
        self.current_question = question_id
        self.answers = {}
        self.question_start_time = time.time()
        await self.broadcast({
            "type": "new_question",
            "question": question_text
        })

    async def end_question(self):
        correct_answer = self.answer_key.get(self.current_question)
        for player, data in self.answers.items():
            if data["answer"].strip().lower() == correct_answer.lower():
                time_bonus = max(0, 10 - data["time"])
                self.scores[player] += 100 + int(time_bonus)
        await self.broadcast({
            "type": "scores",
            "scores": self.scores
        })
