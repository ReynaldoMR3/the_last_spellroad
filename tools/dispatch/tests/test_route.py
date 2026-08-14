from stage01_route.route import (
    choose_backend,
    classify_agent,
    probe_registry,
    task_type_for,
)


def _issue(title="", body="", labels=None):
    return {"title": title, "body": body, "labels": labels or []}


def test_classify_agent_by_keyword_in_title():
    assert classify_agent(_issue(title="Loomwright: fix cone targeting")) == "loomwright"
    assert classify_agent(_issue(title="New ice spell for Standard weight class")) == "frieren"
    assert classify_agent(_issue(title="Wave 4 encounter feels too sparse")) == "warden"
    assert classify_agent(_issue(title="Hexcoin fee should scale with Mastery")) == "pato"
    assert classify_agent(_issue(title="NPC rescue dialogue is flat")) == "lorena"
    assert classify_agent(_issue(title="Boss theme needs more percussion")) == "composer"
    assert classify_agent(_issue(title="Level 1 tileset looks too plain")) == "tilesmith"


def test_classify_agent_falls_back_to_ana_when_ambiguous():
    assert classify_agent(_issue(title="Something about the game")) == "ana"


def test_classify_agent_title_keyword_outranks_generic_body_word():
    # Regression: a music issue whose title says "theme" (composer) must not
    # get outranked by "frieren"/"spell" merely because the body's prose
    # mentions "spell" in passing -- title intent wins over incidental body
    # vocabulary.
    issue = _issue(
        title="Boss theme revision: staccato brass hits instead of sustained dyads",
        body=(
            "Developer named Frieren's battle-arc OST as a style reference "
            "for the staccato brass character; no spell content changes here."
        ),
    )
    assert classify_agent(issue) == "composer"


def test_classify_agent_title_keyword_outranks_unrelated_body_keyword():
    # Regression: an art/level issue must not get outranked by "warden" just
    # because the body happens to mention "wave" in passing.
    issue = _issue(
        title="Level 1 feels too plain -- needs castle-appropriate art pass",
        body="Reported via playtest, Level 1 Wave 3.",
    )
    assert classify_agent(issue) == "tilesmith"


def test_classify_agent_falls_back_to_body_when_title_is_ambiguous():
    issue = _issue(title="Something about the game", body="the encounter wave design needs work")
    assert classify_agent(issue) == "warden"


def test_task_type_for_maps_agents_correctly():
    assert task_type_for("loomwright") == "engine"
    assert task_type_for("frieren") == "content"
    assert task_type_for("warden") == "content"
    assert task_type_for("pato") == "content"
    assert task_type_for("lorena") == "content"
    assert task_type_for("composer") == "content"
    assert task_type_for("tilesmith") == "content"
    assert task_type_for("ana") == "ana"


def test_choose_backend_engine_always_codex():
    registry = {"codex": {"available": True}, "ollama": {"available": True}}
    assert choose_backend("engine", registry) == "codex"


def test_choose_backend_content_uses_codex_even_when_ollama_available():
    # Ollama is reserved (no agentic tool loop / file-edit capability yet),
    # so content tasks always route to codex regardless of availability.
    registry = {"codex": {"available": True}, "ollama": {"available": True}}
    assert choose_backend("content", registry) == "codex"


def test_choose_backend_content_uses_codex_when_ollama_down():
    registry = {"codex": {"available": True}, "ollama": {"available": False}}
    assert choose_backend("content", registry) == "codex"


def test_probe_registry_adds_availability_from_backends(monkeypatch):
    import stage01_route.route as route_module

    class FakeCodex:
        def available(self):
            return True

    class FakeOllama:
        def available(self):
            return False

    monkeypatch.setattr(route_module, "CodexBackend", lambda: FakeCodex())
    monkeypatch.setattr(route_module, "OllamaBackend", lambda: FakeOllama())

    probed = probe_registry({"codex": {}, "ollama": {}, "gemini": {"invoke": None}})
    assert probed["codex"]["available"] is True
    assert probed["ollama"]["available"] is False
    assert probed["gemini"]["available"] is False
