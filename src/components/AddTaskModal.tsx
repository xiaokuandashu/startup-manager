import React, { useState, useEffect } from 'react';
import { StartupTask } from '../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: {
    name: string;
    taskType: string;
    timeType: string;
    executeTime: string;
    path: string;
    note: string;
    selectedApp?: string;
    icon?: string;
  }) => void;
  editingTask?: StartupTask | null;
}

interface AppInfo {
  name: string;
  icon: string;
  path?: string;
}

const mockApps: AppInfo[] = [
  { name: '阿里云盘', icon: '☁️' },
  { name: '爱奇艺', icon: '🎬' },
  { name: '百度网盘', icon: '💾' },
  { name: '贝锐向日葵', icon: '🌻' },
  { name: '备忘录', icon: '📝' },
  { name: 'VS Code', icon: '💻' },
  { name: 'Chrome', icon: '🌐' },
  { name: 'WeChat', icon: '💬' },
  { name: 'Slack', icon: '🔔' },
  { name: 'Docker', icon: '🐳' },
  { name: 'Spotify', icon: '🎵' },
  { name: 'Figma', icon: '🎨' },
];

const weekDays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

// 平台检测
const isTauriEnv = () => !!(window as any).__TAURI_INTERNALS__;

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSubmit, editingTask }) => {
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<'app' | 'appPath' | 'execFile'>('app');
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedAppIcon, setSelectedAppIcon] = useState<string | undefined>();
  const [appSearch, setAppSearch] = useState('');
  const [cycleType, setCycleType] = useState('计算机启动时');
  const [execType, setExecType] = useState('延时执行');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [execTime, setExecTime] = useState('00:00');
  const todayStr = new Date().toISOString().split('T')[0];
  const [execDate, setExecDate] = useState(todayStr);
  const [intervalValue, setIntervalValue] = useState(0);
  const [hasEndTime, setHasEndTime] = useState(false);
  const [endDate, setEndDate] = useState(todayStr);
  const [endTime, setEndTime] = useState('00:00');
  const [selectedWeekDays, setSelectedWeekDays] = useState<string[]>([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]);
  const [path, setPath] = useState('');
  const [note, setNote] = useState('');

  // 编辑模式时预填表单
  useEffect(() => {
    if (editingTask && isOpen) {
      setName(editingTask.name || '');
      setNote(editingTask.note || '');
      setPath(editingTask.path || '');
      setSelectedAppIcon(editingTask.icon);
      setCycleType(editingTask.timeType || '计算机启动时');
      if (editingTask.taskType === '打开应用') setActiveTab('app');
      else if (editingTask.taskType === '路径打开应用') setActiveTab('appPath');
      else setActiveTab('execFile');
      // 解析执行时间
      if (editingTask.executeTime && editingTask.executeTime !== '—') {
        if (editingTask.executeTime.includes('-')) {
          const [datePart, timePart] = editingTask.executeTime.split(' ');
          if (datePart) setExecDate(datePart);
          if (timePart) setExecTime(timePart);
        } else {
          setExecTime(editingTask.executeTime);
        }
      }
    }
  }, [editingTask, isOpen]);

  // 文件选择对话框
  const selectFilePath = async (type: 'app' | 'exec') => {
    if (isTauriEnv()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const filters = type === 'app'
          ? [{ name: '应用程序', extensions: ['exe', 'app', 'lnk'] }]
          : [{ name: '脚本文件', extensions: ['bat', 'cmd', 'ps1', 'sh', 'command'] }];
        const selected = await open({
          multiple: false,
          directory: false,
          filters,
          title: type === 'app' ? '选择应用程序' : '选择执行文件',
        });
        if (selected) {
          setPath(selected as string);
        }
      } catch (e) {
        console.error('文件选择失败:', e);
      }
    } else {
      // 浏览器模式：用 prompt
      const result = prompt(type === 'app' ? '请输入应用路径' : '请输入执行文件路径');
      if (result) setPath(result);
    }
  };

  // B5: 应用列表（Tauri 真实加载 vs 浏览器 mock）
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // B6: 平台信息
  const [platform, setPlatform] = useState<'macos' | 'windows' | 'linux'>(() => {
    return navigator.platform.toUpperCase().includes('MAC') ? 'macos' : 'windows';
  });
  const [hasAppPathTab, setHasAppPathTab] = useState(() => {
    return !navigator.platform.toUpperCase().includes('MAC'); // Mac 默认无应用路径 Tab
  });

  // B5 + B6: 初始化时加载平台信息和应用列表（快速加载，图标懒加载）
  useEffect(() => {
    if (!isOpen) return;

    const loadPlatformAndApps = async () => {
      if (isTauriEnv()) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          // B6: 获取平台信息
          try {
            const platformInfo = await invoke('get_platform_info') as {
              os: string;
              has_app_path_tab: boolean;
              script_extensions: string[];
            };
            const detectedPlatform = platformInfo.os === 'windows' ? 'windows' : platformInfo.os === 'linux' ? 'linux' : 'macos';
            setPlatform(detectedPlatform);
            setHasAppPathTab(platformInfo.has_app_path_tab);
          } catch {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            setPlatform(isMac ? 'macos' : 'windows');
            setHasAppPathTab(!isMac);
          }

          // B5: 快速获取应用列表（不含图标）
          setAppsLoading(true);
          try {
            const installedApps = await invoke('get_installed_apps') as AppInfo[];
            if (installedApps && installedApps.length > 0) {
              setApps(installedApps);
              setAppsLoading(false);

              // 并行加载图标：每批5个，提速5倍
              const BATCH_SIZE = 5;
              for (let i = 0; i < installedApps.length; i += BATCH_SIZE) {
                const batch = installedApps.slice(i, i + BATCH_SIZE);
                const results = await Promise.allSettled(
                  batch.map(async (app) => {
                    const icon = await invoke('get_app_icon', { appPath: app.path }) as string;
                    return { path: app.path, icon };
                  })
                );
                results.forEach(r => {
                  if (r.status === 'fulfilled' && r.value.icon) {
                    setApps(prev => prev.map(a => a.path === r.value.path ? { ...a, icon: r.value.icon } : a));
                  }
                });
              }
            } else {
              setApps(mockApps);
              setAppsLoading(false);
            }
          } catch {
            setApps(mockApps);
            setAppsLoading(false);
          }
        } catch {
          setApps(mockApps);
          setAppsLoading(false);
        }
      } else {
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        setPlatform(isMac ? 'macos' : 'windows');
        setHasAppPathTab(!isMac);
        setApps(mockApps);
      }
    };

    loadPlatformAndApps();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredApps = apps.filter(a =>
    a.name.toLowerCase().includes(appSearch.toLowerCase())
  );

  // B6: 执行文件后缀提示
  const execFileHint = platform === 'macos'
    ? '执行文件后缀为.sh/.command，完整路径如：/usr/local/bin/script.sh'
    : '执行文件后缀为.bat，完整执行文件路径为：C:\\Program Files\\abc.bat';

  const appPathHint = platform === 'macos'
    ? '应用后缀为.app，完整路径如：/Applications/App.app'
    : '应用后缀为.exe，完整应用路径为：C:\\Program Files\\qq\\qq.exe';

  const toggleWeekDay = (day: string) => {
    setSelectedWeekDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleMonthDay = (day: number) => {
    setSelectedMonthDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 找到选中应用的图标
    const appIcon = selectedAppIcon || apps.find(a => a.name === selectedApp)?.icon;
    onSubmit({
      name: name || selectedApp,
      taskType: activeTab === 'app' ? '打开应用' : activeTab === 'appPath' ? '路径打开应用' : '打开执行文件',
      timeType: cycleType,
      executeTime: cycleType === '计算机启动时' ? '—' : cycleType === '一次' ? `${execDate} ${execTime}` : execTime,
      path,
      note,
      selectedApp,
      icon: appIcon,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setSelectedApp('');
    setAppSearch('');
    setCycleType('计算机启动时');
    setPath('');
    setNote('');
    setDelayMinutes(0);
    setIntervalValue(0);
    setHasEndTime(false);
    setSelectedWeekDays([]);
    setSelectedMonthDays([]);
  };

  const intervalUnit = cycleType === '每天' ? '天' : cycleType === '每周' ? '周' : cycleType === '每月' ? '月' : '';

  // B6: 构建可用的 Tab 列表
  const availableTabs: { key: 'app' | 'appPath' | 'execFile'; label: string }[] = [
    { key: 'app', label: '应用' },
    ...(hasAppPathTab ? [{ key: 'appPath' as const, label: '应用路径' }] : []),
    { key: 'execFile', label: '执行文件' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>添加</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* 任务名称 */}
          <div className="form-row-inline">
            <label className="form-label-inline">任务名称</label>
            <div className="form-input-wrap">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder="请输入任务名称"
              />
              <span className="char-count">{name.length}/30</span>
            </div>
          </div>

          {/* 选择任务类型 — B6: 动态 Tabs */}
          <div className="form-row-inline">
            <label className="form-label-inline">选择任务类型</label>
            <div className="task-type-tabs">
              {availableTabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  className={`type-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 应用 Tab - 应用网格 (B5: 支持 loading 状态) */}
          {activeTab === 'app' && (
            <div className="app-grid-section">
              <div className="app-search-box">
                <input
                  type="text"
                  placeholder="搜索APP名称"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                />
                <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              {appsLoading ? (
                <div className="app-grid-loading">
                  <div className="loading-spinner"></div>
                  <span>加载应用列表中...</span>
                </div>
              ) : (
                <div className="app-grid">
                  {filteredApps.map((app) => (
                    <label key={app.name} className={`app-grid-item ${selectedApp === app.name ? 'selected' : ''}`}>
                      <div className="app-icon-placeholder">
                        {app.icon && app.icon.startsWith('data:image') ? (
                          <img src={app.icon} alt={app.name} width="32" height="32" style={{ borderRadius: 6, objectFit: 'contain' }} />
                        ) : (
                          <span>{app.icon || '📱'}</span>
                        )}
                      </div>
                      <span className="app-grid-name">{app.name}</span>
                      <input
                        type="radio"
                        name="selectedApp"
                        checked={selectedApp === app.name}
                        onChange={() => { setSelectedApp(app.name); if (app.path) setPath(app.path); setSelectedAppIcon(app.icon); }}
                      />
                      <span className="app-radio"></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 应用路径 Tab — B6: 仅在 hasAppPathTab 时可见 */}
          {activeTab === 'appPath' && hasAppPathTab && (
            <div className="form-row-inline">
              <label className="form-label-inline">添加应用路径</label>
              <div className="path-select-group">
                <button type="button" className="path-select-btn" onClick={() => selectFilePath('app')}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><rect x="1" y="1" width="14" height="14" rx="2" fill="#42A5F5"/></svg>
                  选择路径
                </button>
                {path ? (
                  <span className="path-selected">{path}</span>
                ) : (
                  <span className="path-hint">{appPathHint}</span>
                )}
              </div>
            </div>
          )}

          {/* 执行文件 Tab — B6: 根据平台差异化后缀提示 */}
          {activeTab === 'execFile' && (
            <div className="form-row-inline">
              <label className="form-label-inline">添加执行文件</label>
              <div className="path-select-group">
                <button type="button" className="path-select-btn" onClick={() => selectFilePath('exec')}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><rect x="1" y="1" width="14" height="14" rx="2" fill="#42A5F5"/></svg>
                  选择路径
                </button>
                {path ? (
                  <span className="path-selected">{path}</span>
                ) : (
                  <span className="path-hint">{execFileHint}</span>
                )}
              </div>
            </div>
          )}

          {/* 周期类型 */}
          <div className="form-row-inline">
            <label className="form-label-inline">选择周期类型</label>
            <select value={cycleType} onChange={(e) => setCycleType(e.target.value)} className="form-select">
              <option value="计算机启动时">计算机启动时</option>
              <option value="一次">一次</option>
              <option value="每天">每天</option>
              <option value="每周">每周</option>
              <option value="每月">每月</option>
            </select>
          </div>

          {/* 计算机启动时 */}
          {cycleType === '计算机启动时' && (
            <>
              <div className="form-row-inline">
                <label className="form-label-inline">选择执行类型</label>
                <select value={execType} onChange={(e) => setExecType(e.target.value)} className="form-select">
                  <option value="延时执行">延时执行</option>
                  <option value="立即执行">立即执行</option>
                </select>
              </div>
              {execType === '延时执行' && (
                <div className="form-row-inline">
                  <label className="form-label-inline">延时执行时间</label>
                  <div className="delay-input">
                    <input type="number" value={delayMinutes} min={0} onChange={(e) => setDelayMinutes(Number(e.target.value))} />
                    <span>分钟</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 一次 */}
          {cycleType === '一次' && (
            <div className="form-row-inline">
              <label className="form-label-inline">执行时间</label>
              <div className="datetime-inputs">
                <input type="date" value={execDate} onChange={(e) => setExecDate(e.target.value)} />
                <input type="time" value={execTime} onChange={(e) => setExecTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* 每天 */}
          {cycleType === '每天' && (
            <>
              <div className="form-row-inline">
                <label className="form-label-inline">执行时间</label>
                <input type="time" value={execTime} onChange={(e) => setExecTime(e.target.value)} className="form-input-sm" />
              </div>
              <div className="form-row-inline">
                <label className="form-label-inline">每隔</label>
                <div className="delay-input">
                  <input type="number" value={intervalValue} min={0} onChange={(e) => setIntervalValue(Number(e.target.value))} />
                  <span>{intervalUnit}执行一次</span>
                </div>
                <span className="form-hint">每隔0天执行一次表示每天都执行；每隔2天执行一次，表示每隔2天后执行一次，依次类推</span>
              </div>
              <div className="form-row-inline">
                <label className="form-label-inline">结束时间</label>
                <label className="toggle-switch toggle-sm">
                  <input type="checkbox" checked={hasEndTime} onChange={(e) => setHasEndTime(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {hasEndTime && (
                <div className="form-row-inline" style={{ paddingLeft: 120 }}>
                  <div className="datetime-inputs">
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* 每周 */}
          {cycleType === '每周' && (
            <>
              <div className="form-row-inline">
                <label className="form-label-inline">执行时间</label>
                <input type="time" value={execTime} onChange={(e) => setExecTime(e.target.value)} className="form-input-sm" />
              </div>
              <div className="form-row-inline align-top">
                <label className="form-label-inline">选择周</label>
                <div className="weekday-grid">
                  {weekDays.map(day => (
                    <label key={day} className={`weekday-checkbox ${selectedWeekDays.includes(day) ? 'checked' : ''}`}>
                      <input type="checkbox" checked={selectedWeekDays.includes(day)} onChange={() => toggleWeekDay(day)} />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row-inline">
                <label className="form-label-inline">每隔</label>
                <div className="delay-input">
                  <input type="number" value={intervalValue} min={0} onChange={(e) => setIntervalValue(Number(e.target.value))} />
                  <span>{intervalUnit}执行一次</span>
                </div>
                <span className="form-hint">每隔0周执行一次表示每周都执行；每隔2周执行一次，表示每隔2周后执行一次，依次类推</span>
              </div>
              <div className="form-row-inline">
                <label className="form-label-inline">结束时间</label>
                <label className="toggle-switch toggle-sm">
                  <input type="checkbox" checked={hasEndTime} onChange={(e) => setHasEndTime(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {hasEndTime && (
                <div className="form-row-inline" style={{ paddingLeft: 120 }}>
                  <div className="datetime-inputs">
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* 每月 */}
          {cycleType === '每月' && (
            <>
              <div className="form-row-inline">
                <label className="form-label-inline">执行时间</label>
                <input type="time" value={execTime} onChange={(e) => setExecTime(e.target.value)} className="form-input-sm" />
              </div>
              <div className="form-row-inline align-top">
                <label className="form-label-inline">选择日期</label>
                <div className="monthday-grid">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <label key={day} className={`monthday-checkbox ${selectedMonthDays.includes(day) ? 'checked' : ''}`}>
                      <input type="checkbox" checked={selectedMonthDays.includes(day)} onChange={() => toggleMonthDay(day)} />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row-inline">
                <label className="form-label-inline">每隔</label>
                <div className="delay-input">
                  <input type="number" value={intervalValue} min={0} onChange={(e) => setIntervalValue(Number(e.target.value))} />
                  <span>{intervalUnit}执行一次</span>
                </div>
              </div>
              <div className="form-row-inline">
                <label className="form-label-inline">结束时间</label>
                <label className="toggle-switch toggle-sm">
                  <input type="checkbox" checked={hasEndTime} onChange={(e) => setHasEndTime(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {hasEndTime && (
                <div className="form-row-inline" style={{ paddingLeft: 120 }}>
                  <div className="datetime-inputs">
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* 备注 */}
          <div className="form-row-inline">
            <label className="form-label-inline">备注</label>
            <div className="form-input-wrap">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 30))}
                placeholder="请输入备注内容"
              />
              <span className="char-count">{note.length}/30</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
            <button type="submit" className="btn-confirm">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
