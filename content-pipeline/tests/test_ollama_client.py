from unittest.mock import patch, MagicMock

from ollama_client import embed, generate


def test_embed_sends_model_and_prompt_returns_vector():
    fake_response = MagicMock()
    fake_response.json.return_value = {"embedding": [0.1, 0.2, 0.3]}
    fake_response.raise_for_status.return_value = None
    with patch("ollama_client.requests.post", return_value=fake_response) as mock_post:
        result = embed("some text", model="nomic-embed-text")
    assert result == [0.1, 0.2, 0.3]
    _, kwargs = mock_post.call_args
    assert kwargs["json"] == {"model": "nomic-embed-text", "prompt": "some text"}


def test_generate_sends_system_and_prompt_returns_text():
    fake_response = MagicMock()
    fake_response.json.return_value = {"response": "hello"}
    fake_response.raise_for_status.return_value = None
    with patch("ollama_client.requests.post", return_value=fake_response) as mock_post:
        result = generate("say hi", system="you are Lorena", model="llama3.2")
    assert result == "hello"
    _, kwargs = mock_post.call_args
    assert kwargs["json"]["system"] == "you are Lorena"
    assert kwargs["json"]["prompt"] == "say hi"
    assert kwargs["json"]["stream"] is False
