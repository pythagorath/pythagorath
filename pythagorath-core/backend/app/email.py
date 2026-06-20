"""Email delivery — a tiny PLUGGABLE provider layer (mirrors app/payments.py).

The caller (auth.py) never knows how mail is sent. Two providers:
  * ConsoleProvider (DEV): prints the message + any code to the server log. Active whenever
    SMTP is NOT configured — so the OTP / password-reset flows are fully testable now with
    zero setup; the code appears in the console.
  * SmtpProvider (PROD): sends over SMTP. Works with any SMTP service — Gmail, SendGrid,
    Mailgun, Amazon SES, etc. Enabled simply by setting SMTP_HOST (+ user/password).

To wire a real service later, set these environment variables (no code change):
    SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASSWORD,
    SMTP_STARTTLS (default 1), EMAIL_FROM
e.g. for Gmail: SMTP_HOST=smtp.gmail.com SMTP_PORT=587 SMTP_USER=you@gmail.com
     SMTP_PASSWORD=<app-password>  EMAIL_FROM="فيثاغورث <you@gmail.com>"

The provider is chosen ONCE at import from config. Never touches the engine/content.
"""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Protocol

from app import config


class EmailProvider(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleProvider:
    """DEV fallback — print to the server log instead of sending."""

    name = "console"

    def send(self, to: str, subject: str, body: str) -> None:
        print(
            "\n=== [email:DEV] (no SMTP configured — set SMTP_HOST to send for real) ===\n"
            f"  to:      {to}\n"
            f"  subject: {subject}\n"
            f"  body:    {body}\n"
            "==========================================================================\n",
            flush=True,
        )


class SmtpProvider:
    """PROD — generic SMTP (Gmail / SendGrid / Mailgun / SES / …)."""

    name = "smtp"

    def send(self, to: str, subject: str, body: str) -> None:
        msg = EmailMessage()
        msg["From"] = config.EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as s:
            if config.SMTP_STARTTLS:
                s.starttls()
            if config.SMTP_USER:
                s.login(config.SMTP_USER, config.SMTP_PASSWORD or "")
            s.send_message(msg)


# Chosen once: real SMTP if configured, else the dev console. Swap without touching callers.
provider: EmailProvider = SmtpProvider() if config.SMTP_HOST else ConsoleProvider()


def send_email(to: str, subject: str, body: str) -> None:
    provider.send(to, subject, body)


def send_otp(to: str, code: str) -> None:
    send_email(
        to,
        "رمز تأكيد حسابك في فيثاغورث",
        f"رمز التحقّق الخاص بك هو: {code}\n"
        f"صالح لمدة {config.OTP_TTL_MINUTES} دقيقة. إن لم تطلب هذا الرمز فتجاهل هذه الرسالة.",
    )


def send_reset(to: str, token: str) -> None:
    send_email(
        to,
        "إعادة تعيين كلمة سر فيثاغورث",
        f"رمز إعادة التعيين الخاص بك:\n{token}\n"
        f"صالح لمدة {config.RESET_TTL_MINUTES} دقيقة. إن لم تطلب ذلك فتجاهل هذه الرسالة.",
    )
