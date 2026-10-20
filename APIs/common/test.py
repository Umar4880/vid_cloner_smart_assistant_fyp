import os
import google.genai as genai
from google.genai import types
# import google.generativeai as genai

client = genai.Client(api_key="AIzaSyBL_NQArluP4BOA53aqP6uMvGUD08V_CQo")
# genai.configure(api_key="AIzaSyBL_NQArluP4BOA53aqP6uMvGUD08V_CQo")

# List all available models
# for model in genai.list_models():
#     print(f"Model Name: {model.name}")
#     print(f"Supported Actions: {model.supported_generation_methods}")
# response_text = llm.models.generate_content(
#     model="gemini-3-flash",
#     contents="Explain quantum computing in one sentence."
# )
# print(f"Text Response: {response_text.text}")


# 2. Generate content with image modality enabled
response = client.models.generate_content(
    model="nano-banana-pro-preview",
    contents="A futuristic city with flying cars in a synthwave style.",
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"]
    )
)

# 3. Process the response and save the image
for part in response.candidates[0].content.parts:
    if part.inline_data:
        # Save the binary image data to a file
        with open("generated_image.png", "wb") as f:
            f.write(part.inline_data.data)
        print("Success! Image saved as 'generated_image.png'")
    
    if part.text:
        print(f"Model Description: {part.text}")
