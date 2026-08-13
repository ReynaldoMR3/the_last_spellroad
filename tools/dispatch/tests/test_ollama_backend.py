import requests

from backends.ollama_backend import OllamaBackend


class FakeResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json_data = json_data or {}

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"status {self.status_code}")


def test_available_true_when_tags_endpoint_ok(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda url, timeout: FakeResponse(200))
    assert OllamaBackend().available() is True


def test_available_false_on_connection_error(monkeypatch):
    def fake_get(url, timeout):
        raise requests.exceptions.RequestException("connection refused")

    monkeypatch.setattr(requests, "get", fake_get)
    assert OllamaBackend().available() is False


def test_run_posts_prompt_and_returns_response_text(monkeypatch):
    captured = {}

    def fake_post(url, json, timeout):
        captured["url"] = url
        captured["json"] = json
        return FakeResponse(200, {"response": "generated text"})

    monkeypatch.setattr(requests, "post", fake_post)
    result = OllamaBackend(model="llama3.2").run("draft this npc line", cwd=None)

    assert captured["url"] == "http://localhost:11434/api/generate"
    assert captured["json"] == {
        "model": "llama3.2",
        "prompt": "draft this npc line",
        "stream": False,
    }
    assert result == {"ok": True, "stdout": "generated text", "stderr": ""}
