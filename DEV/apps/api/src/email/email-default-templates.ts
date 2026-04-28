/**
 * Default fallback HTML templates for transactional emails.
 * Placeholders use {{VAR}} syntax — replaced at send time.
 *   OTP:          {{OTP}}, {{EXPIRY_MINUTES}}
 *   WELCOME:      {{FULL_NAME}}
 *   AUTO_LOGOUT:  {{FIRST_NAME}}, {{LOGOUT_TIME}}
 */

export const DEFAULT_OTP_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HVFlow - Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #1a1a2e; padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">HVFlow</h1>
      <p style="color: #a0a0b0; margin: 4px 0 0; font-size: 14px;">HR Management System</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 16px;">Your Verification Code</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        We received a request to reset the password for your account. Use the OTP code below to continue:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; background-color: #f0f0ff; border: 2px solid #4f46e5; border-radius: 8px; padding: 16px 32px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">{{OTP}}</span>
        </div>
      </div>
      <p style="color: #888; font-size: 13px; text-align: center; margin: 0 0 24px;">
        This code expires in <strong>{{EXPIRY_MINUTES}} minutes</strong>. Do not share it with anyone.
      </p>
      <p style="color: #aaa; font-size: 12px; text-align: center; margin: 0;">
        If you did not request a password reset, please ignore this email.
      </p>
    </div>
    <div style="background-color: #f9f9f9; padding: 16px 32px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #aaa; font-size: 12px; margin: 0;">&copy; 2026 HVFlow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_WELCOME_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to HVFlow</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%);"></td>
          </tr>

          <!-- Logo / brand -->
          <tr>
            <td style="background-color:#1a1a2e;padding:28px 40px 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">VIBE</span><span style="font-size:28px;font-weight:800;color:#818cf8;letter-spacing:-0.5px;">365</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;">
                    <span style="font-size:12px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">HR Management System</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero section -->
          <tr>
            <td style="background-color:#1a1a2e;padding:0 40px 36px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Hello, {{FULL_NAME}} &#128075;</p>
              <p style="margin:10px 0 0;font-size:15px;color:#9ca3af;line-height:1.6;">Your account has been created and your password is set. You're all ready to go!</p>
            </td>
          </tr>

          <!-- What you can do -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0 0 20px;font-size:17px;font-weight:700;color:#111827;">What you can do on HVFlow</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:16px;vertical-align:top;width:40px;">
                    <div style="width:36px;height:36px;background:#ede9fe;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">&#128336;</div>
                  </td>
                  <td style="padding-bottom:16px;padding-left:14px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Track Attendance</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Clock in, update your status (Working, Break, Meeting&hellip;) in real time.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;vertical-align:top;width:40px;">
                    <div style="width:36px;height:36px;background:#dbeafe;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">&#128578;</div>
                  </td>
                  <td style="padding-bottom:16px;padding-left:14px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Log Daily Mood</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Share how you feel at the end of every shift to help your team thrive.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:0;vertical-align:top;width:40px;">
                    <div style="width:36px;height:36px;background:#dcfce7;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">&#128202;</div>
                  </td>
                  <td style="padding-bottom:0;padding-left:14px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">View Reports</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Access attendance reports and insights for yourself and your team.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="height:1px;background-color:#f3f4f6;"></div>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#92400e;">&#128272; Security tip</p>
                    <p style="margin:6px 0 0;font-size:13px;color:#78350f;line-height:1.5;">Never share your password with anyone. HVFlow staff will never ask for it.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; 2026 HVFlow. All rights reserved.</p>
              <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">You received this email because an account was created for you in the HVFlow HR system.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const DEFAULT_AUTO_LOGOUT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HVFlow - Auto Logout Alert</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #1a1a2e; padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">HVFlow</h1>
      <p style="color: #a0a0b0; margin: 4px 0 0; font-size: 14px;">HR Management System</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 20px;">Hi {{FIRST_NAME}},</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
        You were automatically logged out at <strong>{{LOGOUT_TIME}}</strong> because your shift has ended.
      </p>
      <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0;">
        If you believe this was in error, please contact your manager.
      </p>
    </div>
    <div style="background-color: #f9f9f9; padding: 16px 32px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #aaa; font-size: 12px; margin: 0;">&copy; 2026 HVFlow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_TEMPLATES: Record<string, string> = {
  otp:         DEFAULT_OTP_TEMPLATE,
  welcome:     DEFAULT_WELCOME_TEMPLATE,
  auto_logout: DEFAULT_AUTO_LOGOUT_TEMPLATE,
};
