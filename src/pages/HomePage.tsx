import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StartupTask, LogEntry } from '../types';
import StatsBar from '../components/StatsBar';
import TaskTable from '../components/TaskTable';
import AddTaskModal from '../components/AddTaskModal';
import { Language } from '../i18n';

interface HomePageProps {
  searchQuery: string;
  checkVipBeforeAdd: () => boolean;
  lang?: Language;
}

const TASKS_STORAGE_KEY = 'startup_tasks';
const EXECUTED_KEY = 'executed_tasks_today';
const LOGS_STORAGE_KEY = 'task_execution_logs';

const loadTasks = (): StartupTask[] => {
  try {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load tasks:', e);
  }
  return [];
};

const saveTasks = (tasks: StartupTask[]) => {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
};

// 写入日志到 localStorage
const writeLog = (entry: Omit<LogEntry, 'id'>) => {
  try {
    const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || '[]') as LogEntry[];
    const newLog: LogEntry = {
      ...entry,
      id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
    };
    logs.push(newLog);
    // 保留最近 500 条日志
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to write log:', e);
  }
};

// 获取当前时间 ISO 字符串（本地时间）
const nowTimestamp = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const getExecutedToday = (): Set<string> => {
  try {
    const data = localStorage.getItem(EXECUTED_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const today = new Date().toDateString();
      if (parsed.date === today) return new Set(parsed.ids);
    }
  } catch {}
  return new Set();
};

const markExecuted = (taskId: string) => {
  const executed = getExecutedToday();
  executed.add(taskId);
  localStorage.setItem(EXECUTED_KEY, JSON.stringify({
    date: new Date().toDateString(),
    ids: Array.from(executed),
  }));
};

// 解析执行时间为 Date 对象
const parseExecTime = (executeTime: string, timeType: string): Date | null => {
  if (!executeTime || executeTime === '—' || timeType === '开机启动' || timeType === '计算机启动时') return null;
  try {
    if (executeTime.includes('-')) {
      const dt = new Date(executeTime.replace(' ', 'T'));
      if (!isNaN(dt.getTime())) return dt;
    }
    const [h, m] = executeTime.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  } catch {
    return null;
  }
};

// 计算倒计时文字
const calcCountdown = (executeTime: string, timeType: string): string => {
  if (!executeTime || executeTime === '—' || timeType === '开机启动' || timeType === '计算机启动时') return '开机时执行';
  const target = parseExecTime(executeTime, timeType);
  if (!target) return '—';

  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return '即将执行';

  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    const y = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const h = String(target.getHours()).padStart(2, '0');
    const mi = String(target.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}`;
  }

  if (days >= 1) {
    const rh = hours % 24;
    const rm = mins % 60;
    let str = `${days}天`;
    if (rh > 0) str += `${rh}小时`;
    if (rm > 0) str += `${rm}分`;
    return str + '后';
  }

  const rm = mins % 60;
  const rs = secs % 60;
  if (hours > 0) return `${hours}小时${rm}分${rs}秒后`;
  if (rm > 0) return `${rm}分${rs}秒后`;
  return `${rs}秒后`;
};

// 检查任务是否应该执行（包括延迟执行）
const shouldExecuteNow = (task: StartupTask): boolean => {
  const { executeTime, timeType } = task;

  // 开机启动 + 延迟执行（通过 startupTime 追踪）
  if (timeType === '计算机启动时' || timeType === '开机启动') {
    if (task.startupTime) {
      const now = Date.now();
      return now >= task.startupTime;
    }
    return false;
  }

  const target = parseExecTime(executeTime, timeType);
  if (!target) return false;
  const now = new Date();
  const diff = Math.abs(target.getTime() - now.getTime());
  return diff <= 60000;
};

// 执行 Tauri launch_app 命令
const executeLaunchApp = async (appPath: string): Promise<boolean> => {
  try {
    const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) {
      console.log('[模拟执行] launch_app:', appPath);
      return true;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('launch_app', { appPath });
    return true;
  } catch (e) {
    console.error('启动失败:', e);
    return false;
  }
};

// 导出单个任务配置为 JSON 文件
const exportTaskConfig = (task: StartupTask) => {
  const config = {
    name: task.name,
    path: task.path,
    icon: task.icon,
    taskType: task.taskType,
    timeType: task.timeType,
    executeTime: task.executeTime,
    note: task.note,
    enabled: task.enabled,
    fileExt: task.fileExt,
  };
  const blob = new Blob([JSON.stringify([config], null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `自启精灵_${task.name}.json`;
  a.click();
  URL.revokeObjectURL(url);

  writeLog({
    taskName: task.name,
    taskType: task.taskType,
    timeType: task.timeType,
    executeTime: task.executeTime,
    action: 'info' as any,
    message: `导出任务配置`,
    timestamp: nowTimestamp(),
    level: 'info',
    statusText: '导出成功',
    fileExt: task.fileExt,
    icon: task.icon,
  });
};

const HomePage: React.FC<HomePageProps> = ({ searchQuery, checkVipBeforeAdd, lang = 'zh' }) => {
  const [tasks, setTasks] = useState<StartupTask[]>(loadTasks);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<StartupTask | null>(null);
  const executedRef = useRef<Set<string>>(getExecutedToday());

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // 每秒更新倒计时 + 每30秒检查任务执行
  useEffect(() => {
    let executionCounter = 0;

    const tick = async () => {
      setTasks(prev => prev.map(t => ({
        ...t,
        timeUntilExec: calcCountdown(t.executeTime, t.timeType || ''),
      })));

      executionCounter++;
      if (executionCounter >= 30) {
        executionCounter = 0;
        const currentTasks = loadTasks();
        for (const task of currentTasks) {
          if (!task.enabled) continue;
          if (executedRef.current.has(task.id)) continue;
          if (!task.path) continue;

          if (shouldExecuteNow(task)) {
            console.log(`[定时任务] 执行: ${task.name} -> ${task.path}`);
            executedRef.current.add(task.id);
            markExecuted(task.id);

            const success = await executeLaunchApp(task.path);
            const statusText = success ? '今日执行成功' : '今日执行失败';

            // 写入日志
            writeLog({
              taskName: task.name,
              taskType: task.taskType,
              timeType: task.timeType,
              executeTime: task.executeTime,
              action: success ? 'start' : 'error',
              message: success ? `成功启动 ${task.path}` : `启动失败 ${task.path}`,
              timestamp: nowTimestamp(),
              level: success ? 'success' : 'error',
              statusText,
              fileExt: task.fileExt,
              icon: task.icon,
            });

            setTasks(prev => prev.map(t => {
              if (t.id === task.id) {
                return { ...t, status: success ? 'running' : 'error', statusText };
              }
              return t;
            }));
          }
        }
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredTasks = searchQuery
    ? tasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks;

  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.enabled).length,
    failed: tasks.filter(t => t.status === 'error').length,
    todaySuccess: tasks.filter(t => t.statusText === '今日执行成功').length,
    todayFailed: tasks.filter(t => t.statusText === '今日执行失败').length,
  };

  const handleAddClick = () => {
    if (checkVipBeforeAdd()) {
      setEditingTask(null);
      setShowAddModal(true);
    }
  };

  const handleToggle = useCallback((id: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          const newEnabled = !t.enabled;
          writeLog({
            taskName: t.name,
            taskType: t.taskType,
            timeType: t.timeType,
            executeTime: t.executeTime,
            action: newEnabled ? 'enable' : 'disable',
            message: newEnabled ? '启用任务' : '禁用任务',
            timestamp: nowTimestamp(),
            level: 'info',
            statusText: newEnabled ? '已启用' : '已禁用',
            fileExt: t.fileExt,
            icon: t.icon,
          });
          return { ...t, enabled: newEnabled };
        }
        return t;
      });
      return updated;
    });
  }, []);

  const handleSelect = (id: string) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelect = () => {
    if (isSelectMode) { setIsSelectMode(false); setSelectedTasks([]); }
    else { setIsSelectMode(true); }
  };

  const handleToggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) setSelectedTasks([]);
    else setSelectedTasks(filteredTasks.map(t => t.id));
  };

  // 编辑任务（携带当前任务参数）
  const handleEdit = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(task);
      setShowAddModal(true);
    }
  }, [tasks]);

  const handleCopy = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const copied: StartupTask = {
        ...task,
        id: Date.now().toString(),
        name: task.name + ' (副本)',
        statusText: '等待执行',
      };
      setTasks(prev => [...prev, copied]);
      writeLog({
        taskName: copied.name,
        taskType: copied.taskType,
        timeType: copied.timeType,
        executeTime: copied.executeTime,
        action: 'add',
        message: `复制任务自 ${task.name}`,
        timestamp: nowTimestamp(),
        level: 'info',
        statusText: '已复制',
        fileExt: copied.fileExt,
        icon: copied.icon,
      });
    }
  }, [tasks]);

  const handleDelete = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      writeLog({
        taskName: task.name,
        taskType: task.taskType,
        timeType: task.timeType,
        executeTime: task.executeTime,
        action: 'remove',
        message: `删除任务`,
        timestamp: nowTimestamp(),
        level: 'warning',
        statusText: '已删除',
        fileExt: task.fileExt,
        icon: task.icon,
      });
    }
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTasks(prev => prev.filter(x => x !== id));
  }, [tasks]);

  // 导出单个任务
  const handleExport = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) exportTaskConfig(task);
  }, [tasks]);

  const handleBatchDelete = () => {
    setTasks(prev => prev.filter(t => !selectedTasks.includes(t.id)));
    setSelectedTasks([]);
    setIsSelectMode(false);
  };

  const handleBatchExport = () => {
    const selected = tasks.filter(t => selectedTasks.includes(t.id));
    if (selected.length === 0) return;
    const configs = selected.map(task => ({
      name: task.name, path: task.path, icon: task.icon,
      taskType: task.taskType, timeType: task.timeType,
      executeTime: task.executeTime, note: task.note,
      enabled: task.enabled, fileExt: task.fileExt,
    }));
    const blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selected.length === 1 ? `自启精灵_${selected[0].name}.json` : '自启精灵_多任务列表.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTask = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          let data = JSON.parse(ev.target?.result as string);
          // Support both single object and array format
          if (!Array.isArray(data)) data = [data];
          const newTasks: StartupTask[] = data.map((item: any) => ({
            id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
            name: item.name || '导入任务',
            path: item.path || '',
            icon: item.icon || '',
            enabled: item.enabled !== false,
            type: 'application' as const,
            taskType: item.taskType || '打开应用',
            timeType: item.timeType || '计算机启动时',
            executeTime: item.executeTime || '',
            timeUntilExec: '',
            status: 'running' as const,
            note: item.note || '',
            statusText: '等待执行',
            fileExt: item.fileExt || '.exe',
          }));
          setTasks(prev => [...prev, ...newTasks]);
          alert(`成功导入 ${newTasks.length} 个任务`);
        } catch (err) {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleAddTask = (formData: {
    name: string; taskType: string; timeType: string;
    executeTime: string; path: string; note: string;
    selectedApp?: string; icon?: string;
  }) => {
    if (editingTask) {
      setTasks(prev => prev.filter(t => t.id !== editingTask.id));
    }

    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const newTask: StartupTask = {
      id: editingTask?.id || Date.now().toString(),
      name: formData.name,
      path: formData.path,
      icon: formData.icon || editingTask?.icon,
      enabled: editingTask?.enabled ?? true,
      type: 'application',
      taskType: formData.taskType,
      timeType: formData.timeType,
      executeTime: formData.executeTime,
      timeUntilExec: calcCountdown(formData.executeTime, formData.timeType),
      status: 'running',
      note: formData.note,
      statusText: '等待执行',
      fileExt: formData.taskType === '打开应用' ? (isMac ? '.app' : '.exe') : formData.taskType === '打开执行文件' ? (isMac ? '.sh' : '.bat') : '.exe',
    };
    setTasks(prev => [...prev, newTask]);
    setEditingTask(null);

    writeLog({
      taskName: newTask.name,
      taskType: newTask.taskType,
      timeType: newTask.timeType,
      executeTime: newTask.executeTime,
      action: editingTask ? 'enable' : 'add',
      message: editingTask ? '编辑任务' : '添加任务',
      timestamp: nowTimestamp(),
      level: 'info',
      statusText: editingTask ? '已编辑' : '已添加',
      fileExt: newTask.fileExt,
      icon: newTask.icon,
    });
  };

  return (
    <div className="home-page">
      <StatsBar
        totalTasks={stats.total}
        runningTasks={stats.running}
        failedTasks={stats.failed}
        todaySuccess={stats.todaySuccess}
        todayFailed={stats.todayFailed}
        onAddTask={handleAddClick}
        onImportTask={handleImportTask}
      />
      <TaskTable
        tasks={tasks}
        filteredTasks={filteredTasks}
        selectedTasks={selectedTasks}
        isSelectMode={isSelectMode}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onSelect={handleSelect}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onExport={handleExport}
        onBatchDelete={handleBatchDelete}
        onBatchExport={handleBatchExport}
        lang={lang}
      />
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null); }}
        onSubmit={handleAddTask}
        editingTask={editingTask}
      />
    </div>
  );
};

export default HomePage;
