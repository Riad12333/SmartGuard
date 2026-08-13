"""Scenario registry."""

from scenarios.base import (
    ROUTE_BY_SCENARIO,
    SCENARIOS,
    NormalScenario,
    OverspeedScenario,
    Scenario,
    ScenarioContext,
    StopScenario,
    TheftScenario,
    TowingScenario,
    list_scenarios,
)

__all__ = [
    "SCENARIOS",
    "ROUTE_BY_SCENARIO",
    "Scenario",
    "ScenarioContext",
    "NormalScenario",
    "StopScenario",
    "OverspeedScenario",
    "TheftScenario",
    "TowingScenario",
    "list_scenarios",
]
