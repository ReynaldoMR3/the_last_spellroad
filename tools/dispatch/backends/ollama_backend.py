"""Ollama backend -- calls the existing root docker-compose.yml `ollama`
service's HTTP API. Same network boundary as content-pipeline/ollama_client.py.
"""

import requests

DEFAULT_BASE_URL = "http://localhost:11434"


class OllamaBackend:
    name = "ollama"

    def __init__(self, base_url=None, model="llama3.2"):
        self.base_url = base_url or DEFAULT_BASE_URL
        self.model = model

    def available(self):
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return resp.status_code == 200
        except requests.exceptions.RequestException:
            return False

    def run(self, prompt, cwd=None):
        resp = requests.post(
            f"{self.base_url}/api/generate",
            json={"model": self.model, "prompt": prompt, "stream": False},
            timeout=600,
        )
        resp.raise_for_status()
        return {"ok": True, "stdout": resp.json().get("response", ""), "stderr": ""}
