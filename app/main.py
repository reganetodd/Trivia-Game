from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.game import TriviaGame

app = FastAPI()
game = TriviaGame()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your GitHub Pages domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/{player_name}")
async def websocket_endpoint(websocket: WebSocket, player_name: str):
    await game.connect(websocket, player_name)
    try:
        while True:
            data = await websocket.receive_json()
            await game.handle_message(websocket, player_name, data)
    except WebSocketDisconnect:
        game.disconnect(player_name)
