from unittest.mock import patch

from stage02_generation.lorena_generate import build_lorena_prompt, generate_draft


SAMPLE_REQUEST = {
    "id": "npc_dialogue",
    "instruction": "Write 3 lines for a trapped NPC.",
    "max_words": 60,
}
SAMPLE_CHUNKS = [{"heading": "Lore Premise", "text": "The Director traps the mage.", "score": 0.9}]


def test_build_lorena_prompt_includes_grounding_and_instruction():
    prompt = build_lorena_prompt(SAMPLE_REQUEST, SAMPLE_CHUNKS)
    assert "Lore Premise" in prompt
    assert "The Director traps the mage." in prompt
    assert SAMPLE_REQUEST["instruction"] in prompt
    assert "60 words" in prompt


def test_generate_draft_calls_ollama_client_generate_with_system_prompt():
    with patch("stage02_generation.lorena_generate.ollama_client.generate") as mock_generate:
        mock_generate.return_value = "a drafted line"
        result = generate_draft(SAMPLE_REQUEST, SAMPLE_CHUNKS)
    assert result == "a drafted line"
    args, kwargs = mock_generate.call_args
    assert "Write 3 lines for a trapped NPC." in args[0]
    assert "Lorena" in kwargs["system"]
