"""Assembles the 8 agents and 9 tasks into a single sequential CrewAI Crew."""

from crewai import Crew, Process

from .agents import ana, warden, frieren, pato, tilesmith, lorena, loomwright, heckler
from .tasks import ALL_TASKS

spellroad_crew = Crew(
    agents=[ana, warden, frieren, pato, tilesmith, lorena, loomwright, heckler],
    tasks=ALL_TASKS,
    process=Process.sequential,
    verbose=True,
)
