// 多语言翻译系统
export type Language = 'zh' | 'en' | 'th' | 'ja' | 'ms' | 'ko';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: '英语', nativeName: 'English' },
  { code: 'th', name: '泰语', nativeName: 'ไทย' },
  { code: 'ja', name: '日语', nativeName: '日本語' },
  { code: 'ms', name: '马来语', nativeName: 'Bahasa Melayu' },
  { code: 'ko', name: '韩语', nativeName: '한국어' },
];

type TranslationKeys = {
  // App level
  appTitle: string;
  // Header
  home: string;
  logs: string;
  settings: string;
  search: string;
  login: string;
  logout: string;
  vip: string;
  // Home page
  addTask: string;
  taskName: string;
  taskType: string;
  status: string;
  executionTime: string;
  nextRun: string;
  actions: string;
  noTasks: string;
  noTasksHint: string;
  enable: string;
  disable: string;
  delete: string;
  edit: string;
  selectAll: string;
  batchDelete: string;
  batchExport: string;
  totalTasks: string;
  runningTasks: string;
  stoppedTasks: string;
  // Add task modal
  addNewTask: string;
  inputTaskName: string;
  selectTaskType: string;
  application: string;
  appPath: string;
  execFile: string;
  searchApp: string;
  selectPath: string;
  cycleType: string;
  onStartup: string;
  once: string;
  daily: string;
  weekly: string;
  monthly: string;
  delayExec: string;
  timedExec: string;
  delayMinutes: string;
  execTimeLabel: string;
  execDateLabel: string;
  intervalLabel: string;
  hasEndTime: string;
  endDateLabel: string;
  endTimeLabel: string;
  noteLabel: string;
  inputNote: string;
  confirm: string;
  cancel: string;
  // Settings page
  themeSettings: string;
  lightMode: string;
  darkMode: string;
  followSystem: string;
  basicSettings: string;
  autoStart: string;
  closeWindow: string;
  minimizeToTray: string;
  exitApp: string;
  saveSettings: string;
  settingsSaved: string;
  securitySettings: string;
  boundPhone: string;
  notBound: string;
  activationStatus: string;
  notActivated: string;
  activated: string;
  permanent: string;
  languageSettings: string;
  other: string;
  qqGroup: string;
  currentVersion: string;
  checkUpdate: string;
  checking: string;
  downloading: string;
  installing: string;
  upToDate: string;
  agreements: string;
  userAgreement: string;
  privacyPolicy: string;
  // Login modal
  phoneLogin: string;
  inputPhone: string;
  getCode: string;
  inputCode: string;
  loginBtn: string;
  // VIP modal
  activateVip: string;
  purchaseVip: string;
  activateCode: string;
  inputActivationCode: string;
  activateBtn: string;
};

const translations: Record<Language, TranslationKeys> = {
  zh: {
    appTitle: '自启精灵',
    home: '首页',
    logs: '日志',
    settings: '设置',
    search: '搜索任务',
    login: '登录',
    logout: '退出登录',
    vip: 'VIP',
    addTask: '添加',
    taskName: '任务名称',
    taskType: '任务类型',
    status: '状态',
    executionTime: '执行时间',
    nextRun: '下次执行',
    actions: '操作',
    noTasks: '暂无任务',
    noTasksHint: '点击右上角 "添加" 创建新任务',
    enable: '启用',
    disable: '停用',
    delete: '删除',
    edit: '编辑',
    selectAll: '全选',
    batchDelete: '批量删除',
    batchExport: '批量导出',
    totalTasks: '总任务',
    runningTasks: '运行中',
    stoppedTasks: '已停止',
    addNewTask: '添加',
    inputTaskName: '请输入任务名称',
    selectTaskType: '选择任务类型',
    application: '应用',
    appPath: '应用路径',
    execFile: '执行文件',
    searchApp: '搜索APP名称',
    selectPath: '选择路径',
    cycleType: '执行周期',
    onStartup: '计算机启动时',
    once: '一次',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    delayExec: '延时执行',
    timedExec: '定时执行',
    delayMinutes: '延时分钟',
    execTimeLabel: '执行时间',
    execDateLabel: '执行日期',
    intervalLabel: '间隔',
    hasEndTime: '设置截止时间',
    endDateLabel: '截止日期',
    endTimeLabel: '截止时间',
    noteLabel: '备注',
    inputNote: '请输入备注',
    confirm: '确定',
    cancel: '取消',
    themeSettings: '主题设置',
    lightMode: '亮色模式',
    darkMode: '暗夜模式',
    followSystem: '跟随系统',
    basicSettings: '基本设置',
    autoStart: '开机自启动',
    closeWindow: '关闭主窗口时',
    minimizeToTray: '最小化到托盘',
    exitApp: '退出程序',
    saveSettings: '保存设置',
    settingsSaved: '✅ 设置已保存',
    securitySettings: '安全设置',
    boundPhone: '绑定手机号',
    notBound: '未绑定',
    activationStatus: '激活码状态',
    notActivated: '未激活',
    activated: '已激活',
    permanent: '永久',
    languageSettings: '语言设置',
    other: '其他',
    qqGroup: 'QQ交流群',
    currentVersion: '当前版本',
    checkUpdate: '检查更新',
    checking: '检查中...',
    downloading: '下载中',
    installing: '安装中...',
    upToDate: '已是最新版本',
    agreements: '协议',
    userAgreement: '用户协议',
    privacyPolicy: '隐私政策',
    phoneLogin: '手机号登录',
    inputPhone: '请输入手机号',
    getCode: '获取验证码',
    inputCode: '请输入验证码',
    loginBtn: '登录',
    activateVip: '激活VIP',
    purchaseVip: '购买VIP',
    activateCode: '激活码',
    inputActivationCode: '请输入激活码',
    activateBtn: '激活',
  },
  en: {
    appTitle: 'Startup Manager',
    home: 'Home',
    logs: 'Logs',
    settings: 'Settings',
    search: 'Search tasks',
    login: 'Login',
    logout: 'Logout',
    vip: 'VIP',
    addTask: 'Add',
    taskName: 'Task Name',
    taskType: 'Task Type',
    status: 'Status',
    executionTime: 'Exec Time',
    nextRun: 'Next Run',
    actions: 'Actions',
    noTasks: 'No tasks yet',
    noTasksHint: 'Click "Add" to create a new task',
    enable: 'Enable',
    disable: 'Disable',
    delete: 'Delete',
    edit: 'Edit',
    selectAll: 'Select All',
    batchDelete: 'Batch Delete',
    batchExport: 'Batch Export',
    totalTasks: 'Total',
    runningTasks: 'Running',
    stoppedTasks: 'Stopped',
    addNewTask: 'Add Task',
    inputTaskName: 'Enter task name',
    selectTaskType: 'Select task type',
    application: 'App',
    appPath: 'App Path',
    execFile: 'Script',
    searchApp: 'Search apps',
    selectPath: 'Select Path',
    cycleType: 'Schedule',
    onStartup: 'On Startup',
    once: 'Once',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    delayExec: 'Delay',
    timedExec: 'Timed',
    delayMinutes: 'Delay (min)',
    execTimeLabel: 'Exec Time',
    execDateLabel: 'Exec Date',
    intervalLabel: 'Interval',
    hasEndTime: 'Set End Time',
    endDateLabel: 'End Date',
    endTimeLabel: 'End Time',
    noteLabel: 'Note',
    inputNote: 'Enter note',
    confirm: 'Confirm',
    cancel: 'Cancel',
    themeSettings: 'Theme',
    lightMode: 'Light',
    darkMode: 'Dark',
    followSystem: 'System',
    basicSettings: 'General',
    autoStart: 'Launch on Startup',
    closeWindow: 'On close window',
    minimizeToTray: 'Minimize to tray',
    exitApp: 'Quit app',
    saveSettings: 'Save',
    settingsSaved: '✅ Settings saved',
    securitySettings: 'Security',
    boundPhone: 'Bound Phone',
    notBound: 'Not bound',
    activationStatus: 'Activation',
    notActivated: 'Not activated',
    activated: 'Activated',
    permanent: 'Permanent',
    languageSettings: 'Language',
    other: 'Other',
    qqGroup: 'QQ Group',
    currentVersion: 'Version',
    checkUpdate: 'Check Update',
    checking: 'Checking...',
    downloading: 'Downloading',
    installing: 'Installing...',
    upToDate: 'Up to date',
    agreements: 'Agreements',
    userAgreement: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    phoneLogin: 'Phone Login',
    inputPhone: 'Enter phone number',
    getCode: 'Get Code',
    inputCode: 'Enter code',
    loginBtn: 'Login',
    activateVip: 'Activate VIP',
    purchaseVip: 'Purchase VIP',
    activateCode: 'Activation Code',
    inputActivationCode: 'Enter activation code',
    activateBtn: 'Activate',
  },
  th: {
    appTitle: 'ตัวจัดการเริ่มต้น',
    home: 'หน้าแรก',
    logs: 'บันทึก',
    settings: 'ตั้งค่า',
    search: 'ค้นหางาน',
    login: 'เข้าสู่ระบบ',
    logout: 'ออกจากระบบ',
    vip: 'VIP',
    addTask: 'เพิ่ม',
    taskName: 'ชื่องาน',
    taskType: 'ประเภทงาน',
    status: 'สถานะ',
    executionTime: 'เวลาดำเนินการ',
    nextRun: 'ครั้งถัดไป',
    actions: 'การดำเนินการ',
    noTasks: 'ยังไม่มีงาน',
    noTasksHint: 'คลิก "เพิ่ม" เพื่อสร้างงานใหม่',
    enable: 'เปิด',
    disable: 'ปิด',
    delete: 'ลบ',
    edit: 'แก้ไข',
    selectAll: 'เลือกทั้งหมด',
    batchDelete: 'ลบทั้งหมด',
    batchExport: 'ส่งออกทั้งหมด',
    totalTasks: 'ทั้งหมด',
    runningTasks: 'กำลังทำงาน',
    stoppedTasks: 'หยุดแล้ว',
    addNewTask: 'เพิ่มงาน',
    inputTaskName: 'ป้อนชื่องาน',
    selectTaskType: 'เลือกประเภทงาน',
    application: 'แอป',
    appPath: 'เส้นทางแอป',
    execFile: 'ไฟล์สคริปต์',
    searchApp: 'ค้นหาแอป',
    selectPath: 'เลือกเส้นทาง',
    cycleType: 'กำหนดการ',
    onStartup: 'เมื่อเริ่มระบบ',
    once: 'ครั้งเดียว',
    daily: 'ทุกวัน',
    weekly: 'ทุกสัปดาห์',
    monthly: 'ทุกเดือน',
    delayExec: 'ล่าช้า',
    timedExec: 'ตั้งเวลา',
    delayMinutes: 'นาทีล่าช้า',
    execTimeLabel: 'เวลา',
    execDateLabel: 'วันที่',
    intervalLabel: 'ช่วง',
    hasEndTime: 'ตั้งเวลาสิ้นสุด',
    endDateLabel: 'วันสิ้นสุด',
    endTimeLabel: 'เวลาสิ้นสุด',
    noteLabel: 'หมายเหตุ',
    inputNote: 'ป้อนหมายเหตุ',
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    themeSettings: 'ธีม',
    lightMode: 'สว่าง',
    darkMode: 'มืด',
    followSystem: 'ตามระบบ',
    basicSettings: 'ทั่วไป',
    autoStart: 'เริ่มอัตโนมัติ',
    closeWindow: 'เมื่อปิดหน้าต่าง',
    minimizeToTray: 'ย่อไปที่ถาด',
    exitApp: 'ออกจากแอป',
    saveSettings: 'บันทึก',
    settingsSaved: '✅ บันทึกแล้ว',
    securitySettings: 'ความปลอดภัย',
    boundPhone: 'โทรศัพท์',
    notBound: 'ไม่ผูก',
    activationStatus: 'การเปิดใช้งาน',
    notActivated: 'ไม่ได้เปิดใช้งาน',
    activated: 'เปิดใช้งานแล้ว',
    permanent: 'ถาวร',
    languageSettings: 'ภาษา',
    other: 'อื่นๆ',
    qqGroup: 'กลุ่ม QQ',
    currentVersion: 'เวอร์ชัน',
    checkUpdate: 'ตรวจสอบการอัปเดต',
    checking: 'กำลังตรวจสอบ...',
    downloading: 'กำลังดาวน์โหลด',
    installing: 'กำลังติดตั้ง...',
    upToDate: 'เป็นเวอร์ชันล่าสุด',
    agreements: 'ข้อตกลง',
    userAgreement: 'ข้อกำหนดการใช้',
    privacyPolicy: 'นโยบายความเป็นส่วนตัว',
    phoneLogin: 'เข้าสู่ระบบด้วยโทรศัพท์',
    inputPhone: 'ป้อนหมายเลขโทรศัพท์',
    getCode: 'รับรหัส',
    inputCode: 'ป้อนรหัส',
    loginBtn: 'เข้าสู่ระบบ',
    activateVip: 'เปิดใช้งาน VIP',
    purchaseVip: 'ซื้อ VIP',
    activateCode: 'รหัสเปิดใช้งาน',
    inputActivationCode: 'ป้อนรหัสเปิดใช้งาน',
    activateBtn: 'เปิดใช้งาน',
  },
  ja: {
    appTitle: 'スタートアップマネージャー',
    home: 'ホーム',
    logs: 'ログ',
    settings: '設定',
    search: 'タスク検索',
    login: 'ログイン',
    logout: 'ログアウト',
    vip: 'VIP',
    addTask: '追加',
    taskName: 'タスク名',
    taskType: 'タスクタイプ',
    status: '状態',
    executionTime: '実行時間',
    nextRun: '次回実行',
    actions: '操作',
    noTasks: 'タスクなし',
    noTasksHint: '「追加」をクリックして新しいタスクを作成',
    enable: '有効',
    disable: '無効',
    delete: '削除',
    edit: '編集',
    selectAll: '全選択',
    batchDelete: '一括削除',
    batchExport: '一括エクスポート',
    totalTasks: 'タスク総数',
    runningTasks: '実行中',
    stoppedTasks: '停止中',
    addNewTask: 'タスク追加',
    inputTaskName: 'タスク名を入力',
    selectTaskType: 'タスクタイプを選択',
    application: 'アプリ',
    appPath: 'アプリパス',
    execFile: 'スクリプト',
    searchApp: 'アプリ検索',
    selectPath: 'パス選択',
    cycleType: 'スケジュール',
    onStartup: '起動時',
    once: '一回',
    daily: '毎日',
    weekly: '毎週',
    monthly: '毎月',
    delayExec: '遅延実行',
    timedExec: '時刻指定',
    delayMinutes: '遅延（分）',
    execTimeLabel: '実行時刻',
    execDateLabel: '実行日',
    intervalLabel: '間隔',
    hasEndTime: '終了時刻を設定',
    endDateLabel: '終了日',
    endTimeLabel: '終了時刻',
    noteLabel: 'メモ',
    inputNote: 'メモを入力',
    confirm: '確認',
    cancel: 'キャンセル',
    themeSettings: 'テーマ',
    lightMode: 'ライト',
    darkMode: 'ダーク',
    followSystem: 'システム',
    basicSettings: '基本設定',
    autoStart: '自動起動',
    closeWindow: 'ウィンドウを閉じる時',
    minimizeToTray: 'トレイに最小化',
    exitApp: '終了',
    saveSettings: '保存',
    settingsSaved: '✅ 設定を保存しました',
    securitySettings: 'セキュリティ',
    boundPhone: '電話番号',
    notBound: '未設定',
    activationStatus: 'アクティベーション',
    notActivated: '未アクティベート',
    activated: 'アクティベート済み',
    permanent: '永久',
    languageSettings: '言語',
    other: 'その他',
    qqGroup: 'QQグループ',
    currentVersion: 'バージョン',
    checkUpdate: '更新確認',
    checking: '確認中...',
    downloading: 'ダウンロード中',
    installing: 'インストール中...',
    upToDate: '最新版です',
    agreements: '規約',
    userAgreement: '利用規約',
    privacyPolicy: 'プライバシーポリシー',
    phoneLogin: '電話番号でログイン',
    inputPhone: '電話番号を入力',
    getCode: 'コード取得',
    inputCode: 'コードを入力',
    loginBtn: 'ログイン',
    activateVip: 'VIPを有効化',
    purchaseVip: 'VIPを購入',
    activateCode: 'アクティベーションコード',
    inputActivationCode: 'コードを入力',
    activateBtn: '有効化',
  },
  ms: {
    appTitle: 'Pengurus Permulaan',
    home: 'Utama',
    logs: 'Log',
    settings: 'Tetapan',
    search: 'Cari tugas',
    login: 'Log masuk',
    logout: 'Log keluar',
    vip: 'VIP',
    addTask: 'Tambah',
    taskName: 'Nama Tugas',
    taskType: 'Jenis Tugas',
    status: 'Status',
    executionTime: 'Masa Pelaksanaan',
    nextRun: 'Seterusnya',
    actions: 'Tindakan',
    noTasks: 'Tiada tugas',
    noTasksHint: 'Klik "Tambah" untuk buat tugas baru',
    enable: 'Aktifkan',
    disable: 'Nyahaktif',
    delete: 'Padam',
    edit: 'Edit',
    selectAll: 'Pilih Semua',
    batchDelete: 'Padam Semua',
    batchExport: 'Eksport Semua',
    totalTasks: 'Jumlah',
    runningTasks: 'Berjalan',
    stoppedTasks: 'Berhenti',
    addNewTask: 'Tambah Tugas',
    inputTaskName: 'Masukkan nama tugas',
    selectTaskType: 'Pilih jenis tugas',
    application: 'Aplikasi',
    appPath: 'Laluan Apl',
    execFile: 'Skrip',
    searchApp: 'Cari aplikasi',
    selectPath: 'Pilih Laluan',
    cycleType: 'Jadual',
    onStartup: 'Semasa Permulaan',
    once: 'Sekali',
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    delayExec: 'Tunda',
    timedExec: 'Berjadual',
    delayMinutes: 'Tunda (minit)',
    execTimeLabel: 'Masa',
    execDateLabel: 'Tarikh',
    intervalLabel: 'Selang',
    hasEndTime: 'Tetapkan masa tamat',
    endDateLabel: 'Tarikh tamat',
    endTimeLabel: 'Masa tamat',
    noteLabel: 'Nota',
    inputNote: 'Masukkan nota',
    confirm: 'Sahkan',
    cancel: 'Batal',
    themeSettings: 'Tema',
    lightMode: 'Terang',
    darkMode: 'Gelap',
    followSystem: 'Sistem',
    basicSettings: 'Umum',
    autoStart: 'Mula automatik',
    closeWindow: 'Apabila tutup tetingkap',
    minimizeToTray: 'Kecilkan ke tray',
    exitApp: 'Keluar',
    saveSettings: 'Simpan',
    settingsSaved: '✅ Tetapan disimpan',
    securitySettings: 'Keselamatan',
    boundPhone: 'Telefon',
    notBound: 'Tidak diikat',
    activationStatus: 'Pengaktifan',
    notActivated: 'Tidak aktif',
    activated: 'Aktif',
    permanent: 'Kekal',
    languageSettings: 'Bahasa',
    other: 'Lain-lain',
    qqGroup: 'Kumpulan QQ',
    currentVersion: 'Versi',
    checkUpdate: 'Semak Kemas Kini',
    checking: 'Memeriksa...',
    downloading: 'Memuat turun',
    installing: 'Memasang...',
    upToDate: 'Versi terkini',
    agreements: 'Perjanjian',
    userAgreement: 'Syarat Perkhidmatan',
    privacyPolicy: 'Dasar Privasi',
    phoneLogin: 'Log Masuk Telefon',
    inputPhone: 'Masukkan nombor telefon',
    getCode: 'Dapatkan Kod',
    inputCode: 'Masukkan kod',
    loginBtn: 'Log Masuk',
    activateVip: 'Aktifkan VIP',
    purchaseVip: 'Beli VIP',
    activateCode: 'Kod Pengaktifan',
    inputActivationCode: 'Masukkan kod pengaktifan',
    activateBtn: 'Aktifkan',
  },
  ko: {
    appTitle: '시작 관리자',
    home: '홈',
    logs: '로그',
    settings: '설정',
    search: '작업 검색',
    login: '로그인',
    logout: '로그아웃',
    vip: 'VIP',
    addTask: '추가',
    taskName: '작업 이름',
    taskType: '작업 유형',
    status: '상태',
    executionTime: '실행 시간',
    nextRun: '다음 실행',
    actions: '작업',
    noTasks: '작업 없음',
    noTasksHint: '"추가"를 클릭하여 새 작업 만들기',
    enable: '활성화',
    disable: '비활성화',
    delete: '삭제',
    edit: '편집',
    selectAll: '전체 선택',
    batchDelete: '일괄 삭제',
    batchExport: '일괄 내보내기',
    totalTasks: '전체',
    runningTasks: '실행 중',
    stoppedTasks: '중지됨',
    addNewTask: '작업 추가',
    inputTaskName: '작업 이름 입력',
    selectTaskType: '작업 유형 선택',
    application: '앱',
    appPath: '앱 경로',
    execFile: '스크립트',
    searchApp: '앱 검색',
    selectPath: '경로 선택',
    cycleType: '일정',
    onStartup: '시작 시',
    once: '한 번',
    daily: '매일',
    weekly: '매주',
    monthly: '매월',
    delayExec: '지연',
    timedExec: '예약',
    delayMinutes: '지연(분)',
    execTimeLabel: '실행 시간',
    execDateLabel: '실행 날짜',
    intervalLabel: '간격',
    hasEndTime: '종료 시간 설정',
    endDateLabel: '종료 날짜',
    endTimeLabel: '종료 시간',
    noteLabel: '메모',
    inputNote: '메모 입력',
    confirm: '확인',
    cancel: '취소',
    themeSettings: '테마',
    lightMode: '라이트',
    darkMode: '다크',
    followSystem: '시스템',
    basicSettings: '일반',
    autoStart: '자동 시작',
    closeWindow: '창을 닫을 때',
    minimizeToTray: '트레이로 최소화',
    exitApp: '종료',
    saveSettings: '저장',
    settingsSaved: '✅ 설정 저장됨',
    securitySettings: '보안',
    boundPhone: '전화번호',
    notBound: '미연결',
    activationStatus: '활성화',
    notActivated: '미활성화',
    activated: '활성화됨',
    permanent: '영구',
    languageSettings: '언어',
    other: '기타',
    qqGroup: 'QQ 그룹',
    currentVersion: '버전',
    checkUpdate: '업데이트 확인',
    checking: '확인 중...',
    downloading: '다운로드 중',
    installing: '설치 중...',
    upToDate: '최신 버전',
    agreements: '약관',
    userAgreement: '이용약관',
    privacyPolicy: '개인정보 처리방침',
    phoneLogin: '전화번호 로그인',
    inputPhone: '전화번호 입력',
    getCode: '코드 받기',
    inputCode: '코드 입력',
    loginBtn: '로그인',
    activateVip: 'VIP 활성화',
    purchaseVip: 'VIP 구매',
    activateCode: '활성화 코드',
    inputActivationCode: '활성화 코드 입력',
    activateBtn: '활성화',
  },
};

// 获取当前语言
export function getCurrentLanguage(): Language {
  const saved = localStorage.getItem('language') as Language;
  if (saved && translations[saved]) return saved;
  return 'zh'; // 默认中文
}

// 设置语言
export function setCurrentLanguage(lang: Language) {
  localStorage.setItem('language', lang);
}

// 获取翻译
export function t(key: keyof TranslationKeys, lang?: Language): string {
  const currentLang = lang || getCurrentLanguage();
  return translations[currentLang]?.[key] || translations.zh[key] || key;
}

export default translations;
