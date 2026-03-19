import nodemailer from 'nodemailer';

// QQ 邮箱 SMTP 配置
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: '260244206@qq.com',
    pass: 'uvoyayzvovvgbhec', // SMTP 授权码
  },
});

// 验证码存储 (内存中，5分钟过期)
const codeStore = new Map<string, { code: string; expires: number }>();

// 生成6位数字验证码
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 发送验证码邮件
export async function sendVerificationCode(email: string): Promise<string> {
  const code = generateCode();
  const expires = Date.now() + 5 * 60 * 1000; // 5分钟有效

  codeStore.set(email, { code, expires });

  await transporter.sendMail({
    from: '"任务精灵" <260244206@qq.com>',
    to: email,
    subject: '任务精灵 - 邮箱验证码',
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:sans-serif;">
        <h2 style="color:#4F46E5;margin-bottom:24px;">任务精灵</h2>
        <p>您好，您的验证码为：</p>
        <div style="font-size:32px;font-weight:bold;color:#4F46E5;letter-spacing:8px;margin:24px 0;padding:16px;background:#F3F4F6;border-radius:8px;text-align:center;">
          ${code}
        </div>
        <p style="color:#6B7280;font-size:14px;">验证码5分钟内有效，请勿泄露给他人。</p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
        <p style="color:#9CA3AF;font-size:12px;">如非本人操作，请忽略此邮件。</p>
      </div>
    `,
  });

  console.log(`[邮件] 验证码已发送至 ${email}: ${code}`);
  return code;
}

// 验证验证码
export function verifyCode(email: string, code: string): boolean {
  const stored = codeStore.get(email);
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    codeStore.delete(email);
    return false;
  }
  if (stored.code !== code) return false;
  codeStore.delete(email); // 使用后删除
  return true;
}
