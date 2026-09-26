# Dr. AI — Arabic / English Medical Assistant 🩺

A **4B bilingual (Egyptian Arabic + English) conversational medical assistant**, a two-stage
fine-tune of `google/medgemma-4b-it`. This repo lets you use the model from **GitHub** or
**Hugging Face**.

- 🤗 Model: https://huggingface.co/ehab215/DR-AI-V2
- 🤗 Stage-1 adapter: https://huggingface.co/ehab215/DR-AI-V1

> ⚠️ **Not a medical device.** Educational use only — always consult a qualified clinician.

## Install
```bash
pip install -r requirements.txt
```

## Use (weights are hosted on Hugging Face)
```bash
python inference.py --query "ايه اعراض نقص فيتامين د؟"
```
or from Python:
```python
from inference import DrAI
bot = DrAI()                      # downloads ehab215/DR-AI-V2 from HF on first run
print(bot.ask("What are the early signs of type 2 diabetes?"))
```

## Model
| | |
|---|---|
| Base | google/medgemma-4b-it (Gemma-3 4B) |
| Params | ~4B, bfloat16 |
| Languages | Egyptian Arabic, MSA, English |
| Fine-tuning context | 1024 tokens |
| Recommended gen | temperature=0.7, top_p=0.95, repetition_penalty=1.05 |

See the full model card on Hugging Face for training data, metrics and limitations.

## License
[Gemma Terms of Use](https://ai.google.dev/gemma/terms).
