const nodemailer = require("nodemailer");

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing in .env");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendOtpEmail(email, otp) {
  try {
    const transporter = buildTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 28px;">RouteFlow</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Verification Code</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <p style="color: #333; font-size: 16px;">Hello,</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Your OTP verification code is:
          </p>
          <div style="background-color: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${otp}</p>
          </div>
          <p style="color: #999; font-size: 12px;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #999;">
          <p style="margin: 0;">© 2025 RouteFlow. All rights reserved.</p>
        </div>
      </div>
    `;

    const result = await transporter.sendMail({
      from,
      to: email,
      subject: "Your OTP Verification Code - RouteFlow",
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });

    console.log("Email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw error;
  }
}

async function sendEmail(to, subject, text, html) {
  try {
    const transporter = buildTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const result = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

module.exports = {
  sendOtpEmail,
  sendEmail,
};
