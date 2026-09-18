from trajectum_validation import compare, relative_error


def test_relative_error():
    assert abs(relative_error(100.0, 98.0) - 0.02) < 1e-12


def test_compare_records_pass_fail_and_tolerance():
    result = compare("benchmark", 100.0, 98.0, 0.03)
    assert result.passed
    assert result.tolerance == 0.03
