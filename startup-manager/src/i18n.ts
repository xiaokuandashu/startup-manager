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
  boundEmail: string;
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
  // StatsBar
  allTasks: string;
  tasksInProgress: string;
  tasksFailed: string;
  todaySuccess: string;
  todayFailed: string;
  importTask: string;
  collapse: string;
  expand: string;
  // MoreDropdown
  exportConfig: string;
  // VIP modal extended
  becomeMember: string;
  purchaseMemberTab: string;
  activationCodeTab: string;
  nonMember: string;
  unlockAllFeatures: string;
  loadingPlans: string;
  memberBenefits: string;
  benefitUnlimitedTasks: string;
  benefitAllSchedules: string;
  benefitBatchImportExport: string;
  benefitNotifications: string;
  benefitDetailedLogs: string;
  benefitPrioritySupport: string;
  wechatPay: string;
  alipayPay: string;
  mockQrCode: string;
  scanToPay: string;
  actualPayment: string;
  limitedOffer: string;
  originalPrice: string;
  agreeToTerms: string;
  activationHint: string;
  inputActivation16: string;
  activating: string;
  activateNow: string;
  pleaseInputCode: string;
  pleaseLoginFirst: string;
  activationSuccess: string;
  networkError: string;
  activationFailed: string;
  limitedTime: string;
  saveDiscount: string;
  // AddTaskModal extended
  addAppPath: string;
  addExecFile: string;
  selectCycleType: string;
  editTask: string;
  // Task status texts
  waitingExec: string;
  execSuccess: string;
  execFailed: string;
  enabled: string;
  disabled: string;
  exported: string;
  copied: string;
  deleted: string;
  taskEnabled: string;
  taskDisabled: string;
  execAt: string;
  // Log page
  logRecords: string;
  noLogsToday: string;
  // Week days
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  // App types
  openApp: string;
  openAppPath: string;
  openExecFile: string;
  // Copy suffix
  // Copy suffix
  copySuffix: string;
  // TaskRow
  copy: string;
  // AddTaskModal extended #2
  loadingApps: string;
  selectExecType: string;
  delayExecOption: string;
  immediateExecOption: string;
  delayTimeLabel: string;
  minutesUnit: string;
  everyLabel: string;
  execOnceLabel: string;
  dailyIntervalHint: string;
  weeklyIntervalHint: string;
  selectWeekLabel: string;
  selectDateLabel: string;
  // Countdown
  bootExec: string;
  aboutToExec: string;
  afterSuffix: string;
  daysUnit: string;
  hoursUnit: string;
  minutesShort: string;
  secondsUnit: string;
  // UpdateChecker
  newVersionFound: string;
  currentVersionLabel: string;
  updateChangelog: string;
  updateNow: string;
  updateLater: string;
  downloadingUpdate: string;
  installingUpdate: string;
  forceUpdateNotice: string;
  // Filter
  filterAll: string;
  // Task status
  importedTask: string;
  editedTask: string;
  addedTask: string;
  importFailFormat: string;
};

const translations: Record<Language, TranslationKeys> = {
  zh: {
    appTitle: '任务精灵',
    home: '首页',
    logs: '日志',
    settings: '设置',
    search: '搜索任务',
    login: '登录',
    logout: '退出登录',
    vip: '会员',
    addTask: '添加',
    taskName: '任务名称',
    taskType: '任务类型',
    status: '状态',
    executionTime: '执行时间',
    nextRun: '下次执行',
    actions: '操作',
    noTasks: '暂无任务',
    noTasksHint: '点击右上角 "添加" 创建新任务',
    enable: '任务开关',
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
    boundEmail: '绑定邮箱',
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
    phoneLogin: '邮箱登录',
    inputPhone: '请输入邮箱地址',
    getCode: '获取验证码',
    inputCode: '请输入验证码',
    loginBtn: '登录',
    activateVip: '激活VIP',
    purchaseVip: '成为会员',
    activateCode: '激活码',
    inputActivationCode: '请输入激活码',
    activateBtn: '激活',
    allTasks: '全部任务',
    tasksInProgress: '任务中',
    tasksFailed: '任务失败',
    todaySuccess: '今日执行成功',
    todayFailed: '今日执行失败',
    importTask: '导入',
    collapse: '折叠',
    expand: '展开',
    exportConfig: '导出配置',
    becomeMember: '成为会员',
    purchaseMemberTab: '购买会员',
    activationCodeTab: '激活码',
    nonMember: '非会员',
    unlockAllFeatures: '开通会员解锁全部功能',
    loadingPlans: '加载套餐中...',
    memberBenefits: '会员权益',
    benefitUnlimitedTasks: '无限创建启动任务',
    benefitAllSchedules: '全部定时类型',
    benefitBatchImportExport: '批量导入导出',
    benefitNotifications: '执行通知提醒',
    benefitDetailedLogs: '详细日志记录',
    benefitPrioritySupport: '优先技术支持',
    wechatPay: '微信支付',
    alipayPay: '支付宝',
    mockQrCode: '模拟二维码',
    scanToPay: '扫码支付',
    actualPayment: '实付',
    limitedOffer: '限时优惠',
    originalPrice: '原价',
    agreeToTerms: '已阅读并同意《会员协议》',
    activationHint: '激活码激活后日期才开始生效，输入16位激活码即可开通会员',
    inputActivation16: '请输入16位激活码',
    activating: '激活中...',
    activateNow: '立即激活',
    pleaseInputCode: '请输入激活码',
    pleaseLoginFirst: '请先登录后再激活',
    activationSuccess: '激活成功！会员到期时间:',
    networkError: '网络连接失败，请检查后端服务',
    activationFailed: '激活失败',
    limitedTime: '限时',
    saveDiscount: '立减',
    addAppPath: '添加应用路径',
    addExecFile: '添加执行文件',
    selectCycleType: '选择周期类型',
    editTask: '编辑任务',
    waitingExec: '等待执行',
    execSuccess: '今日执行成功',
    execFailed: '今日执行失败',
    enabled: '已启用',
    disabled: '已禁用',
    exported: '导出成功',
    copied: '已复制',
    deleted: '已删除',
    taskEnabled: '启用任务',
    taskDisabled: '禁用任务',
    execAt: '成功启动',
    logRecords: '条记录',
    noLogsToday: '当日无日志记录',
    monday: '星期一',
    tuesday: '星期二',
    wednesday: '星期三',
    thursday: '星期四',
    friday: '星期五',
    saturday: '星期六',
    sunday: '星期日',
    openApp: '打开应用',
    openAppPath: '路径打开应用',
    openExecFile: '打开执行文件',
    copySuffix: '(副本)',
    // TaskRow
    copy: '复制',
    // AddTaskModal extended #2
    loadingApps: '加载应用列表中...',
    selectExecType: '选择执行类型',
    delayExecOption: '延时执行',
    immediateExecOption: '立即执行',
    delayTimeLabel: '延时执行时间',
    minutesUnit: '分钟',
    everyLabel: '每隔',
    execOnceLabel: '执行一次',
    dailyIntervalHint: '每隔0天执行一次表示每天都执行；每隔2天执行一次，表示每隔2天后执行一次，依次类推',
    weeklyIntervalHint: '每隔0周执行一次表示每周都执行；每隔2周执行一次，表示每隔2周后执行一次，依次类推',
    selectWeekLabel: '选择周',
    selectDateLabel: '选择日期',
    // Countdown
    bootExec: '开机时执行',
    aboutToExec: '即将执行',
    afterSuffix: '后',
    daysUnit: '天',
    hoursUnit: '小时',
    minutesShort: '分',
    secondsUnit: '秒',
    // UpdateChecker
    newVersionFound: '发现新版本',
    currentVersionLabel: '当前版本',
    updateChangelog: '更新内容：',
    updateNow: '立即更新',
    updateLater: '稍后更新',
    downloadingUpdate: '下载中...',
    installingUpdate: '安装中...',
    forceUpdateNotice: '⚗️ 此版本为强制更新，请更新后继续使用',
    // Filter
    filterAll: '全部',
    // Task status
    importedTask: '导入任务',
    editedTask: '编辑任务',
    addedTask: '添加任务',
    importFailFormat: '导入失败：文件格式不正确',
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
    enable: 'Toggle',
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
    boundEmail: 'Bound Email',
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
    phoneLogin: 'Email Login',
    inputPhone: 'Enter email address',
    getCode: 'Get Code',
    inputCode: 'Enter code',
    loginBtn: 'Login',
    activateVip: 'Activate VIP',
    purchaseVip: 'Join Member',
    activateCode: 'Activation Code',
    inputActivationCode: 'Enter activation code',
    activateBtn: 'Activate',
    allTasks: 'All Tasks',
    tasksInProgress: 'Running',
    tasksFailed: 'Failed',
    todaySuccess: 'Today Success',
    todayFailed: 'Today Failed',
    importTask: 'Import',
    collapse: 'Collapse',
    expand: 'Expand',
    exportConfig: 'Export Config',
    becomeMember: 'Become Member',
    purchaseMemberTab: 'Purchase',
    activationCodeTab: 'Code',
    nonMember: 'Non-Member',
    unlockAllFeatures: 'Unlock all features with membership',
    loadingPlans: 'Loading plans...',
    memberBenefits: 'Member Benefits',
    benefitUnlimitedTasks: 'Unlimited tasks',
    benefitAllSchedules: 'All schedule types',
    benefitBatchImportExport: 'Batch import/export',
    benefitNotifications: 'Exec notifications',
    benefitDetailedLogs: 'Detailed logs',
    benefitPrioritySupport: 'Priority support',
    wechatPay: 'WeChat Pay',
    alipayPay: 'Alipay',
    mockQrCode: 'QR Code',
    scanToPay: 'Scan to pay',
    actualPayment: 'Pay',
    limitedOffer: 'Limited offer',
    originalPrice: 'Original',
    agreeToTerms: 'I agree to the Terms of Service',
    activationHint: 'Enter your 16-digit activation code to activate membership',
    inputActivation16: 'Enter 16-digit code',
    activating: 'Activating...',
    activateNow: 'Activate Now',
    pleaseInputCode: 'Please enter activation code',
    pleaseLoginFirst: 'Please login first',
    activationSuccess: 'Activated! Expires:',
    networkError: 'Network error, please check connection',
    activationFailed: 'Activation failed',
    limitedTime: 'Limited',
    saveDiscount: 'Save',
    addAppPath: 'Add App Path',
    addExecFile: 'Add Script File',
    selectCycleType: 'Select Schedule Type',
    editTask: 'Edit Task',
    waitingExec: 'Waiting',
    execSuccess: 'Success today',
    execFailed: 'Failed today',
    enabled: 'Enabled',
    disabled: 'Disabled',
    exported: 'Exported',
    copied: 'Copied',
    deleted: 'Deleted',
    taskEnabled: 'Task enabled',
    taskDisabled: 'Task disabled',
    execAt: 'Launched',
    logRecords: ' records',
    noLogsToday: 'No logs for this day',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    openApp: 'Open App',
    openAppPath: 'Open via Path',
    openExecFile: 'Run Script',
    copySuffix: '(Copy)',
    copy: 'Copy',
    loadingApps: 'Loading apps...',
    selectExecType: 'Select Execution Type',
    delayExecOption: 'Delayed Execution',
    immediateExecOption: 'Immediate Execution',
    delayTimeLabel: 'Delay Time',
    minutesUnit: 'minutes',
    everyLabel: 'Every',
    execOnceLabel: 'times',
    dailyIntervalHint: '0 days = daily; 2 days = execute every 2 days, and so on',
    weeklyIntervalHint: '0 weeks = weekly; 2 weeks = execute every 2 weeks, and so on',
    selectWeekLabel: 'Select Week',
    selectDateLabel: 'Select Date',
    bootExec: 'Execute on boot',
    aboutToExec: 'About to execute',
    afterSuffix: '',
    daysUnit: 'd',
    hoursUnit: 'h',
    minutesShort: 'm',
    secondsUnit: 's',
    newVersionFound: 'New version found',
    currentVersionLabel: 'Current version',
    updateChangelog: 'Changelog:',
    updateNow: 'Update Now',
    updateLater: 'Later',
    downloadingUpdate: 'Downloading...',
    installingUpdate: 'Installing...',
    forceUpdateNotice: '⚗️ This is a mandatory update. Please update to continue.',
    filterAll: 'All',
    importedTask: 'Import Task',
    editedTask: 'Edit Task',
    addedTask: 'Add Task',
    importFailFormat: 'Import failed: incorrect file format',
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
    boundEmail: 'อีเมล',
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
    phoneLogin: 'เข้าสู่ระบบด้วยอีเมล',
    inputPhone: 'ป้อนอีเมล',
    getCode: 'รับรหัส',
    inputCode: 'ป้อนรหัส',
    loginBtn: 'เข้าสู่ระบบ',
    activateVip: 'เปิดใช้งาน VIP',
    purchaseVip: 'ซื้อ VIP',
    activateCode: 'รหัสเปิดใช้งาน',
    inputActivationCode: 'ป้อนรหัสเปิดใช้งาน',
    activateBtn: 'เปิดใช้งาน',
    allTasks: 'งานทั้งหมด', tasksInProgress: 'กำลังทำงาน', tasksFailed: 'ล้มเหลว',
    todaySuccess: 'สำเร็จวันนี้', todayFailed: 'ล้มเหลววันนี้',
    importTask: 'นำเข้า', collapse: 'ยุบ', expand: 'ขยาย',
    exportConfig: 'ส่งออกการตั้งค่า',
    becomeMember: 'เป็นสมาชิก', purchaseMemberTab: 'ซื้อสมาชิก', activationCodeTab: 'รหัส',
    nonMember: 'ไม่ใช่สมาชิก', unlockAllFeatures: 'ปลดล็อกฟีเจอร์ทั้งหมด',
    loadingPlans: 'กำลังโหลดแพ็กเกจ...', memberBenefits: 'สิทธิประโยชน์สมาชิก',
    benefitUnlimitedTasks: 'สร้างงานไม่จำกัด', benefitAllSchedules: 'ตั้งเวลาทุกประเภท',
    benefitBatchImportExport: 'นำเข้า/ส่งออกแบบกลุ่ม', benefitNotifications: 'แจ้งเตือนการทำงาน',
    benefitDetailedLogs: 'บันทึกรายละเอียด', benefitPrioritySupport: 'การสนับสนุนพิเศษ',
    wechatPay: 'WeChat Pay', alipayPay: 'Alipay',
    mockQrCode: 'QR Code', scanToPay: 'สแกนเพื่อชำระ',
    actualPayment: 'ชำระ', limitedOffer: 'ข้อเสนอจำกัด', originalPrice: 'ราคาเดิม',
    agreeToTerms: 'ยอมรับข้อกำหนดการใช้งาน',
    activationHint: 'ป้อนรหัส 16 หลักเพื่อเปิดใช้งาน', inputActivation16: 'ป้อนรหัส 16 หลัก',
    activating: 'กำลังเปิดใช้งาน...', activateNow: 'เปิดใช้งานทันที',
    pleaseInputCode: 'กรุณาป้อนรหัส', pleaseLoginFirst: 'กรุณาเข้าสู่ระบบก่อน',
    activationSuccess: 'เปิดใช้งานสำเร็จ! หมดอายุ:', networkError: 'เชื่อมต่อล้มเหลว',
    activationFailed: 'เปิดใช้งานล้มเหลว', limitedTime: 'จำกัดเวลา', saveDiscount: 'ประหยัด',
    addAppPath: 'เพิ่มเส้นทางแอป', addExecFile: 'เพิ่มไฟล์สคริปต์',
    selectCycleType: 'เลือกประเภทกำหนดการ', editTask: 'แก้ไขงาน',
    waitingExec: 'รอดำเนินการ', execSuccess: 'สำเร็จวันนี้', execFailed: 'ล้มเหลววันนี้',
    enabled: 'เปิดใช้งาน', disabled: 'ปิดใช้งาน', exported: 'ส่งออกแล้ว',
    copied: 'คัดลอกแล้ว', deleted: 'ลบแล้ว', taskEnabled: 'เปิดใช้งานแล้ว', taskDisabled: 'ปิดใช้งานแล้ว',
    execAt: 'เปิดแล้ว', logRecords: ' รายการ', noLogsToday: 'ไม่มีบันทึกในวันนี้',
    monday: 'จันทร์', tuesday: 'อังคาร', wednesday: 'พุธ', thursday: 'พฤหัสบดี',
    friday: 'ศุกร์', saturday: 'เสาร์', sunday: 'อาทิตย์',
    openApp: 'เปิดแอป', openAppPath: 'เปิดตามเส้นทาง', openExecFile: 'เรียกใช้สคริปต์',
    copySuffix: '(สำเนา)',
    copy: 'คัดลอก',
    loadingApps: 'กำลังโหลดแอป...',
    selectExecType: 'เลือกประเภทการทำงาน',
    delayExecOption: 'การทำงานล่าช้า',
    immediateExecOption: 'ทำงานทันที',
    delayTimeLabel: 'เวลาหน่วง',
    minutesUnit: 'นาที',
    everyLabel: 'ทุก',
    execOnceLabel: 'ครั้ง',
    dailyIntervalHint: '0 วัน = ทุกวัน; 2 วัน = ทำงานทุก 2 วัน',
    weeklyIntervalHint: '0 สัปดาห์ = ทุกสัปดาห์; 2 สัปดาห์ = ทำงานทุก 2 สัปดาห์',
    selectWeekLabel: 'เลือกสัปดาห์',
    selectDateLabel: 'เลือกวันที่',
    bootExec: 'ทำงานเมื่อเปิดเครื่อง',
    aboutToExec: 'กำลังจะทำงาน',
    afterSuffix: '',
    daysUnit: 'วัน',
    hoursUnit: 'ชั่วโมง',
    minutesShort: 'นาที',
    secondsUnit: 'วินาที',
    newVersionFound: 'พบเวอร์ชันใหม่',
    currentVersionLabel: 'เวอร์ชันปัจจุบัน',
    updateChangelog: 'บันทึกการอัปเดต:',
    updateNow: 'อัปเดตเดี๋ยวนี้',
    updateLater: 'ภายหลัง',
    downloadingUpdate: 'กำลังดาวน์โหลด...',
    installingUpdate: 'กำลังติดตั้ง...',
    forceUpdateNotice: '⚗️ อัปเดตบังคับ กรุณาอัปเดตเพื่อดำเนินการต่อ',
    filterAll: 'ทั้งหมด',
    importedTask: 'นำเข้างาน',
    editedTask: 'แก้ไขงาน',
    addedTask: 'เพิ่มงาน',
    importFailFormat: 'นำเข้าล้มเหลว: รูปแบบไฟล์ไม่ถูกต้อง',
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
    boundEmail: 'メール',
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
    phoneLogin: 'メールでログイン',
    inputPhone: 'メールアドレスを入力',
    getCode: 'コード取得',
    inputCode: 'コードを入力',
    loginBtn: 'ログイン',
    activateVip: 'VIPを有効化',
    purchaseVip: 'VIPを購入',
    activateCode: 'アクティベーションコード',
    inputActivationCode: 'コードを入力',
    activateBtn: '有効化',
    allTasks: '全タスク', tasksInProgress: '実行中', tasksFailed: '失敗',
    todaySuccess: '本日成功', todayFailed: '本日失敗',
    importTask: 'インポート', collapse: '折りたたむ', expand: '展開',
    exportConfig: '設定をエクスポート',
    becomeMember: '会員になる', purchaseMemberTab: '購入', activationCodeTab: 'コード',
    nonMember: '非会員', unlockAllFeatures: '全機能をアンロック',
    loadingPlans: 'プランを読み込み中...', memberBenefits: '会員特典',
    benefitUnlimitedTasks: '無制限タスク', benefitAllSchedules: '全スケジュール',
    benefitBatchImportExport: '一括インポート/エクスポート', benefitNotifications: '実行通知',
    benefitDetailedLogs: '詳細ログ', benefitPrioritySupport: '優先サポート',
    wechatPay: 'WeChat Pay', alipayPay: 'Alipay',
    mockQrCode: 'QRコード', scanToPay: 'スキャンで支払い',
    actualPayment: '支払額', limitedOffer: '期間限定', originalPrice: '定価',
    agreeToTerms: '利用規約に同意',
    activationHint: '16桁のコードを入力して会員を有効化', inputActivation16: '16桁のコードを入力',
    activating: '有効化中...', activateNow: '今すぐ有効化',
    pleaseInputCode: 'コードを入力してください', pleaseLoginFirst: '先にログインしてください',
    activationSuccess: '有効化成功！有効期限:', networkError: 'ネットワークエラー',
    activationFailed: '有効化に失敗', limitedTime: '期間限定', saveDiscount: '割引',
    addAppPath: 'アプリパスを追加', addExecFile: 'スクリプトを追加',
    selectCycleType: 'スケジュールタイプを選択', editTask: 'タスクを編集',
    waitingExec: '待機中', execSuccess: '本日成功', execFailed: '本日失敗',
    enabled: '有効', disabled: '無効', exported: 'エクスポート完了',
    copied: 'コピー完了', deleted: '削除完了', taskEnabled: 'タスク有効化', taskDisabled: 'タスク無効化',
    execAt: '起動成功', logRecords: '件の記録', noLogsToday: 'ログなし',
    monday: '月曜日', tuesday: '火曜日', wednesday: '水曜日', thursday: '木曜日',
    friday: '金曜日', saturday: '土曜日', sunday: '日曜日',
    openApp: 'アプリを開く', openAppPath: 'パスで開く', openExecFile: 'スクリプト実行',
    copySuffix: '(コピー)',
    copy: 'コピー',
    loadingApps: 'アプリを読み込み中...',
    selectExecType: '実行タイプを選択',
    delayExecOption: '遅延実行',
    immediateExecOption: '即時実行',
    delayTimeLabel: '遅延時間',
    minutesUnit: '分',
    everyLabel: '毎',
    execOnceLabel: '回実行',
    dailyIntervalHint: '0日=毎日、 2日=2日ごとに実行',
    weeklyIntervalHint: '0週=毎週、 2週=2週ごとに実行',
    selectWeekLabel: '曜日を選択',
    selectDateLabel: '日付を選択',
    bootExec: '起動時実行',
    aboutToExec: 'まもなく実行',
    afterSuffix: '後',
    daysUnit: '日',
    hoursUnit: '時間',
    minutesShort: '分',
    secondsUnit: '秒',
    newVersionFound: '新バージョンが見つかりました',
    currentVersionLabel: '現在のバージョン',
    updateChangelog: '更新内容：',
    updateNow: '今すぐ更新',
    updateLater: '後で',
    downloadingUpdate: 'ダウンロード中...',
    installingUpdate: 'インストール中...',
    forceUpdateNotice: '⚗️ このバージョンは強制更新です。更新してください。',
    filterAll: '全て',
    importedTask: 'インポート',
    editedTask: '編集',
    addedTask: '追加',
    importFailFormat: 'インポート失敗：ファイル形式が正しくありません',
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
    boundEmail: 'E-mel',
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
    phoneLogin: 'Log Masuk E-mel',
    inputPhone: 'Masukkan alamat e-mel',
    getCode: 'Dapatkan Kod',
    inputCode: 'Masukkan kod',
    loginBtn: 'Log Masuk',
    activateVip: 'Aktifkan VIP',
    purchaseVip: 'Beli VIP',
    activateCode: 'Kod Pengaktifan',
    inputActivationCode: 'Masukkan kod pengaktifan',
    activateBtn: 'Aktifkan',
    allTasks: 'Semua Tugas', tasksInProgress: 'Berjalan', tasksFailed: 'Gagal',
    todaySuccess: 'Berjaya Hari Ini', todayFailed: 'Gagal Hari Ini',
    importTask: 'Import', collapse: 'Lipat', expand: 'Buka',
    exportConfig: 'Eksport Konfigurasi',
    becomeMember: 'Jadi Ahli', purchaseMemberTab: 'Beli', activationCodeTab: 'Kod',
    nonMember: 'Bukan Ahli', unlockAllFeatures: 'Buka semua ciri',
    loadingPlans: 'Memuatkan pelan...', memberBenefits: 'Faedah Ahli',
    benefitUnlimitedTasks: 'Tugas tanpa had', benefitAllSchedules: 'Semua jadual',
    benefitBatchImportExport: 'Import/eksport kelompok', benefitNotifications: 'Pemberitahuan',
    benefitDetailedLogs: 'Log terperinci', benefitPrioritySupport: 'Sokongan keutamaan',
    wechatPay: 'WeChat Pay', alipayPay: 'Alipay',
    mockQrCode: 'Kod QR', scanToPay: 'Imbas untuk bayar',
    actualPayment: 'Bayar', limitedOffer: 'Tawaran terhad', originalPrice: 'Harga asal',
    agreeToTerms: 'Setuju dengan Syarat Perkhidmatan',
    activationHint: 'Masukkan kod 16 digit untuk aktifkan', inputActivation16: 'Masukkan kod 16 digit',
    activating: 'Mengaktifkan...', activateNow: 'Aktifkan Sekarang',
    pleaseInputCode: 'Sila masukkan kod', pleaseLoginFirst: 'Sila log masuk dahulu',
    activationSuccess: 'Diaktifkan! Tamat:', networkError: 'Ralat rangkaian',
    activationFailed: 'Pengaktifan gagal', limitedTime: 'Terhad', saveDiscount: 'Jimat',
    addAppPath: 'Tambah Laluan Apl', addExecFile: 'Tambah Fail Skrip',
    selectCycleType: 'Pilih Jenis Jadual', editTask: 'Edit Tugas',
    waitingExec: 'Menunggu', execSuccess: 'Berjaya hari ini', execFailed: 'Gagal hari ini',
    enabled: 'Diaktifkan', disabled: 'Dinyahaktif', exported: 'Dieksport',
    copied: 'Disalin', deleted: 'Dipadam', taskEnabled: 'Tugas diaktifkan', taskDisabled: 'Tugas dinyahaktif',
    execAt: 'Dilancarkan', logRecords: ' rekod', noLogsToday: 'Tiada log hari ini',
    monday: 'Isnin', tuesday: 'Selasa', wednesday: 'Rabu', thursday: 'Khamis',
    friday: 'Jumaat', saturday: 'Sabtu', sunday: 'Ahad',
    openApp: 'Buka Apl', openAppPath: 'Buka melalui Laluan', openExecFile: 'Jalankan Skrip',
    copySuffix: '(Salinan)',
    copy: 'Salin',
    loadingApps: 'Memuatkan aplikasi...',
    selectExecType: 'Pilih Jenis Pelaksanaan',
    delayExecOption: 'Pelaksanaan Tertunda',
    immediateExecOption: 'Pelaksanaan Segera',
    delayTimeLabel: 'Masa Tunda',
    minutesUnit: 'minit',
    everyLabel: 'Setiap',
    execOnceLabel: 'kali',
    dailyIntervalHint: '0 hari = setiap hari; 2 hari = setiap 2 hari',
    weeklyIntervalHint: '0 minggu = setiap minggu; 2 minggu = setiap 2 minggu',
    selectWeekLabel: 'Pilih Minggu',
    selectDateLabel: 'Pilih Tarikh',
    bootExec: 'Jalankan semasa boot',
    aboutToExec: 'Akan dilaksanakan',
    afterSuffix: '',
    daysUnit: 'hari',
    hoursUnit: 'jam',
    minutesShort: 'min',
    secondsUnit: 'saat',
    newVersionFound: 'Versi baharu ditemui',
    currentVersionLabel: 'Versi semasa',
    updateChangelog: 'Log perubahan:',
    updateNow: 'Kemas kini Sekarang',
    updateLater: 'Nanti',
    downloadingUpdate: 'Memuat turun...',
    installingUpdate: 'Memasang...',
    forceUpdateNotice: '⚗️ Kemas kini wajib. Sila kemas kini untuk meneruskan.',
    filterAll: 'Semua',
    importedTask: 'Import Tugas',
    editedTask: 'Edit Tugas',
    addedTask: 'Tambah Tugas',
    importFailFormat: 'Import gagal: format fail tidak betul',
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
    boundEmail: '이메일',
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
    phoneLogin: '이메일 로그인',
    inputPhone: '이메일 주소 입력',
    getCode: '코드 받기',
    inputCode: '코드 입력',
    loginBtn: '로그인',
    activateVip: 'VIP 활성화',
    purchaseVip: 'VIP 구매',
    activateCode: '활성화 코드',
    inputActivationCode: '활성화 코드 입력',
    activateBtn: '활성화',
    allTasks: '전체 작업', tasksInProgress: '진행 중', tasksFailed: '실패',
    todaySuccess: '오늘 성공', todayFailed: '오늘 실패',
    importTask: '가져오기', collapse: '접기', expand: '펼치기',
    exportConfig: '설정 내보내기',
    becomeMember: '회원 되기', purchaseMemberTab: '구매', activationCodeTab: '코드',
    nonMember: '비회원', unlockAllFeatures: '모든 기능 잠금 해제',
    loadingPlans: '요금제 로딩 중...', memberBenefits: '회원 혜택',
    benefitUnlimitedTasks: '무제한 작업', benefitAllSchedules: '모든 일정 유형',
    benefitBatchImportExport: '일괄 가져오기/내보내기', benefitNotifications: '실행 알림',
    benefitDetailedLogs: '상세 로그', benefitPrioritySupport: '우선 지원',
    wechatPay: 'WeChat Pay', alipayPay: 'Alipay',
    mockQrCode: 'QR 코드', scanToPay: '스캔하여 결제',
    actualPayment: '결제', limitedOffer: '한정 할인', originalPrice: '정가',
    agreeToTerms: '이용약관에 동의합니다',
    activationHint: '16자리 코드를 입력하여 회원 활성화', inputActivation16: '16자리 코드 입력',
    activating: '활성화 중...', activateNow: '지금 활성화',
    pleaseInputCode: '코드를 입력하세요', pleaseLoginFirst: '먼저 로그인하세요',
    activationSuccess: '활성화 성공! 만료:', networkError: '네트워크 오류',
    activationFailed: '활성화 실패', limitedTime: '한정', saveDiscount: '할인',
    addAppPath: '앱 경로 추가', addExecFile: '스크립트 추가',
    selectCycleType: '일정 유형 선택', editTask: '작업 편집',
    waitingExec: '대기 중', execSuccess: '오늘 성공', execFailed: '오늘 실패',
    enabled: '활성화됨', disabled: '비활성화됨', exported: '내보내기 완료',
    copied: '복사됨', deleted: '삭제됨', taskEnabled: '작업 활성화', taskDisabled: '작업 비활성화',
    execAt: '실행됨', logRecords: '개 기록', noLogsToday: '오늘 로그 없음',
    monday: '월요일', tuesday: '화요일', wednesday: '수요일', thursday: '목요일',
    friday: '금요일', saturday: '토요일', sunday: '일요일',
    openApp: '앱 열기', openAppPath: '경로로 열기', openExecFile: '스크립트 실행',
    copySuffix: '(사본)',
    copy: '복사',
    loadingApps: '앱 믐러오는 중...',
    selectExecType: '실행 유형 선택',
    delayExecOption: '지연 실행',
    immediateExecOption: '즉시 실행',
    delayTimeLabel: '지연 시간',
    minutesUnit: '분',
    everyLabel: '매',
    execOnceLabel: '번 실행',
    dailyIntervalHint: '0일 = 매일; 2일 = 2일마다 실행',
    weeklyIntervalHint: '0주 = 매주; 2주 = 2주마다 실행',
    selectWeekLabel: '요일 선택',
    selectDateLabel: '날짜 선택',
    bootExec: '부팅 시 실행',
    aboutToExec: '곳 실행',
    afterSuffix: ' 후',
    daysUnit: '일',
    hoursUnit: '시간',
    minutesShort: '분',
    secondsUnit: '초',
    newVersionFound: '새 버전 발견',
    currentVersionLabel: '현재 버전',
    updateChangelog: '업데이트 내용:',
    updateNow: '지금 업데이트',
    updateLater: '나중에',
    downloadingUpdate: '다운로드 중...',
    installingUpdate: '설치 중...',
    forceUpdateNotice: '⚗️ 필수 업데이트입니다. 계속하려면 업데이트하세요.',
    filterAll: '전체',
    importedTask: '가져오기',
    editedTask: '편집',
    addedTask: '추가',
    importFailFormat: '가져오기 실패: 파일 형식이 올바르지 않습니다',
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
