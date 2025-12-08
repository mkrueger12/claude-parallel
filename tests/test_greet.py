from src.greet import greet


def test_greet_alice():
    """Test that greet function returns correct greeting for Alice."""
    assert greet("Alice") == "Hello, Alice!"


def test_greet_world():
    """Test that greet function returns correct greeting for World."""
    assert greet("World") == "Hello, World!"
