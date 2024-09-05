import json
import time
import asyncio
import websockets
from base_bot import MyChatBot


async def listen(url: str, chatbot: MyChatBot):
    async with websockets.connect(
        url, ping_interval=10, ping_timeout=None
    ) as websocket:
        print("Listening to websocket for messages. Ready to talk")
        while True:
            try:
                message = await websocket.recv()
                message = json.loads(message)
                print(f"message received: {message}")
                
                if message["topic"] == "chatbot":
                    continue
                
                user_message = message["message"]
                print(f"User: {user_message}")
                
                # Send "thinking" status to frontend
                await websocket.send(json.dumps({"topic": "status", "message": "thinking"}))
                
                # Process the message asynchronously
                response = await asyncio.get_event_loop().run_in_executor(
                    None, chatbot.have_conversation, user_message
                )
                
                # Send the response back to the frontend
                output = {"topic": "chatbot", "message": response}
                await websocket.send(json.dumps(output))
                
                # Send "ready" status to frontend
                await websocket.send(json.dumps({"topic": "status", "message": "ready"}))
                
                print(f"Bot: {response}")
                
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed. Attempting to reconnect...")
                break
            except Exception as e:
                print(f"An error occurred: {str(e)}")
                await websocket.send(json.dumps({"topic": "error", "message": str(e)}))

# Main loop to handle reconnection
async def main(url: str, chatbot: MyChatBot):
    while True:
        try:
            await listen(url, chatbot)
        except:
            print("Connection failed. Retrying in 5 seconds...")
            await asyncio.sleep(5)
