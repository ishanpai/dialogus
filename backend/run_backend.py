import asyncio
from base_bot import MyChatBot
from chatbot_listen import listen
import torch

model_name = "meta-llama/Meta-Llama-3-8B-Instruct"
access_token = "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"
URL = "wss://68de-73-93-233-54.ngrok-free.app"

if torch.cuda.is_available():
    device = torch.device("cuda")
    torch.cuda.empty_cache()
    print("CUDA is available. Using GPU.")
else:
    device = torch.device("cpu")
    print("CUDA is not available. Using CPU.")

# Load model and tokenizer
my_bot = MyChatBot(model_name, device, access_token)
print("Initialized chatbot")

asyncio.get_event_loop().run_until_complete(listen(URL, my_bot))
