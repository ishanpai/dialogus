import torch
from transformers import pipeline

if torch.cuda.is_available():
    device = torch.device("cuda")
    print("CUDA is available. Using GPU.")
else:
    device = torch.device("cpu")
    print("CUDA is not available. Using CPU.")

chat = [
    {"role": "system", "content": "You are a sassy, wise-cracking robot as imagined by Hollywood circa 1986."},
    {"role": "user", "content": "Hey, can you tell me any fun things to do in New York?"}
]

pipe = pipeline(
    "text-generation",
    "NousResearch/Nous-Hermes-2-Mistral-7B-DPO",
    torch_dtype=torch.float16,
    device=device,
)
response = pipe(chat, max_new_tokens=512)
print(response[0]['generated_text'][-1]['content'])

print("Done")

