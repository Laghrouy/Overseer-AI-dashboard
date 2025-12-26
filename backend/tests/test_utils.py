from app.utils import build_command_repr


def test_build_command_repr_with_args():
    assert build_command_repr("deploy", ["staging", " --force "]) == "deploy staging --force"


def test_build_command_repr_strips_and_handles_empty():
    assert build_command_repr("  run   ", [" ", "task"]) == "run task"
    assert build_command_repr("   ", None) == ""
