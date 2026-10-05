"""
Real Email Service for Placify.
Supports real SMTP (Gmail, College SMTP, Outlook, Brevo, Mailgun, etc.) using Python's standard library.
"""
import os
import json
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
from pathlib import Path

CONFIG_FILE = Path(__file__).parent.parent / "core" / "smtp_config.json"

DEFAULT_CONFIG = {
    "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
    "smtp_port": int(os.getenv("SMTP_PORT", "587")),
    "smtp_user": os.getenv("SMTP_USER", ""),
    "smtp_password": os.getenv("SMTP_PASSWORD", ""),
    "smtp_from": os.getenv("SMTP_FROM", "Placify Placement Cell <placement@college.edu>"),
    "app_base_url": os.getenv("APP_BASE_URL", "http://localhost:3000"),
    "enabled": True,
}


def get_smtp_config() -> Dict[str, Any]:
    """Load SMTP configuration from JSON file or environment defaults."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                cfg = {**DEFAULT_CONFIG, **saved}
                return cfg
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()


def save_smtp_config(new_cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Persist SMTP configuration to JSON file."""
    cfg = get_smtp_config()
    for k, v in new_cfg.items():
        if k in cfg and v is not None:
            cfg[k] = v
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return cfg


def is_smtp_configured() -> bool:
    """Check if valid SMTP credentials exist."""
    cfg = get_smtp_config()
    return bool(cfg.get("smtp_user") and cfg.get("smtp_password"))


def send_real_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send a real email using SMTP.
    If credentials are configured, sends real email over network.
    If not configured, returns clear setup guidance while maintaining system stability.
    """
    cfg = get_smtp_config()
    host = cfg.get("smtp_host", "smtp.gmail.com")
    port = int(cfg.get("smtp_port", 587))
    user = cfg.get("smtp_user", "").strip()
    password = cfg.get("smtp_password", "").strip().replace(" ", "")
    from_addr = cfg.get("smtp_from", user or "placement@college.edu")

    if not user or not password:
        return {
            "success": False,
            "configured": False,
            "message": "SMTP credentials not configured. Please enter your Gmail/SMTP email and Google App Password in settings or .env to send real emails.",
            "recipient": to_email,
        }

    # Prepare MIME Message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email

    if text_content:
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=context, timeout=12) as server:
                server.login(user, password)
                server.sendmail(from_addr, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=12) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(user, password)
                server.sendmail(from_addr, [to_email], msg.as_string())

        return {
            "success": True,
            "configured": True,
            "message": f"Real email delivered successfully to {to_email} via {host}:{port}",
            "recipient": to_email,
        }
    except Exception as e:
        return {
            "success": False,
            "configured": True,
            "error": str(e),
            "message": f"SMTP delivery failed: {str(e)}. (Note: If using Gmail, make sure to generate a 16-character 'App Password' at https://myaccount.google.com/apppasswords)",
            "recipient": to_email,
        }


def generate_application_email_html(
    student_name: str,
    company_name: str,
    drive_title: str,
    drive_id: int,
    package_lpa: Optional[float] = None,
    location: Optional[str] = None,
    min_cgpa: Optional[float] = None,
    deadline_str: Optional[str] = None,
    roll_number: Optional[str] = None,
    external_google_form_url: Optional[str] = None,
) -> str:
    """Generate high-conversion, professional HTML email containing the real form link."""
    cfg = get_smtp_config()
    base_url = cfg.get("app_base_url", "http://localhost:3000").rstrip("/")
    form_url = f"{base_url}/apply/{drive_id}"
    if roll_number:
        form_url += f"?roll={roll_number}"

    external_btn = ""
    if external_google_form_url:
        external_btn = f"""
        <div style="margin-top: 10px;">
          <a href="{external_google_form_url}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 14px;">
            📋 Open Google Form Link
          </a>
        </div>
        """

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Campus Recruitment: You are Eligible!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #4338ca 100%); padding: 32px 28px; text-align: left;">
              <span style="background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Campus Recruitment · Batch of 2026
              </span>
              <h1 style="color: #ffffff; margin: 12px 0 4px 0; font-size: 24px; font-weight: 800;">
                {company_name}
              </h1>
              <p style="color: #ccfbf1; margin: 0; font-size: 14px; font-weight: 500;">
                {drive_title}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              <p style="font-size: 16px; color: #f8fafc; margin-top: 0;">
                Dear <strong>{student_name}</strong>,
              </p>
              
              <div style="background-color: #0f172a; border-left: 4px solid #0d9488; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
                <strong style="color: #2dd4bf; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                  ✓ Academic Eligibility Verified
                </strong>
                You satisfy all academic cutoff criteria (CGPA &ge; {min_cgpa or '7.0'}, 0 active backlogs) for {company_name}.
              </div>

              <!-- Offer Details Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 12px; width: 40%;">Compensation (CTC):</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #2dd4bf; font-weight: bold; font-size: 14px;">₹{package_lpa or 12.0} LPA</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 12px;">Job Location:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #334155; color: #f8fafc; font-weight: 500;">{location or 'Bangalore / Hyderabad'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #94a3b8; font-size: 12px;">Application Deadline:</td>
                  <td style="padding: 12px 16px; color: #f59e0b; font-weight: bold;">{deadline_str or '7 Days from Announcement'}</td>
                </tr>
              </table>

              <p style="margin: 24px 0 16px 0;">
                Please click the button below to complete and submit your official candidate application form with your resume and preferred location:
              </p>

              <!-- Action Call-To-Action Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="{form_url}" target="_blank" style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(13, 148, 136, 0.4);">
                  📝 Open &amp; Fill Official Application Form
                </a>
                {external_btn}
                <p style="font-size: 11px; color: #64748b; margin-top: 10px;">
                  Direct Form URL: <a href="{form_url}" style="color: #2dd4bf; text-decoration: underline;">{form_url}</a>
                </p>
              </div>

              <div style="background-color: #0f172a; padding: 12px 16px; border-radius: 8px; border: 1px solid #334155; margin-top: 24px; font-size: 12px; color: #94a3b8;">
                <strong style="color: #cbd5e1;">Candidate Autonomy Policy:</strong> If you are not interested in this company or have conflicting career plans, you may opt out directly from your Placify dashboard to release the opportunity for fellow candidates.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 28px; text-align: center; border-top: 1px solid #334155; color: #64748b; font-size: 11px;">
              <p style="margin: 0 0 4px 0;">Department of Training and Placement &middot; Corporate Relations Cell</p>
              <p style="margin: 0;">Automated Campus Orchestration by Placify Multi-Agent System &middot; Batch of 2026</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
