import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db: Database.Database;

export function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      vip_status TEXT DEFAULT 'inactive',
      vip_expire_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )
  `);

  // 激活码表
  db.exec(`
    CREATE TABLE IF NOT EXISTS activation_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      plan_duration TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      user_id TEXT,
      activated_at TEXT,
      expire_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      plan_name TEXT NOT NULL,
      pay_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 套餐表
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration TEXT NOT NULL,
      original_price REAL NOT NULL,
      actual_price REAL NOT NULL,
      is_limited INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 管理员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // 客户端更新表
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      platform TEXT NOT NULL,
      download_url TEXT NOT NULL,
      changelog TEXT,
      force_update INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // QQ群配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS qq_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      number TEXT NOT NULL,
      is_full INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 协议表
  db.exec(`
    CREATE TABLE IF NOT EXISTS agreements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL UNIQUE,
      title_zh TEXT NOT NULL,
      title_en TEXT NOT NULL,
      content_zh TEXT NOT NULL,
      content_en TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ======== Phase D: 市场任务表 ========
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT '通用',
      tags TEXT DEFAULT '[]',
      recording_data TEXT,
      task_config TEXT,
      cost_credits INTEGER DEFAULT 1,
      safety_level TEXT DEFAULT 'safe',
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      reject_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ======== Phase E: 积分表 ========
  db.exec(`
    CREATE TABLE IF NOT EXISTS credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      balance INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      expire_date TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      related_task_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 评论表
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES marketplace_tasks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ======== Phase F: 安全审核表 ========
  db.exec(`
    CREATE TABLE IF NOT EXISTS safety_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      auto_result TEXT DEFAULT 'pending',
      auto_risks TEXT DEFAULT '[]',
      manual_result TEXT,
      manual_reviewer TEXT,
      manual_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES marketplace_tasks(id)
    )
  `);

  // ======== Phase G: 系统配置表 ========
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ======== Phase G: 用户 API 调用统计表 ========
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      call_count INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `);

  // ======== Phase G: 字段迁移 ========
  // activation_codes 新增 credits 字段
  try { db.exec('ALTER TABLE activation_codes ADD COLUMN credits INTEGER DEFAULT 0'); } catch {}
  // plans 新增 credits 字段
  try { db.exec('ALTER TABLE plans ADD COLUMN credits INTEGER DEFAULT 0'); } catch {}
  // users 新增 deepseek_key 字段
  try { db.exec('ALTER TABLE users ADD COLUMN deepseek_key TEXT'); } catch {}

  // 初始化默认管理员
  const adminExists = db.prepare('SELECT id FROM admin WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPwd = bcrypt.hashSync('admin', 10);
    db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run('admin', hashedPwd);
    console.log('[数据库] 已创建默认管理员 admin/admin');
  }

  // 初始化默认套餐（含积分）
  const planCount = db.prepare('SELECT COUNT(*) as count FROM plans').get() as { count: number };
  if (planCount.count === 0) {
    const insertPlan = db.prepare('INSERT INTO plans (name, duration, original_price, actual_price, is_limited, credits) VALUES (?, ?, ?, ?, ?, ?)');
    insertPlan.run('一个月会员', '1month', 9.9, 6.8, 0, 30);
    insertPlan.run('三个月会员', '3month', 29.7, 16.6, 0, 100);
    insertPlan.run('一年会员', '1year', 118.8, 36.9, 0, 500);
    insertPlan.run('永久会员', 'permanent', 399.9, 66.6, 1, 9999);
    console.log('[数据库] 已初始化默认套餐');
  } else {
    // 更新已有套餐的积分默认值（如果为0）
    db.prepare("UPDATE plans SET credits = 30 WHERE duration = '1month' AND credits = 0").run();
    db.prepare("UPDATE plans SET credits = 100 WHERE duration = '3month' AND credits = 0").run();
    db.prepare("UPDATE plans SET credits = 500 WHERE duration = '1year' AND credits = 0").run();
    db.prepare("UPDATE plans SET credits = 9999 WHERE duration = 'permanent' AND credits = 0").run();
  }

  // 初始化系统配置
  const configCount = db.prepare('SELECT COUNT(*) as count FROM system_config').get() as { count: number };
  if (configCount.count === 0) {
    db.prepare("INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)").run('deepseek_api_key', '');
    db.prepare("INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)").run('deepseek_daily_limit', '100');
    db.prepare("INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)").run('deepseek_base_url', 'https://api.deepseek.com');
    db.prepare("INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)").run('deepseek_model', 'deepseek-chat');
    console.log('[数据库] 已初始化系统配置');
  }

  // 生成模拟激活码
  const codeCount = db.prepare('SELECT COUNT(*) as count FROM activation_codes').get() as { count: number };
  if (codeCount.count === 0) {
    const insertCode = db.prepare('INSERT INTO activation_codes (code, plan_duration, status) VALUES (?, ?, ?)');
    for (let i = 0; i < 5; i++) {
      const code = generateActivationCode();
      insertCode.run(code, '1month', 'pending');
    }
    for (let i = 0; i < 3; i++) {
      const code = generateActivationCode();
      insertCode.run(code, '1year', 'pending');
    }
    const permanentCode = generateActivationCode();
    insertCode.run(permanentCode, 'permanent', 'pending');
    console.log('[数据库] 已生成模拟激活码');

    // 打印一个可用的激活码供测试
    const firstCode = db.prepare('SELECT code FROM activation_codes WHERE status = ? LIMIT 1').get('pending') as { code: string };
    console.log(`[测试] 可用激活码: ${firstCode.code}`);
  }

  console.log('[数据库] 初始化完成');

  // 初始化默认QQ群
  const groupCount = db.prepare('SELECT COUNT(*) as count FROM qq_groups').get() as { count: number };
  if (groupCount.count === 0) {
    const insertGroup = db.prepare('INSERT INTO qq_groups (name, number, is_full, sort_order) VALUES (?, ?, ?, ?)');
    insertGroup.run('自启精灵交流1群', '123456789', 1, 1);
    insertGroup.run('自启精灵交流2群', '987654321', 0, 2);
    console.log('[数据库] 已初始化默认QQ群');
  }

  // 初始化默认协议
  const agreementCount = db.prepare('SELECT COUNT(*) as count FROM agreements').get() as { count: number };
  if (agreementCount.count === 0) {
    const insertAgreement = db.prepare('INSERT INTO agreements (type, title_zh, title_en, content_zh, content_en) VALUES (?, ?, ?, ?, ?)');
    insertAgreement.run('user', '用户协议', 'Terms of Service',
      '一、总则\n\n1.1 《自启精灵用户协议》（以下简称"本协议"）是用户（以下简称"您"）与自启精灵应用（以下简称"本应用"）之间关于使用本应用所订立的协议。\n\n1.2 本应用为您提供定时任务管理、应用自启动管理等工具服务。请您仔细阅读并充分理解本协议的全部条款，特别是免除或限制责任的条款。\n\n1.3 当您下载、安装或使用本应用时，即表示您已阅读并同意接受本协议的约束。\n\n二、服务内容\n\n2.1 本应用提供以下核心功能：\n  - 定时任务管理：支持创建、编辑、删除定时执行任务\n  - 应用自启管理：支持设置应用程序开机自启动\n  - 执行文件管理：支持配置脚本文件定时执行\n  - 任务导入导出：支持任务配置的备份与恢复\n  - 日志管理：记录任务执行情况\n\n2.2 本应用提供基础版与会员版服务，会员版包含更多高级功能。\n\n三、用户行为规范\n\n3.1 您应当合法合规地使用本应用，不得利用本应用从事违反法律法规的活动。\n\n3.2 您不得对本应用进行反向工程、反编译、反汇编或其他试图获取源代码的行为。\n\n3.3 您不得利用本应用对第三方系统或服务进行恶意操作。\n\n四、知识产权\n\n4.1 本应用的所有知识产权（包括但不限于软件、商标、界面设计等）归本应用开发者所有。\n\n4.2 未经授权，您不得复制、修改、传播或以其他方式使用本应用的任何内容。\n\n五、免责声明\n\n5.1 本应用按"现状"提供服务，不对服务的适用性、可靠性或准确性做任何明示或暗示的保证。\n\n5.2 因不可抗力、系统故障、网络问题等原因导致的服务中断或数据丢失，本应用不承担责任。\n\n5.3 由于用户配置不当导致的系统异常或数据损失，本应用不承担责任。\n\n六、服务变更与终止\n\n6.1 本应用有权根据业务发展需要调整服务内容，并通过应用内通知的方式告知用户。\n\n6.2 如您违反本协议条款，本应用有权暂停或终止对您的服务。\n\n七、协议修订\n\n7.1 本应用有权对本协议进行修订，修订后的协议将通过应用内公告等方式通知用户。\n\n7.2 如果您不同意修订后的协议内容，请停止使用本应用。继续使用即视为接受修订后的协议。\n\n八、其他\n\n8.1 本协议适用中华人民共和国法律。\n\n8.2 本协议未尽事宜，按照相关法律法规和行业惯例处理。\n\n8.3 如对本协议有任何疑问，请通过应用内反馈渠道联系我们。',
      '1. General\n\n1.1 This User Agreement ("Agreement") is entered into between you ("User") and Startup Manager Application ("App") regarding your use of the App.\n\n1.2 The App provides scheduled task management and application auto-start management services. Please read and fully understand all terms of this Agreement, especially clauses that limit or exempt liability.\n\n1.3 By downloading, installing, or using the App, you acknowledge that you have read and agree to be bound by this Agreement.\n\n2. Services\n\n2.1 The App provides the following core features:\n  - Scheduled task management: create, edit, delete timed tasks\n  - Application auto-start management: configure apps to launch on system startup\n  - Script file management: configure script files for scheduled execution\n  - Task import/export: backup and restore task configurations\n  - Log management: record task execution details\n\n2.2 The App offers both free and premium membership tiers.\n\n3. User Conduct\n\n3.1 You shall use the App in compliance with all applicable laws and regulations.\n\n3.2 You shall not reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the App.\n\n3.3 You shall not use the App to perform malicious operations on third-party systems or services.\n\n4. Intellectual Property\n\n4.1 All intellectual property rights of the App (including but not limited to software, trademarks, and interface design) belong to the App developer.\n\n4.2 Without authorization, you may not copy, modify, distribute, or otherwise use any content of the App.\n\n5. Disclaimer\n\n5.1 The App is provided on an "as-is" basis without warranties of any kind, either express or implied.\n\n5.2 The App is not liable for service interruptions or data loss caused by force majeure, system failures, or network issues.\n\n5.3 The App is not responsible for system abnormalities or data loss caused by improper user configuration.\n\n6. Service Changes and Termination\n\n6.1 The App reserves the right to adjust service content based on business needs, with notification via in-app announcements.\n\n6.2 If you violate this Agreement, the App has the right to suspend or terminate your service.\n\n7. Agreement Modifications\n\n7.1 The App reserves the right to modify this Agreement with notification via in-app announcements.\n\n7.2 If you disagree with the modified Agreement, please stop using the App. Continued use constitutes acceptance.\n\n8. Miscellaneous\n\n8.1 This Agreement is governed by applicable law.\n\n8.2 Matters not covered in this Agreement shall be handled in accordance with applicable laws, regulations, and industry practices.\n\n8.3 For any questions about this Agreement, please contact us through the App\'s feedback channel.');
    insertAgreement.run('privacy', '隐私政策', 'Privacy Policy',
      '一、信息收集\n\n1.1 为提供正常服务，本应用可能收集以下信息：\n  - 设备信息：操作系统类型、版本号\n  - 应用使用数据：任务配置信息（仅存储在本地）\n  - 账户信息：手机号码（仅在注册/登录时）\n  - 会员信息：激活码状态、会员到期时间\n\n1.2 本应用不会收集您的以下信息：\n  - 通讯录、短信、通话记录\n  - 地理位置信息\n  - 个人照片或文件内容\n  - 浏览历史记录\n\n二、信息存储\n\n2.1 您的任务配置数据默认存储在本地设备中，不会上传至服务器。\n\n2.2 账户相关信息（手机号、会员状态）通过加密方式存储在服务器中。\n\n2.3 日志数据仅存储在本地设备中，您可随时清除。\n\n三、信息使用\n\n3.1 收集的信息仅用于以下目的：\n  - 提供和改善应用服务\n  - 验证用户身份和会员状态\n  - 技术故障排查与修复\n\n3.2 本应用不会将您的个人信息出售、交换或分享给第三方。\n\n四、信息保护\n\n4.1 本应用采取合理的安全措施保护您的个人信息，包括但不限于数据加密、访问控制等。\n\n4.2 尽管我们会尽力保护您的个人信息，但无法保证信息的绝对安全。\n\n五、Cookie 与本地存储\n\n5.1 本应用使用本地存储（localStorage）保存您的偏好设置，包括：\n  - 语言选择\n  - 主题模式（亮色/暗色）\n  - 任务列表配置\n  - 关闭窗口行为设置\n\n六、用户权利\n\n6.1 您有权访问、更正或删除您的个人信息。\n\n6.2 您可以通过卸载应用来删除所有本地存储的数据。\n\n6.3 如需删除服务器端数据，请通过应用内反馈渠道联系我们。\n\n七、未成年人保护\n\n7.1 本应用不面向未满14周岁的未成年人。如您是未成年人的监护人，请确认您的被监护人是否在您的授权下使用本应用。\n\n八、隐私政策更新\n\n8.1 本隐私政策可能会不时更新。更新后的政策将通过应用内通知的方式告知用户。\n\n8.2 如果隐私政策发生重大变更，我们会通过更加显著的方式通知您。\n\n九、联系我们\n\n如您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：\n  - 应用内反馈渠道',
      '1. Information Collection\n\n1.1 To provide normal services, the App may collect the following information:\n  - Device information: operating system type, version\n  - App usage data: task configuration (stored locally only)\n  - Account information: phone number (only during registration/login)\n  - Membership information: activation code status, expiration date\n\n1.2 The App does NOT collect:\n  - Contacts, SMS, or call logs\n  - Geographic location\n  - Personal photos or file contents\n  - Browsing history\n\n2. Information Storage\n\n2.1 Your task configuration data is stored locally on your device by default and is not uploaded to servers.\n\n2.2 Account-related information (phone number, membership status) is stored on servers using encryption.\n\n2.3 Log data is stored locally only. You may clear it at any time.\n\n3. Information Usage\n\n3.1 Collected information is used only for:\n  - Providing and improving App services\n  - Verifying user identity and membership status\n  - Technical troubleshooting and bug fixes\n\n3.2 The App will not sell, exchange, or share your personal information with third parties.\n\n4. Information Protection\n\n4.1 The App takes reasonable security measures to protect your personal information, including data encryption and access control.\n\n4.2 While we strive to protect your personal information, absolute security cannot be guaranteed.\n\n5. Cookies and Local Storage\n\n5.1 The App uses localStorage to save your preferences, including:\n  - Language selection\n  - Theme mode (light/dark)\n  - Task list configuration\n  - Window close behavior settings\n\n6. User Rights\n\n6.1 You have the right to access, correct, or delete your personal information.\n\n6.2 You can delete all locally stored data by uninstalling the App.\n\n6.3 To delete server-side data, please contact us through the App\'s feedback channel.\n\n7. Minors Protection\n\n7.1 The App is not intended for minors under 14 years of age.\n\n8. Privacy Policy Updates\n\n8.1 This Privacy Policy may be updated from time to time with notification via in-app announcements.\n\n8.2 For significant changes, we will notify you through more prominent means.\n\n9. Contact Us\n\nIf you have any questions or suggestions about this Privacy Policy, please contact us:\n  - In-app feedback channel');
    console.log('[数据库] 已初始化默认协议');
  }

  return db;
}

export function getDB() {
  if (!db) throw new Error('数据库未初始化');
  return db;
}

export function generateActivationCode(): string {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

export function generateUserId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
}
