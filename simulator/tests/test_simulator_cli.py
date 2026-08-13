"""Simulator tests."""

import subprocess
import sys
from pathlib import Path

SIMULATOR_DIR = Path(__file__).resolve().parents[1]


def test_dry_run_normal_scenario():
    result = subprocess.run(
        [
            sys.executable,
            "main.py",
            "--scenario",
            "normal",
            "--dry-run",
            "--max-ticks",
            "2",
        ],
        cwd=SIMULATOR_DIR,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "[TELEMETRY]" in result.stdout
    assert "SG-DEVICE-001" in result.stdout or "device_id" in result.stdout


def test_dry_run_simulator2():
    result = subprocess.run(
        [
            sys.executable,
            "main.py",
            "--profile",
            "2",
            "--scenario",
            "normal",
            "--dry-run",
            "--max-ticks",
            "2",
        ],
        cwd=SIMULATOR_DIR,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "[TELEMETRY]" in result.stdout
    assert "SG-DEVICE-002" in result.stdout


def test_list_profiles():
    result = subprocess.run(
        [sys.executable, "main.py", "--list-profiles"],
        cwd=SIMULATOR_DIR,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == 0
    assert "SG-DEVICE-001" in result.stdout
    assert "SG-DEVICE-002" in result.stdout


def test_list_scenarios():
    result = subprocess.run(
        [sys.executable, "main.py", "--list-scenarios"],
        cwd=SIMULATOR_DIR,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == 0
    assert "normal" in result.stdout
    assert "theft" in result.stdout
    assert "towing" in result.stdout
