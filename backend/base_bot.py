from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import logging

logging.basicConfig(level=logging.INFO)


class MyChatBot:
    def __init__(self, model_name: str, device: torch.device, access_token):
        self.model = AutoModelForCausalLM.from_pretrained(model_name, device_map="auto", trust_remote_code=True, token=access_token)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, token=access_token)
        self.device = device
        self.response = None

    # Define the function to generate chatbot responses
    def have_conversation(self, new_text: str, max_new_tokens: int = 128) -> str:
        if self.response is None:
            chat = [
                {
                    "role": "system",
                    "content": "You are Dialogus, aka Gus, a voice assistant who is a great conversationalist. Since you are a voice assistant, keep your responses short and to the point and speak like a human. Whenever somebody introduces themselves, introduce yourself and suggest some topics for conversation based on their interests. You always avoid listing things. Never say goodbye unless you are explicitly told to say goodbye."
                },
                {"role": "user", "content": new_text}
            ]
        else:
            chat = self.response + [{"role": "user", "content": new_text}]
            if len(chat) > 10:
                chat = chat[:2] + chat[-8:]  # Keeping 5 rounds of conversation (user + assistant)

        inputs = self.tokenizer.apply_chat_template(
            chat,
            add_generation_prompt=True,
            return_tensors="pt",
            return_dict=True,
        ).to(self.device)

        terminators = [
            self.tokenizer.eos_token_id,
            self.tokenizer.convert_tokens_to_ids("<|eot_id|>")
        ]

        outputs = self.model.generate(
            inputs.input_ids,
            max_new_tokens=max_new_tokens,
            eos_token_id=terminators,
            do_sample=True,
            temperature=0.6,
            top_p=0.9,
            attention_mask=inputs.attention_mask
        )
        response = outputs[0][inputs.input_ids.shape[-1]:]
        response_text = self.tokenizer.decode(response, skip_special_tokens=True)
        self.response = chat + [{"role": "assistant", "content": response_text}]
        return response_text

#   def have_conversation(self, new_text: str, max_new_tokens: int = 128) -> None:
#     if self.response is None:
#         chat = [
#             {
#                 "role": "system",
#                 "content": "You are Dialogus, aka Gus, a voice assistant who is a great conversationalist. Since you are a voice assistant, keep your responses short and to the point and speak like a human. Whenever somebody introduces themselves, introduce yourself and suggest some topics for conversation based on their interests. You always avoid listing things. Never say goodbye unless you are explicitly told to say goodbye."
#             },
#             {"role": "user", "content": new_text}
#         ]
#     else:
#         chat = self.response + [{"role": "user", "content": new_text}]
#         if len(chat) > 10:
#             chat = chat[-10:]  # Keeping 5 rounds of conversation (user + assistant)

#     response = self.pipe(chat, max_new_tokens=max_new_tokens)

#     # Only allow complete sentences
#     response_text = truncate_to_complete_sentence(response[0]["generated_text"][-1]["content"])
#     self.response = chat + [{"role": "assistant", "content": response_text}]

#     # Log the memory usage
#     logging.info(f"Memory Allocated: {torch.cuda.memory_allocated()}")
#     logging.info(f"Memory Reserved: {torch.cuda.memory_reserved()}")

#     # Release unused memory
#     torch.cuda.empty_cache()

#     return response_text


def truncate_to_complete_sentence(text):
    # Define the punctuation marks that signify the end of a sentence
    sentence_endings = {'.', '!', '?'}

    # Find the position of the last occurrence of any sentence-ending punctuation
    last_pos = max(text.rfind(p) for p in sentence_endings)

    # If there's no sentence-ending punctuation, return the original string
    if last_pos == -1:
        return text

    # Return the string truncated to the last sentence-ending punctuation
    return text[:last_pos + 1]
