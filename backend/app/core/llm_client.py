"""
Unified LLM client using LiteLLM.
Supports Gemini, OpenRouter, and Groq with automatic fallback.
"""
import os
import json
import re
import structlog
from typing import Optional
import litellm
import json_repair
import hashlib

from app.core.config import settings
from app.core.cache import redis_cache

log = structlog.get_logger(__name__)

# Set env vars for litellm to automatically pick up
if settings.gemini_api_key:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
if settings.openrouter_api_key:
    os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key
if settings.groq_api_key:
    os.environ["GROQ_API_KEY"] = settings.groq_api_key

class LLMClient:
    """Unified async LLM client with automatic fallbacks via LiteLLM."""

    def __init__(self):
        # Format the Gemini model string for LiteLLM
        self.primary_model = settings.gemini_model
        if "gemini" in self.primary_model.lower() and not self.primary_model.startswith("gemini/"):
            self.primary_model = f"gemini/{self.primary_model}"
            
        self.fallbacks = []
        if settings.groq_api_key:
            self.fallbacks.append(settings.groq_model)
        if settings.openrouter_api_key:
            self.fallbacks.append(settings.openrouter_model)
            
        log.info("llm.init", primary=self.primary_model, fallbacks=self.fallbacks)

    # ── Generation ────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Generate a text response from the configured LLM with fallbacks."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Generate cache key by ignoring dynamic conversation history
        import re
        hashable_prompt = re.sub(r'## Conversation History\n.*?\n## Current Question', '## Current Question', prompt, flags=re.DOTALL)
        hash_input = (system_prompt or "") + hashable_prompt
        cache_key = f"llm_cache:{hashlib.sha256(hash_input.encode('utf-8')).hexdigest()}"

        # Try to fetch from cache first
        cached_response = await redis_cache.get(cache_key)
        if cached_response:
            log.info("llm.generate.cache_hit", key=cache_key)
            return cached_response

        log.info("llm.generate", model=self.primary_model, prompt_len=len(prompt))
        
        try:
            response = await litellm.acompletion(
                model=self.primary_model,
                messages=messages,
                fallbacks=self.fallbacks,
                temperature=0.2,
                max_tokens=8192,
            )
            content = response.choices[0].message.content
            if not content:
                raise ValueError("LLM returned an empty response.")
                
            # Store in cache
            await redis_cache.set(cache_key, content)
            
            log.debug("llm.generate.ok", chars=len(content))
            return content
        except Exception as e:
            log.error("llm.generate.error", error=str(e))
            raise ValueError(f"LLM generation failed (all fallbacks exhausted): {e}")

    # ── JSON Parsing ──────────────────────────────────────────────

    def parse_json_response(self, text: str) -> dict:
        """Robustly extract a JSON object from an LLM response."""
        stripped = text.strip()

        # 1. Remove code fences
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", stripped)
        if fence_match:
            stripped = fence_match.group(1).strip()

        # 2. Try parsing with json_repair
        try:
            parsed = json_repair.loads(stripped)
            if isinstance(parsed, list):
                return {"answer": json.dumps(parsed)}
            if isinstance(parsed, dict):
                return parsed
        except Exception as e:
            log.warning("json_repair.loads failed", error=str(e))

        # 3. Brace-counting extraction
        start = stripped.find("{")
        if start != -1:
            depth = 0
            in_string = False
            escape_next = False
            for i, ch in enumerate(stripped[start:], start):
                if escape_next:
                    escape_next = False
                    continue
                if ch == "\\" and in_string:
                    escape_next = True
                    continue
                if ch == '"':
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        candidate = stripped[start: i + 1]
                        try:
                            parsed = json_repair.loads(candidate)
                            if isinstance(parsed, dict):
                                return parsed
                        except Exception:
                            break

        # 4. Graceful fallback
        log.warning("llm.parse_json.fallback", text_preview=text[:300])
        return {
            "answer": text,
            "reasoning": "",
            "code": {"language": "", "snippet": ""},
            "chart_spec": None,
            "sql": "",
            "follow_up_questions": [],
        }

# ── Singleton ─────────────────────────────────────────────────
llm_client = LLMClient()
