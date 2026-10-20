from APIs.common.models import Models
from APIs.common.load_prompts import PromptLoader
from APIs.common.fetch_yt import get_yt_transcript
from APIs.common.assemblyai_transcriber import transcribe_from_url
from .memory import summarize_memory
from typing import Literal, Optional, BinaryIO, Union
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
import base64


class Summarizer_chain:
    """
    Orchestrates note generation / update for two source types and two modes.

    source_type
    -----------
    • "youtube"  → YouTube URL is in ``source_url``
    • "upload"   → raw file object is in ``upload_file``

    mode
    ----
    • "fast"     → transcript (text-only) is fed to the LLM
    • "precise"  → raw video/audio is fed directly to Gemini (multimodal)

    action
    ------
    • "generate" → create notes from scratch
    • "update"   → revise existing notes with user instructions
    """

    def __init__(
        self,
        user_id: str,
        session_id: str,
        source_url: Optional[str] = None,
        upload_url: Optional[str] = None,
        upload_file: Optional[Union[BinaryIO, any]] = None,
        existing_notes: Optional[str] = None,
        mode: Literal["fast", "precise"] = "fast",
        action: Literal["update", "generate"] = "generate",
        source_type: Literal["youtube", "upload"] = "youtube",
    ):
        self.user_id = user_id
        self.session_id = session_id
        self.source_type = source_type
        self.source_url = source_url          # used when source_type == "youtube"
        self.upload_url = upload_url
        self.upload_file = upload_file        # used when source_type == "upload"
        self.existing_notes = existing_notes
        self.mode = mode
        self.action = action

        # dependencies
        self.models_factory = Models()
        self.prompt_loader = PromptLoader()
        self.parser = StrOutputParser()

    # ── public entry point ───────────────────────────────────────

    def invoke(self, user_input: Optional[str] = None) -> str:
        """Route to the correct handler based on mode + action."""

        if self.mode == "fast" and self.action == "generate":
            return self._handle_fast_generate(user_input)

        if self.mode == "fast" and self.action == "update":
            return self._handle_fast_update(user_input)

        if self.mode == "precise" and self.action == "generate":
            return self._handle_precise_generate(user_input)

        if self.mode == "precise" and self.action == "update":
            return self._handle_precise_update(user_input)

        raise ValueError(f"Invalid mode/action: {self.mode}/{self.action}")

    # ── transcript helpers ───────────────────────────────────────

    def _get_transcript(self) -> str:
        """
        Return plain-text transcript based on source_type.

        • youtube → yt-dlp captions
        • upload  → AssemblyAI (file streamed directly, never saved to disk)
        """
        if self.source_type == "youtube":
            text = get_yt_transcript(self.source_url)
            return text

        if self.source_type == "upload":
            # Stream in-memory bytes straight to AssemblyAI
            text = transcribe_from_url(self.upload_url)
            return text

        raise ValueError(f"Unknown source_type: {self.source_type}")

    def _get_video_content_for_gemini(self) -> list:
        """
        Build the multimodal content list for Gemini depending on source_type.

        • youtube → pass the URL as a file_uri
        • upload  → read raw bytes and send as inline base64 data
        """
        if self.source_type == "youtube":
            return [
                {
                    "type": "media",
                    "file_uri": self.source_url,
                    "mime_type": "video/mp4",
                },
            ]

        if self.source_type == "upload":
            # Read raw bytes from the Django UploadedFile
            raw_bytes = self.upload_file.read()
            # Seek back in case someone else needs to read it again
            if hasattr(self.upload_file, "seek"):
                self.upload_file.seek(0)

            b64_data = base64.standard_b64encode(raw_bytes).decode("utf-8")

            # Detect mime type from file name or default to video/mp4
            file_name = getattr(self.upload_file, "name", "video.mp4")
            if file_name.endswith(".webm"):
                mime = "video/webm"
            elif file_name.endswith(".mov"):
                mime = "video/quicktime"
            elif file_name.endswith(".mp3"):
                mime = "audio/mpeg"
            elif file_name.endswith(".wav"):
                mime = "audio/wav"
            else:
                mime = "video/mp4"

            return [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime};base64,{b64_data}",
                    },
                },
            ]

        raise ValueError(f"Unknown source_type: {self.source_type}")

    # ── FAST handlers (transcript → text-only LLM) ──────────────

    def _handle_fast_generate(self, user_input: Optional[str] = None) -> str:
        transcription = self._get_transcript()

        prompt = self.prompt_loader.get_fast_prompt()
        model = self.models_factory.get_fast_model()
        chain = prompt | model | self.parser

        return chain.invoke({
            "content": transcription,
        })

    def _handle_fast_update(self, user_input: Optional[str] = None) -> str:
        transcription = self._get_transcript()

        prompt = self.prompt_loader.get_update_fast_prompt()
        model = self.models_factory.get_fast_model()
        chain = prompt | model | self.parser

        return chain.invoke({
            "user_instructions": user_input or "None",
            "existing_notes": self.existing_notes or "",
            "content": transcription,
        })

    # ── PRECISE handlers (raw video+audio → multimodal Gemini) ──

    def _handle_precise_generate(self, user_input: Optional[str] = None) -> str:
        """Feed raw video/audio directly to Gemini — no transcription step."""
        prompts = self.prompt_loader.get_precise_prompt()
        model = self.models_factory.get_precise_model()

        system_msg = SystemMessage(content=prompts.messages[0].prompt.template)
        human_text = prompts.messages[1].prompt.template.format(
            content="[see attached video/audio]",
        )

        media_parts = self._get_video_content_for_gemini()
        human_msg = HumanMessage(
            content=[{"type": "text", "text": human_text}] + media_parts
        )

        response = model.invoke([system_msg, human_msg])
        return self.parser.parse(response.content)

    def _handle_precise_update(self, user_input: Optional[str] = None) -> str:
        """Update notes — re-reads the video + old notes via multimodal Gemini."""
        existing_notes = self.memory_manager.get_notes(self.user_id, self.session_id)
        prompts = self.prompt_loader.get_update_precise_prompt()
        model = self.models_factory.get_precise_model()

        system_msg = SystemMessage(content=prompts.messages[0].prompt.template)
        human_text = prompts.messages[1].prompt.template.format(
            user_instructions=user_input or "None",
            existing_notes= self.existing_notes or "",
            content="[see attached video/audio]",
        )

        media_parts = self._get_video_content_for_gemini()
        human_msg = HumanMessage(
            content=[{"type": "text", "text": human_text}] + media_parts
        )

        response = model.invoke([system_msg, human_msg])
        return self.parser.parse(response.content)