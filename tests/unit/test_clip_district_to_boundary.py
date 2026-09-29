"""Pure-logic tests for the district boundary clip job (no database, no rasters)."""

import h3
import pytest

from core.h3_utils import h3_to_int
from pipeline.jobs.clip_district_to_boundary import aggregate_to_parent, allocate_population


def test_allocation_sums_exactly_to_total():
    cells = [1, 2, 3]
    result = allocate_population({1: 1.0, 2: 2.0, 3: 4.0}, cells, 1000.0)
    assert round(sum(result.values()), 2) == 1000.0
    assert result[3] > result[2] > result[1]


def test_allocation_ignores_weight_held_by_cells_that_are_dropped():
    # Cell 9 holds most of the weight but is being deleted; the total must not leak to it.
    result = allocate_population({1: 1.0, 2: 1.0, 9: 98.0}, [1, 2], 100.0)
    assert set(result) == {1, 2}
    assert result == {1: 50.0, 2: 50.0}


def test_cells_without_weight_get_zero_not_a_share():
    result = allocate_population({1: 5.0}, [1, 2, 3], 100.0)
    assert result == {1: 100.0, 2: 0.0, 3: 0.0}


def test_rounding_residual_lands_on_the_heaviest_cell():
    result = allocate_population({1: 1.0, 2: 1.0, 3: 1.0}, [1, 2, 3], 100.0)
    assert round(sum(result.values()), 2) == 100.0
    assert sorted(result.values()) == [33.33, 33.33, 33.34]


def test_allocation_refuses_when_no_kept_cell_has_weight():
    with pytest.raises(ValueError):
        allocate_population({9: 10.0}, [1, 2], 100.0)


def test_parent_aggregation_sums_children():
    parent = h3.latlng_to_cell(11.6, 76.1, 7)
    kids = [h3_to_int(k) for k in h3.cell_to_children(parent, 8)][:3]
    result = aggregate_to_parent({kids[0]: 10.0, kids[1]: 5.5, kids[2]: 1.0}, 7)
    assert result == {h3_to_int(parent): 16.5}
