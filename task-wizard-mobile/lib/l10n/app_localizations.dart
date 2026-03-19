import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

/// 6 语言 i18n (中/英/日/韩/泰/马来)
class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  static const supportedLocales = [
    Locale('zh'), Locale('en'), Locale('ja'),
    Locale('ko'), Locale('th'), Locale('ms'),
  ];

  static const localizationsDelegates = <LocalizationsDelegate>[
    _AppLocalizationsDelegate(),
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(const Locale('zh'));
  }

  String get _lang => locale.languageCode;
  bool get isZh => _lang == 'zh';

  String _t(Map<String, String> map) => map[_lang] ?? map['en'] ?? '';

  // ============ 通用 ============
  String get appTitle => _t({'zh': '任务精灵', 'en': 'Task Wizard', 'ja': 'タスクウィザード', 'ko': '작업 마법사', 'th': 'ตัวช่วยงาน', 'ms': 'Task Wizard'});
  String get ok => _t({'zh': '确定', 'en': 'OK', 'ja': 'OK', 'ko': '확인', 'th': 'ตกลง', 'ms': 'OK'});
  String get cancel => _t({'zh': '取消', 'en': 'Cancel', 'ja': 'キャンセル', 'ko': '취소', 'th': 'ยกเลิก', 'ms': 'Batal'});
  String get save => _t({'zh': '保存', 'en': 'Save', 'ja': '保存', 'ko': '저장', 'th': 'บันทึก', 'ms': 'Simpan'});
  String get delete => _t({'zh': '删除', 'en': 'Delete', 'ja': '削除', 'ko': '삭제', 'th': 'ลบ', 'ms': 'Padam'});
  String get edit => _t({'zh': '编辑', 'en': 'Edit', 'ja': '編集', 'ko': '편집', 'th': 'แก้ไข', 'ms': 'Edit'});
  String get search => _t({'zh': '搜索', 'en': 'Search', 'ja': '検索', 'ko': '검색', 'th': 'ค้นหา', 'ms': 'Cari'});
  String get loading => _t({'zh': '加载中...', 'en': 'Loading...', 'ja': '読み込み中...', 'ko': '로딩 중...', 'th': 'กำลังโหลด...', 'ms': 'Memuatkan...'});
  String get confirm => _t({'zh': '确认', 'en': 'Confirm', 'ja': '確認', 'ko': '확인', 'th': 'ยืนยัน', 'ms': 'Sahkan'});
  String get close => _t({'zh': '关闭', 'en': 'Close', 'ja': '閉じる', 'ko': '닫기', 'th': 'ปิด', 'ms': 'Tutup'});

  // ============ Tab 栏 ============
  String get tabHome => _t({'zh': '首页', 'en': 'Home', 'ja': 'ホーム', 'ko': '홈', 'th': 'หน้าแรก', 'ms': 'Utama'});
  String get tabAi => _t({'zh': 'AI', 'en': 'AI', 'ja': 'AI', 'ko': 'AI', 'th': 'AI', 'ms': 'AI'});
  String get tabTools => _t({'zh': '工具', 'en': 'Tools', 'ja': 'ツール', 'ko': '도구', 'th': 'เครื่องมือ', 'ms': 'Alat'});
  String get tabProfile => _t({'zh': '我的', 'en': 'Profile', 'ja': 'マイ', 'ko': '내정보', 'th': 'โปรไฟล์', 'ms': 'Profil'});

  // ============ 登录 ============
  String get login => _t({'zh': '登录', 'en': 'Log In', 'ja': 'ログイン', 'ko': '로그인', 'th': 'เข้าสู่ระบบ', 'ms': 'Log Masuk'});
  String get register => _t({'zh': '注册', 'en': 'Sign Up', 'ja': '登録', 'ko': '회원가입', 'th': 'สมัคร', 'ms': 'Daftar'});
  String get email => _t({'zh': '邮箱', 'en': 'Email', 'ja': 'メール', 'ko': '이메일', 'th': 'อีเมล', 'ms': 'Emel'});
  String get password => _t({'zh': '密钥', 'en': 'Password', 'ja': 'パスワード', 'ko': '비밀번호', 'th': 'รหัสผ่าน', 'ms': 'Kata Laluan'});
  String get verifyCode => _t({'zh': '验证码', 'en': 'Code', 'ja': '認証コード', 'ko': '인증코드', 'th': 'รหัสยืนยัน', 'ms': 'Kod'});
  String get sendCode => _t({'zh': '发送验证码', 'en': 'Send Code', 'ja': 'コード送信', 'ko': '코드 전송', 'th': 'ส่งรหัส', 'ms': 'Hantar Kod'});
  String get loginWithCode => _t({'zh': '验证码登录', 'en': 'Login with Code', 'ja': 'コードでログイン', 'ko': '코드로 로그인', 'th': 'ล็อกอินด้วยรหัส', 'ms': 'Log masuk dengan Kod'});
  String get loginWithPassword => _t({'zh': '密钥登录', 'en': 'Login with Password', 'ja': 'パスワードでログイン', 'ko': '비밀번호로 로그인', 'th': 'ล็อกอินด้วยรหัสผ่าน', 'ms': 'Log masuk dengan Kata Laluan'});
  String get emailHint => _t({'zh': '请输入邮箱', 'en': 'Enter your email', 'ja': 'メールを入力', 'ko': '이메일 입력', 'th': 'กรอกอีเมล', 'ms': 'Masukkan emel'});
  String get passwordHint => _t({'zh': '请输入密钥', 'en': 'Enter your password', 'ja': 'パスワードを入力', 'ko': '비밀번호 입력', 'th': 'กรอกรหัสผ่าน', 'ms': 'Masukkan kata laluan'});
  String get codeHint => _t({'zh': '请输入验证码', 'en': 'Enter verification code', 'ja': '認証コードを入力', 'ko': '인증코드 입력', 'th': 'กรอกรหัสยืนยัน', 'ms': 'Masukkan kod pengesahan'});

  // ============ 首页 ============
  String get deviceOnline => _t({'zh': '在线', 'en': 'Online', 'ja': 'オンライン', 'ko': '온라인', 'th': 'ออนไลน์', 'ms': 'Dalam talian'});
  String get deviceOffline => _t({'zh': '离线', 'en': 'Offline', 'ja': 'オフライン', 'ko': '오프라인', 'th': 'ออฟไลน์', 'ms': 'Luar talian'});
  String get running => _t({'zh': '运行中', 'en': 'Running', 'ja': '実行中', 'ko': '실행 중', 'th': 'กำลังทำงาน', 'ms': 'Berjalan'});
  String get completed => _t({'zh': '已完成', 'en': 'Done', 'ja': '完了', 'ko': '완료', 'th': 'เสร็จสิ้น', 'ms': 'Selesai'});
  String get pending => _t({'zh': '待执行', 'en': 'Pending', 'ja': '待機中', 'ko': '대기 중', 'th': 'รอดำเนินการ', 'ms': 'Menunggu'});
  String get deviceStatus => _t({'zh': '设备状态', 'en': 'Device Status', 'ja': 'デバイス状態', 'ko': '장치 상태', 'th': 'สถานะอุปกรณ์', 'ms': 'Status Peranti'});
  String get computerStatus => deviceStatus; // alias
  String get recentActivity => _t({'zh': '最近记录', 'en': 'Recent', 'ja': '最近の記録', 'ko': '최근 기록', 'th': 'กิจกรรมล่าสุด', 'ms': 'Terkini'});

  // ============ AI ============
  String get aiAssistant => _t({'zh': 'AI 助手', 'en': 'AI Assistant', 'ja': 'AIアシスタント', 'ko': 'AI 어시스턴트', 'th': 'ผู้ช่วย AI', 'ms': 'Pembantu AI'});
  String get inputHint => _t({'zh': '告诉我你想做什么...', 'en': 'Tell me what to do...', 'ja': '何をしたいか教えて...', 'ko': '무엇을 할지 알려주세요...', 'th': 'บอกฉันว่าคุณต้องการทำอะไร...', 'ms': 'Beritahu saya apa yang perlu dilakukan...'});
  String get cloudModel => _t({'zh': '云端', 'en': 'Cloud', 'ja': 'クラウド', 'ko': '클라우드', 'th': 'คลาวด์', 'ms': 'Awan'});
  String get localModel => _t({'zh': '本地', 'en': 'Local', 'ja': 'ローカル', 'ko': '로컬', 'th': 'ท้องถิ่น', 'ms': 'Tempatan'});
  String get voiceInput => _t({'zh': '语音输入', 'en': 'Voice', 'ja': '音声入力', 'ko': '음성 입력', 'th': 'เสียง', 'ms': 'Suara'});
  String get sendImage => _t({'zh': '发送图片', 'en': 'Send Image', 'ja': '画像送信', 'ko': '이미지 전송', 'th': 'ส่งรูปภาพ', 'ms': 'Hantar Gambar'});
  String get pcOffline => _t({'zh': '电脑不在线，无法使用 AI 功能', 'en': 'PC offline, AI unavailable', 'ja': 'PCがオフラインのためAI機能は使用不可', 'ko': 'PC 오프라인, AI 사용 불가', 'th': 'คอมพิวเตอร์ออฟไลน์ ไม่สามารถใช้ AI', 'ms': 'PC luar talian, AI tidak tersedia'});
  String get downloadModel => _t({'zh': '帮电脑下载模型', 'en': 'Download model to PC', 'ja': 'PCにモデルをダウンロード', 'ko': 'PC에 모델 다운로드', 'th': 'ดาวน์โหลดโมเดลไปยัง PC', 'ms': 'Muat turun model ke PC'});
  String get downloading => _t({'zh': '下载中', 'en': 'Downloading', 'ja': 'ダウンロード中', 'ko': '다운로드 중', 'th': 'กำลังดาวน์โหลด', 'ms': 'Memuat turun'});

  // ============ 工具 ============
  String get taskMgmt => _t({'zh': '任务管理', 'en': 'Tasks', 'ja': 'タスク管理', 'ko': '작업 관리', 'th': 'จัดการงาน', 'ms': 'Pengurusan Tugas'});
  String get quickAction => _t({'zh': '快捷操作', 'en': 'Quick Run', 'ja': 'クイック実行', 'ko': '빠른 실행', 'th': 'ดำเนินการด่วน', 'ms': 'Laksana Pantas'});
  String get collaboration => _t({'zh': '协同任务', 'en': 'Collab', 'ja': 'コラボ', 'ko': '협업', 'th': 'ร่วมมือ', 'ms': 'Kolaborasi'});
  String get remoteLaunch => _t({'zh': '远程启动', 'en': 'Launch', 'ja': 'リモート起動', 'ko': '원격 실행', 'th': 'เปิดระยะไกล', 'ms': 'Lancar'});
  String get scriptExec => _t({'zh': '脚本执行', 'en': 'Scripts', 'ja': 'スクリプト', 'ko': '스크립트', 'th': 'สคริปต์', 'ms': 'Skrip'});
  String get recordingMgmt => _t({'zh': '录制管理', 'en': 'Recording', 'ja': '録画管理', 'ko': '녹화 관리', 'th': 'จัดการบันทึก', 'ms': 'Rakaman'});
  String get fileBrowser => _t({'zh': '文件浏览', 'en': 'Files', 'ja': 'ファイル', 'ko': '파일', 'th': 'ไฟล์', 'ms': 'Fail'});
  String get phoneAuto => _t({'zh': '手机自动化', 'en': 'Auto', 'ja': '自動化', 'ko': '자동화', 'th': 'อัตโนมัติ', 'ms': 'Auto'});
  String get modelMgmt => _t({'zh': '模型管理', 'en': 'Models', 'ja': 'モデル管理', 'ko': '모델 관리', 'th': 'จัดการโมเดล', 'ms': 'Model'});
  String get execLog => _t({'zh': '执行日志', 'en': 'Logs', 'ja': 'ログ', 'ko': '로그', 'th': 'บันทึก', 'ms': 'Log'});
  String get pluginMarket => _t({'zh': '插件市场', 'en': 'Plugins', 'ja': 'プラグイン', 'ko': '플러그인', 'th': 'ปลั๊กอิน', 'ms': 'Plugin'});
  String get moreTools => _t({'zh': '更多工具', 'en': 'More', 'ja': 'もっと', 'ko': '더 보기', 'th': 'เพิ่มเติม', 'ms': 'Lagi'});
  String get bgRunning => _t({'zh': '后台运行中', 'en': 'Background', 'ja': 'バックグラウンド', 'ko': '백그라운드', 'th': 'ทำงานพื้นหลัง', 'ms': 'Latar belakang'});

  // ============ 我的 ============
  String get deviceManagement => _t({'zh': '设备管理', 'en': 'Devices', 'ja': 'デバイス管理', 'ko': '장치 관리', 'th': 'จัดการอุปกรณ์', 'ms': 'Pengurusan Peranti'});
  String get aiModelSettings => _t({'zh': 'AI 模型设置', 'en': 'AI Models', 'ja': 'AIモデル設定', 'ko': 'AI 모델 설정', 'th': 'การตั้งค่าโมเดล AI', 'ms': 'Tetapan Model AI'});
  String get appearance => _t({'zh': '外观', 'en': 'Appearance', 'ja': '外観', 'ko': '외관', 'th': 'รูปลักษณ์', 'ms': 'Penampilan'});
  String get language => _t({'zh': '语言', 'en': 'Language', 'ja': '言語', 'ko': '언어', 'th': 'ภาษา', 'ms': 'Bahasa'});
  String get security => _t({'zh': '安全设置', 'en': 'Security', 'ja': 'セキュリティ', 'ko': '보안', 'th': 'ความปลอดภัย', 'ms': 'Keselamatan'});
  String get about => _t({'zh': '关于', 'en': 'About', 'ja': 'について', 'ko': '정보', 'th': 'เกี่ยวกับ', 'ms': 'Mengenai'});
  String get logout => _t({'zh': '退出登录', 'en': 'Log Out', 'ja': 'ログアウト', 'ko': '로그아웃', 'th': 'ออกจากระบบ', 'ms': 'Log Keluar'});
  String get lightMode => _t({'zh': '亮色', 'en': 'Light', 'ja': 'ライト', 'ko': '라이트', 'th': 'สว่าง', 'ms': 'Cerah'});
  String get darkMode => _t({'zh': '暗色', 'en': 'Dark', 'ja': 'ダーク', 'ko': '다크', 'th': 'มืด', 'ms': 'Gelap'});
  String get systemMode => _t({'zh': '跟随系统', 'en': 'System', 'ja': 'システム', 'ko': '시스템', 'th': 'ระบบ', 'ms': 'Sistem'});
  String get vipManagement => _t({'zh': '会员管理', 'en': 'VIP', 'ja': 'VIP管理', 'ko': 'VIP 관리', 'th': 'จัดการสมาชิก', 'ms': 'Pengurusan VIP'});
  String get activateVip => _t({'zh': '激活会员', 'en': 'Activate VIP', 'ja': 'VIPを有効化', 'ko': 'VIP 활성화', 'th': 'เปิดใช้งานสมาชิก', 'ms': 'Aktifkan VIP'});
  String get vipActive => _t({'zh': '已激活', 'en': 'Active', 'ja': '有効', 'ko': '활성', 'th': 'เปิดใช้งานแล้ว', 'ms': 'Aktif'});
  String get vipInactive => _t({'zh': '未开通', 'en': 'Inactive', 'ja': '未有効', 'ko': '비활성', 'th': 'ไม่ได้เปิดใช้งาน', 'ms': 'Tidak aktif'});
  String get freeVersion => _t({'zh': '免费版', 'en': 'Free', 'ja': '無料版', 'ko': '무료', 'th': 'ฟรี', 'ms': 'Percuma'});
  String get appearanceAndLang => _t({'zh': '外观与语言', 'en': 'Appearance & Language', 'ja': '外観と言語', 'ko': '외관 및 언어', 'th': 'รูปลักษณ์และภาษา', 'ms': 'Penampilan & Bahasa'});

  // ============ 协同 ============
  String get authRequest => _t({'zh': '电脑请求授权', 'en': 'PC Auth Request', 'ja': 'PC認証リクエスト', 'ko': 'PC 인증 요청', 'th': 'PC ขอสิทธิ์', 'ms': 'Permintaan Kebenaran PC'});
  String get goAuth => _t({'zh': '去授权', 'en': 'Authorize', 'ja': '認証する', 'ko': '인증하기', 'th': 'อนุมัติ', 'ms': 'Benarkan'});
  String get ignore => _t({'zh': '忽略', 'en': 'Ignore', 'ja': '無視', 'ko': '무시', 'th': 'ละเว้น', 'ms': 'Abaikan'});
  String get smsForward => _t({'zh': '验证码转发', 'en': 'SMS Forward', 'ja': 'SMS転送', 'ko': 'SMS 전달', 'th': 'ส่งต่อ SMS', 'ms': 'Hantar SMS'});
  String get sendToPC => _t({'zh': '发送到电脑', 'en': 'Send to PC', 'ja': 'PCに送信', 'ko': 'PC에 전송', 'th': 'ส่งไปยัง PC', 'ms': 'Hantar ke PC'});
  String get execute => _t({'zh': '执行', 'en': 'Run', 'ja': '実行', 'ko': '실행', 'th': 'ดำเนินการ', 'ms': 'Laksana'});

  // ============ 任务 ============
  String get daily => _t({'zh': '每天', 'en': 'Daily', 'ja': '毎日', 'ko': '매일', 'th': 'รายวัน', 'ms': 'Harian'});
  String get steps => _t({'zh': '个步骤', 'en': ' steps', 'ja': 'ステップ', 'ko': '단계', 'th': 'ขั้นตอน', 'ms': 'langkah'});

  // ============ 新增 ============
  String get viewMore => _t({'zh': '查看更多', 'en': 'View More', 'ja': 'もっと見る', 'ko': '더 보기', 'th': 'ดูเพิ่มเติม', 'ms': 'Lihat Lagi'});
  String get viewAll => _t({'zh': '查看全部', 'en': 'View All', 'ja': 'すべて見る', 'ko': '전체 보기', 'th': 'ดูทั้งหมด', 'ms': 'Lihat Semua'});
  String get cpuUsage => _t({'zh': 'CPU利用率', 'en': 'CPU', 'ja': 'CPU使用率', 'ko': 'CPU 사용률', 'th': 'การใช้ CPU', 'ms': 'Penggunaan CPU'});
  String get memoryLabel => _t({'zh': '内存', 'en': 'Memory', 'ja': 'メモリ', 'ko': '메모리', 'th': 'หน่วยความจำ', 'ms': 'Memori'});
  String get diskLabel => _t({'zh': '硬盘', 'en': 'Disk', 'ja': 'ディスク', 'ko': '디스크', 'th': 'ดิสก์', 'ms': 'Cakera'});
  String get myDevices => _t({'zh': '我的设备', 'en': 'My Devices', 'ja': 'マイデバイス', 'ko': '내 장치', 'th': 'อุปกรณ์ของฉัน', 'ms': 'Peranti Saya'});
  String get taskOverview => _t({'zh': '任务概览', 'en': 'Task Overview', 'ja': 'タスク概要', 'ko': '작업 개요', 'th': 'ภาพรวมงาน', 'ms': 'Gambaran Tugas'});
  String get deviceDetail => _t({'zh': '设备详情', 'en': 'Device Detail', 'ja': 'デバイス詳細', 'ko': '장치 상세', 'th': 'รายละเอียดอุปกรณ์', 'ms': 'Butiran Peranti'});
  String get activityLog => _t({'zh': '活动日志', 'en': 'Activity Log', 'ja': 'アクティビティログ', 'ko': '활동 로그', 'th': 'บันทึกกิจกรรม', 'ms': 'Log Aktiviti'});
  String get maxDevices => _t({'zh': '最多100台', 'en': 'Max 100', 'ja': '最大100台', 'ko': '최대 100대', 'th': 'สูงสุด 100', 'ms': 'Maks 100'});
  String get onlineCount => _t({'zh': '台在线', 'en': ' online', 'ja': '台オンライン', 'ko': '대 온라인', 'th': 'ออนไลน์', 'ms': ' dalam talian'});
  String get noDevices => _t({'zh': '暂无设备连接', 'en': 'No devices connected', 'ja': 'デバイス未接続', 'ko': '연결된 장치 없음', 'th': 'ไม่มีอุปกรณ์เชื่อมต่อ', 'ms': 'Tiada peranti disambungkan'});
  String get searchDevices => _t({'zh': '搜索设备', 'en': 'Search devices', 'ja': 'デバイス検索', 'ko': '장치 검색', 'th': 'ค้นหาอุปกรณ์', 'ms': 'Cari peranti'});
  String get temperature => _t({'zh': '温度', 'en': 'Temperature', 'ja': '温度', 'ko': '온도', 'th': 'อุณหภูมิ', 'ms': 'Suhu'});
  String get utilization => _t({'zh': '利用率', 'en': 'Utilization', 'ja': '利用率', 'ko': '사용률', 'th': 'การใช้งาน', 'ms': 'Penggunaan'});
  String get total => _t({'zh': '总计', 'en': 'Total', 'ja': '合計', 'ko': '합계', 'th': 'ทั้งหมด', 'ms': 'Jumlah'});
  String get used => _t({'zh': '已用', 'en': 'Used', 'ja': '使用済み', 'ko': '사용됨', 'th': 'ใช้แล้ว', 'ms': 'Digunakan'});
  String get free => _t({'zh': '可用', 'en': 'Free', 'ja': '空き', 'ko': '사용 가능', 'th': 'ว่าง', 'ms': 'Kosong'});
  String get noRecords => _t({'zh': '暂无记录', 'en': 'No records', 'ja': '記録なし', 'ko': '기록 없음', 'th': 'ไม่มีบันทึก', 'ms': 'Tiada rekod'});

  // ============ 关于页面 ============
  String get versionUpdate => _t({'zh': '版本更新', 'en': 'Version Update', 'ja': 'バージョン更新', 'ko': '버전 업데이트', 'th': 'อัปเดตเวอร์ชัน', 'ms': 'Kemas kini Versi'});
  String get featureIntro => _t({'zh': '功能介绍', 'en': 'Features', 'ja': '機能紹介', 'ko': '기능 소개', 'th': 'คุณสมบัติ', 'ms': 'Ciri-ciri'});
  String get privacyPolicy => _t({'zh': '隐私协议', 'en': 'Privacy Policy', 'ja': 'プライバシーポリシー', 'ko': '개인정보 처리방침', 'th': 'นโยบายความเป็นส่วนตัว', 'ms': 'Polisi Privasi'});
  String get userAgreement => _t({'zh': '用户协议', 'en': 'Terms of Service', 'ja': '利用規約', 'ko': '이용약관', 'th': 'ข้อตกลงการใช้งาน', 'ms': 'Terma Perkhidmatan'});
  String get latestVersion => _t({'zh': '当前为最新版本', 'en': 'Up to date', 'ja': '最新バージョンです', 'ko': '최신 버전입니다', 'th': 'เป็นเวอร์ชันล่าสุด', 'ms': 'Versi terkini'});
  String get logoutConfirm => _t({'zh': '确定退出登录？', 'en': 'Log out?', 'ja': 'ログアウトしますか？', 'ko': '로그아웃하시겠습니까?', 'th': 'ออกจากระบบ?', 'ms': 'Log keluar?'});
  String get deviceLogout => _t({'zh': '退出设备', 'en': 'Remove Device', 'ja': 'デバイス削除', 'ko': '장치 제거', 'th': 'ลบอุปกรณ์', 'ms': 'Alih Keluar Peranti'});
  String get deviceLogoutConfirm => _t({'zh': '确定退出该设备的登录？', 'en': 'Remove this device?', 'ja': 'このデバイスを削除しますか？', 'ko': '이 장치를 제거하시겠습니까?', 'th': 'ลบอุปกรณ์นี้?', 'ms': 'Alih keluar peranti ini?'});
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['zh', 'en', 'ja', 'ko', 'th', 'ms'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async => AppLocalizations(locale);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
