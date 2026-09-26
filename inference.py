"""
Dr. AI — minimal inference wrapper.
Loads the standalone model `ehab215/DR-AI-V2` from Hugging Face (weights are hosted there)
and answers medical questions in Egyptian Arabic or English.

Usage:
    python inference.py --query "ايه اعراض نقص فيتامين د؟"
    python inference.py                      # interactive prompt
"""
import argparse
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = "ehab215/DR-AI-V2"
SYSTEM_PROMPT = (
    "You are Dr. AI, a specialized medical assistant. Answer the patient clearly and "
    "professionally in the same language they ask in (Egyptian Arabic or English), and "
    "always advise consulting a specialist for a definitive diagnosis."
)


class DrAI:
    def __init__(self, model_id: str = MODEL_ID, hf_token: str | None = None):
        use_cuda = torch.cuda.is_available()
        dtype = torch.bfloat16 if use_cuda else torch.float32
        self.tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id, torch_dtype=dtype, device_map="auto" if use_cuda else None, token=hf_token
        )
        self.model.eval()

    @torch.no_grad()
    def ask(self, query: str, system: str = SYSTEM_PROMPT, temperature: float = 0.7,
            top_p: float = 0.95, max_new_tokens: int = 512) -> str:
        messages = [{"role": "system", "content": system}, {"role": "user", "content": query}]
        inputs = self.tokenizer.apply_chat_template(
            messages, add_generation_prompt=True, return_tensors="pt", return_dict=True
        ).to(self.model.device)
        inputs.pop("token_type_ids", None)
        out = self.model.generate(
            **inputs, max_new_tokens=max_new_tokens, do_sample=True,
            temperature=temperature, top_p=top_p, repetition_penalty=1.05,
        )
        return self.tokenizer.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", type=str, default=None)
    ap.add_argument("--hf_token", type=str, default=None)
    args = ap.parse_args()

    bot = DrAI(hf_token=args.hf_token)
    if args.query:
        print(bot.ask(args.query))
    else:
        print("Dr. AI ready. Type your question (Ctrl-C to exit).")
        while True:
            try:
                q = input("\nYou: ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if q:
                print(f"\nDr. AI: {bot.ask(q)}")
