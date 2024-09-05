import argparse
import asyncio
import os

import torch
from base_bot import MyChatBot
from chatbot_listen import listen
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up argument parser
parser = argparse.ArgumentParser(
    description="Run the Python script with custom arguments"
)

# Adding optional arguments with default values
parser.add_argument("-address", type=str, required=True, help="Your server address")
parser.add_argument(
    "-model",
    type=str,
    default="meta-llama/Meta-Llama-3-8B-Instruct",
    help="Model name to use",
)

# Parse the arguments
args = parser.parse_args()

# Assign the arguments to variables
model_name = args.model
URL = args.address
access_token = os.getenv(
    "HF_ACCESS_TOKEN"
)  # Load the token from the environment variables

# Make sure the access token is available
if access_token is None:
    raise ValueError(
        "Access token is missing. Please check your .env file or set it in the environment."
    )

# Print or use the arguments in your code
print(f"Using Model: {model_name}")

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
