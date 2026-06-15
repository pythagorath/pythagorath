"""Payment provider — ISOLATED behind an abstract interface.

A real Omani gateway (candidate: **Thawani**, via Oman Data Park — consistent with
local hosting/data-residency) plugs in later by implementing this same interface,
WITHOUT touching any caller. For now a mock provider auto-confirms (dev/trial).
"""
from typing import Protocol

from app.models import Plan, User


class PaymentProvider(Protocol):
    name: str

    def create_checkout(self, user: User, plan: Plan) -> dict:
        """Begin a payment; returns {provider_ref, checkout_url, auto_confirmed}."""
        ...

    def verify(self, provider_ref: str) -> bool:
        """Whether the payment for provider_ref has completed."""
        ...


class MockProvider:
    """Dev/trial provider — records a reference and confirms immediately."""

    name = "mock"

    def create_checkout(self, user: User, plan: Plan) -> dict:
        return {
            "provider_ref": f"mock_{user.id}_{plan.id}",
            "checkout_url": None,       # a real provider returns a hosted URL
            "auto_confirmed": True,
        }

    def verify(self, provider_ref: str) -> bool:
        return True


# Swap this single binding for ThawaniProvider() at deployment — nothing else changes.
provider: PaymentProvider = MockProvider()
