"""Stage 05: run Heckler's adversarial critique as a blocking gate."""


def build_heckler_prompt(diff, heckler_agent_md):
    return (
        f"{heckler_agent_md}\n\n"
        "Critique the following diff exactly as Heckler would -- grounded, "
        "specific, never a vague 'this feels off'. Return each finding as "
        "its own line starting with either 'BLOCKING:' or 'MINOR:'. If "
        "there is nothing to flag, say so in plain prose with no such "
        "prefixed lines.\n\n"
        f"{diff}"
    )


def parse_findings(raw_output):
    blocking, minor = [], []
    for line in raw_output.splitlines():
        line = line.strip()
        if line.startswith("BLOCKING:"):
            blocking.append(line[len("BLOCKING:"):].strip())
        elif line.startswith("MINOR:"):
            minor.append(line[len("MINOR:"):].strip())
    return {"blocking": blocking, "minor": minor}


def run_heckler_review(diff, heckler_agent_md, backend):
    prompt = build_heckler_prompt(diff, heckler_agent_md)
    result = backend.run(prompt, cwd=None)
    findings = parse_findings(result["stdout"])
    return {
        "backend": backend.name,
        "blocking_findings": findings["blocking"],
        "minor_findings": findings["minor"],
        "raw": result["stdout"],
    }
