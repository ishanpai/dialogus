import time

import torch
from transformers import pipeline

from backend.base_bot import MyChatBot

if torch.cuda.is_available():
    device = torch.device("cuda")
    print("CUDA is available. Using GPU.")
else:
    device = torch.device("cpu")
    print("CUDA is not available. Using CPU.")

pipe = pipeline(
    "text-generation",
    "NousResearch/Nous-Hermes-2-Mistral-7B-DPO",
    torch_dtype=torch.float16,
    device=device,
)

my_bot = MyChatBot(
    pipe,
    [
        {
            "role": "system",
            "content": "You are a well read author who gives informative responses. Do not use any acronyms at all. Always limit your response to one paragraph.",
        }
    ],
)

start_time = time.time()
print(
    my_bot.have_conversation(
        "Hey, my name is Ishan and I am interested in tennis, football, artificial intelligence and mathematics. Say hi to me by name and suggest a topic of conversation for today."
    )
)
time_taken = time.time() - start_time
print(f"Time taken: {time_taken}")
print("Done")
