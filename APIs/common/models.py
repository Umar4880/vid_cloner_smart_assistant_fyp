from APIs.common.config import model_setting
from typing import Literal
from langchain_google_genai import ChatGoogleGenerativeAI

class Models:
    """Factory for LangChain Gemini chat models."""

    def __init__(self, thinking_level: Literal["low", "medium", "high"] = "medium"):
        self._text_model_name = model_setting.text_model
        self._video_model_name = model_setting.video_model
        self._alt_video_model_name = model_setting.alternate_video_model
        self._temperature = model_setting.temperature
        self._max_tokens = model_setting.max_tokens
        self._api_key = model_setting.api_key
        self.thinking_level = thinking_level
        self.media_resolution = "low"

    def get_precise_model(self):
        """Return multimodal Gemini model, falling back to alternate on failure."""
        try:
            return ChatGoogleGenerativeAI(
                model=self._video_model_name,
                api_key=self._api_key,
                temperature=self._temperature,
                max_output_tokens=self._max_tokens,
            )
        except Exception as e:
            print(f"Primary model failed: {e}. Trying alternate...")
            try:
                return ChatGoogleGenerativeAI(
                    model=self._alt_video_model_name,
                    api_key=self._api_key,
                    temperature=self._temperature,
                    max_output_tokens=self._max_tokens,
                )
            except Exception as final_error:
                print(f"Both models failed: {final_error}")
                raise final_error

    def get_fast_model(self):
        """Return text-only (fast) Gemini model."""
        return ChatGoogleGenerativeAI(
            model=self._text_model_name,
            api_key=self._api_key,
            temperature=self._temperature,
            max_output_tokens=self._max_tokens,
        )