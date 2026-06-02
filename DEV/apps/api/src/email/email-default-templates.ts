/**
 * Default fallback HTML templates for transactional emails.
 * Placeholders use {{VAR}} syntax — replaced at send time.
 *   OTP:          {{OTP}}, {{EXPIRY_MINUTES}}
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
  auto_logout: DEFAULT_AUTO_LOGOUT_TEMPLATE,
};
