import json
import time

import websockets
from base_bot import MyChatBot


async def listen(url: str, chatbot: MyChatBot):
    async with websockets.connect(
        url, ping_interval=10, ping_timeout=None
    ) as websocket:
        print("Listening to websocket for messages. Ready to talk")
        while True:
            message = await websocket.recv()
            message = json.loads(message)
            print(f"message received: {message}")
            if message["topic"] == "chatbot":
                continue
            else:
                message = message["message"]
            print(f"User: {message}")
            # Handle the received message here
            start_time = time.time()
            output = {"topic": "chatbot", "message": chatbot.have_conversation(message)}
            end_time = time.time()
            await websocket.send(json.dumps(output))
            print(f"Time taken: {end_time - start_time} seconds")
