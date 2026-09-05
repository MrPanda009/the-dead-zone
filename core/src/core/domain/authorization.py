"""Authorization domain model and pure role-to-permission policy for SETU-DRR (Part 2).

Defines:
- Permission enum: canonical permissions for privileged operations.
- ROLE_PERMISSIONS: authoritative mapping of user roles to granted capabilities.
- has_permission: pure policy evaluation function independent of HTTP / framework concerns.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Mapping, Set

from core.enums import Role


class Permission(StrEnum):
    """Canonical permission identifiers for privileged SETU-DRR operations."""
    ALLOCATION_RUN = "allocation.run"
    SCENARIO_RUN = "scenario.run"
    CAPACITY_RECOMPUTE = "capacity.recompute"


# Authoritative role-to-permission policy mapping
ROLE_PERMISSIONS: Mapping[Role, Set[Permission]] = {
    Role.CIVILIAN: frozenset(),
    Role.GOVERNMENT_OFFICIAL: frozenset({
        Permission.ALLOCATION_RUN,
        Permission.SCENARIO_RUN,
        Permission.CAPACITY_RECOMPUTE,
    }),
    Role.RESCUE_OFFICER: frozenset(),
}


def has_permission(role: Role | str, permission: Permission | str) -> bool:
    """Evaluates whether a role possesses a specific permission.
    
    Args:
        role: User role (Role enum or string representation).
        permission: Permission identifier (Permission enum or string representation).
        
    Returns:
        True if the permission is granted to the role, False otherwise.
    """
    if isinstance(role, str):
        try:
            role_enum = Role(role)
        except ValueError:
            return False
    else:
        role_enum = role

    if isinstance(permission, str):
        try:
            perm_enum = Permission(permission)
        except ValueError:
            return False
    else:
        perm_enum = permission

    granted_permissions = ROLE_PERMISSIONS.get(role_enum, frozenset())
    return perm_enum in granted_permissions
