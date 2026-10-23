import os
import logging
from typing import Any

logger = logging.getLogger("rag-backend")

PROVIDER_API_KEYS = {
    "openai": "OPENAI_API_KEY",
    "gemini": "GOOGLE_API_KEY",
    "groq": "GROQ_API_KEY",
}

_PLACEHOLDER_MARKERS = (
    "your_",
    "your-",
    "placeholder",
    "example",
    "insert_",
    "enter_",
    "replace_me",
    "replace-me",
    "replace ",
    "changeme",
    "change_me",
    "change ",
    "<",
    ">",
)


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        normalized in ("", "undefined", "null", "none")
        or any(marker in normalized for marker in _PLACEHOLDER_MARKERS)
    )


def get_clean_env_var(name: str) -> str:
    """
    Return a configured value, or an empty string for unset or placeholder values.
    """
    value = os.getenv(name, "").strip()
    if _is_placeholder(value):
        return ""
    return value


def validate_llm_configuration() -> bool:
    """Log whether the selected provider has a usable credential without exposing it."""
    provider = os.getenv("MODEL_PROVIDER", "openai").strip().lower()
    if provider == "ollama":
        logger.info("LLM startup validation passed for provider 'ollama'.")
        return True

    key_name = PROVIDER_API_KEYS.get(provider)
    if key_name is None:
        logger.error(
            "LLM startup validation failed: unsupported MODEL_PROVIDER '%s'.",
            provider,
        )
        return False

    if not get_clean_env_var(key_name):
        logger.warning(
            "LLM startup validation failed: %s is missing or contains a placeholder "
            "for MODEL_PROVIDER=%s.",
            key_name,
            provider,
        )
        return False

    logger.info("LLM startup validation passed for provider '%s'.", provider)
    return True


def get_llm_error_message(error: Exception) -> str:
    """Return a user-safe message for provider failures without echoing credentials."""
    status_code = getattr(error, "status_code", None)
    if status_code is None:
        status_code = getattr(getattr(error, "response", None), "status_code", None)

    error_code = str(getattr(error, "code", "")).lower()
    error_type = type(error).__name__.lower()
    is_auth_error = (
        status_code in (401, 403)
        or error_code in ("invalid_api_key", "authentication_error")
        or "authentication" in error_type
        or "unauthorized" in error_type
    )

    provider = os.getenv("MODEL_PROVIDER", "openai").strip().lower()
    key_name = PROVIDER_API_KEYS.get(provider)
    if is_auth_error and key_name:
        return (
            f"The {provider} provider rejected its credentials. "
            f"Check the {key_name} setting."
        )
    if is_auth_error:
        return f"The {provider} provider rejected its credentials."
    return (
        "The configured LLM provider could not complete the request. "
        "Check the backend logs and provider status."
    )

def get_llm(streaming: bool = True, temperature: float = 0.0) -> Any:
    """
    Dynamically instantiates and returns the configured LLM provider client
    based on the MODEL_PROVIDER environment variable.
    
    Supported values: 'openai', 'gemini', 'groq', 'ollama'
    """
    provider = os.getenv("MODEL_PROVIDER", "openai").strip().lower()
    
    if provider == "openai":
        openai_key = get_clean_env_var("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("No valid OpenAI API key found. Please configure OPENAI_API_KEY.")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model="gpt-4o-mini", 
            temperature=temperature, 
            streaming=streaming,
            openai_api_key=openai_key
        )
        
    elif provider == "gemini":
        google_key = get_clean_env_var("GOOGLE_API_KEY")
        if not google_key:
            raise ValueError("No valid Gemini API key found. Please configure GOOGLE_API_KEY.")
        # Lazy import to avoid loading unused packages
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash", 
            google_api_key=google_key, 
            temperature=temperature, 
            streaming=streaming
        )
        
    elif provider == "groq":
        groq_key = get_clean_env_var("GROQ_API_KEY")
        if not groq_key:
            raise ValueError("No valid Groq API key found. Please configure GROQ_API_KEY.")
        from langchain_groq import ChatGroq
        return ChatGroq(
            model="llama-3.3-70b-versatile", 
            groq_api_key=groq_key, 
            temperature=temperature, 
            streaming=streaming
        )
        
    elif provider == "ollama":
        from langchain_community.chat_models import ChatOllama
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        return ChatOllama(
            model="llama3", 
            base_url=ollama_host, 
            temperature=temperature
        )
        
    else:
        raise ValueError(
            f"Unsupported MODEL_PROVIDER '{provider}'. "
            f"Supported options are: 'openai', 'gemini', 'groq', 'ollama'"
        )
