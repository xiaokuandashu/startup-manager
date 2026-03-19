import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

/// 简易 i18n 实现（中/英双语）
class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  static const supportedLocales = [Locale('zh'), Locale('en')];
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

  bool get isZh => locale.languageCode == 'zh';

  // ============ 通用 ============
  String get appTitle => isZh ? '任务精灵' : 'Task Wizard';
  String get ok => isZh ? '确定' : 'OK';
  String get cancel => isZh ? '取消' : 'Cancel';
  String get save => isZh ? '保存' : 'Save';
  String get delete => isZh ? '删除' : 'Delete';
  String get edit => isZh ? '编辑' : 'Edit';
  String get search => isZh ? '搜索' : 'Search';
  String get loading => isZh ? '加载中...' : 'Loading...';

  // ============ Tab 栏 ============
  String get tabHome => isZh ? '首页' : 'Home';
  String get tabAi => isZh ? 'AI' : 'AI';
  String get tabTools => isZh ? '工具' : 'Tools';
  String get tabProfile => isZh ? '我的' : 'Profile';

  // ============ 登录 ============
  String get login => isZh ? '登录' : 'Log In';
  String get register => isZh ? '注册' : 'Sign Up';
  String get email => isZh ? '邮箱' : 'Email';
  String get password => isZh ? '密钥' : 'Password';
  String get verifyCode => isZh ? '验证码' : 'Code';
  String get sendCode => isZh ? '发送验证码' : 'Send Code';
  String get loginWithCode => isZh ? '验证码登录' : 'Login with Code';
  String get loginWithPassword => isZh ? '密钥登录' : 'Login with Password';
  String get emailHint => isZh ? '请输入邮箱' : 'Enter your email';
  String get passwordHint => isZh ? '请输入密钥' : 'Enter your password';
  String get codeHint => isZh ? '请输入验证码' : 'Enter verification code';

  // ============ 首页 ============
  String get deviceOnline => isZh ? '在线' : 'Online';
  String get deviceOffline => isZh ? '离线' : 'Offline';
  String get running => isZh ? '运行中' : 'Running';
  String get completed => isZh ? '已完成' : 'Done';
  String get pending => isZh ? '待执行' : 'Pending';
  String get computerStatus => isZh ? '电脑状态' : 'PC Status';
  String get recentActivity => isZh ? '最近记录' : 'Recent';

  // ============ AI ============
  String get aiAssistant => isZh ? 'AI 助手' : 'AI Assistant';
  String get inputHint => isZh ? '告诉我你想做什么...' : 'Tell me what to do...';
  String get cloudModel => isZh ? '云端' : 'Cloud';
  String get localModel => isZh ? '本地' : 'Local';
  String get voiceInput => isZh ? '语音输入' : 'Voice';
  String get sendImage => isZh ? '发送图片' : 'Send Image';

  // ============ 工具 ============
  String get taskMgmt => isZh ? '任务管理' : 'Tasks';
  String get quickAction => isZh ? '快捷操作' : 'Quick Run';
  String get collaboration => isZh ? '协同任务' : 'Collab';
  String get remoteLaunch => isZh ? '远程启动' : 'Launch';
  String get scriptExec => isZh ? '脚本执行' : 'Scripts';
  String get recordingMgmt => isZh ? '录制管理' : 'Recording';
  String get fileBrowser => isZh ? '文件浏览' : 'Files';
  String get phoneAuto => isZh ? '手机自动化' : 'Auto';
  String get modelMgmt => isZh ? '模型管理' : 'Models';
  String get execLog => isZh ? '执行日志' : 'Logs';
  String get pluginMarket => isZh ? '插件市场' : 'Plugins';
  String get moreTools => isZh ? '更多工具' : 'More';
  String get bgRunning => isZh ? '后台运行中' : 'Background';

  // ============ 我的 ============
  String get deviceManagement => isZh ? '设备管理' : 'Devices';
  String get aiModelSettings => isZh ? 'AI 模型设置' : 'AI Models';
  String get appearance => isZh ? '外观' : 'Appearance';
  String get language => isZh ? '语言' : 'Language';
  String get security => isZh ? '安全设置' : 'Security';
  String get about => isZh ? '关于' : 'About';
  String get logout => isZh ? '退出登录' : 'Log Out';
  String get lightMode => isZh ? '亮色' : 'Light';
  String get darkMode => isZh ? '暗色' : 'Dark';
  String get systemMode => isZh ? '跟随系统' : 'System';

  // ============ 协同 ============
  String get authRequest => isZh ? '电脑请求授权' : 'PC Auth Request';
  String get goAuth => isZh ? '去授权' : 'Authorize';
  String get ignore => isZh ? '忽略' : 'Ignore';
  String get smsForward => isZh ? '验证码转发' : 'SMS Forward';
  String get sendToPC => isZh ? '发送到电脑' : 'Send to PC';
  String get execute => isZh ? '执行' : 'Run';

  // ============ 任务类型 ============
  String get daily => isZh ? '每天' : 'Daily';
  String get steps => isZh ? '个步骤' : ' steps';

  // ============ 新增 ============
  String get viewMore => isZh ? '查看更多' : 'View More';
  String get viewAll => isZh ? '查看全部' : 'View All';
  String get cpuUsage => isZh ? 'CPU利用率' : 'CPU';
  String get memoryLabel => isZh ? '内存' : 'Memory';
  String get diskLabel => isZh ? '硬盘' : 'Disk';
  String get myDevices => isZh ? '我的设备' : 'My Devices';
  String get taskOverview => isZh ? '任务概览' : 'Task Overview';
  String get deviceDetail => isZh ? '设备详情' : 'Device Detail';
  String get activityLog => isZh ? '活动日志' : 'Activity Log';
  String get maxDevices => isZh ? '最多100台' : 'Max 100';
  String get onlineCount => isZh ? '台在线' : ' online';
  String get noDevices => isZh ? '暂无设备连接' : 'No devices connected';
  String get searchDevices => isZh ? '搜索设备' : 'Search devices';
  String get temperature => isZh ? '温度' : 'Temperature';
  String get utilization => isZh ? '利用率' : 'Utilization';
  String get total => isZh ? '总计' : 'Total';
  String get used => isZh ? '已用' : 'Used';
  String get free => isZh ? '可用' : 'Free';
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['zh', 'en'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async => AppLocalizations(locale);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
