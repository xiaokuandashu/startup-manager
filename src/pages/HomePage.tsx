import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StartupTask } from '../types';
import StatsBar from '../components/StatsBar';
import TaskTable from '../components/TaskTable';
import AddTaskModal from '../components/AddTaskModal';

interface HomePageProps {
  searchQuery: string;
  checkVipBeforeAdd: () => boolean;
}

const TASKS_STORAGE_KEY = 'startup_tasks';
const EXECUTED_KEY = 'executed_tasks_today';

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

const getExecutedToday = (): Set<string> => {
  try {
    const data = localStorage.getItem(EXECUTED_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const today = new Date().toDateString();
      if (parsed.date === today) {
        return new Set(parsed.ids);
      }
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
    // 格式1: "YYYY-MM-DD HH:mm" (一次性任务)
    if (executeTime.includes('-')) {
      const dt = new Date(executeTime.replace(' ', 'T'));
      if (!isNaN(dt.getTime())) return dt;
    }
    // 格式2: "HH:mm" (每天/每周/每月任务)
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

// 计算倒计时文字（丰富格式）
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

  // > 7天：显示具体执行时间
  if (days > 7) {
    const y = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const h = String(target.getHours()).padStart(2, '0');
    const mi = String(target.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}`;
  }

  // 1-7天：X天X小时X分
  if (days >= 1) {
    const remainHours = hours % 24;
    const remainMins = mins % 60;
    let str = `${days}天`;
    if (remainHours > 0) str += `${remainHours}小时`;
    if (remainMins > 0) str += `${remainMins}分`;
    return str + '后';
  }

  // < 1天：X小时X分X秒
  const remainMins = mins % 60;
  const remainSecs = secs % 60;
  if (hours > 0) {
    return `${hours}小时${remainMins}分${remainSecs}秒后`;
  }
  if (remainMins > 0) {
    return `${remainMins}分${remainSecs}秒后`;
  }
  return `${remainSecs}秒后`;
};

// 检查任务是否应该执行
const shouldExecuteNow = (executeTime: string, timeType: string): boolean => {
  const target = parseExecTime(executeTime, timeType);
  if (!target) return false;
  const now = new Date();
  const diff = Math.abs(target.getTime() - now.getTime());
  return diff <= 60000; // ±1分钟容差
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

const HomePage: React.FC<HomePageProps> = ({ searchQuery, checkVipBeforeAdd }) => {
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
      // 每秒更新倒计时显示
      setTasks(prev => prev.map(t => ({
        ...t,
        timeUntilExec: calcCountdown(t.executeTime, t.timeType || ''),
      })));

      // 每30次tick（每30秒）检查任务执行
      executionCounter++;
      if (executionCounter >= 30) {
        executionCounter = 0;
        const currentTasks = loadTasks();
        for (const task of currentTasks) {
          if (!task.enabled) continue;
          if (executedRef.current.has(task.id)) continue;
          if (!task.executeTime || !task.path) continue;
          if (task.timeType === '开机启动' || task.timeType === '计算机启动时') continue;

          if (shouldExecuteNow(task.executeTime, task.timeType || '')) {
            console.log(`[定时任务] 执行: ${task.name} -> ${task.path}`);
            executedRef.current.add(task.id);
            markExecuted(task.id);

            const success = await executeLaunchApp(task.path);
            setTasks(prev => prev.map(t => {
              if (t.id === task.id) {
                return {
                  ...t,
                  status: success ? 'running' : 'error',
                  statusText: success ? '今日执行成功' : '今日执行失败',
                };
              }
              return t;
            }));
          }
        }
      }
    };

    tick();
    const timer = setInterval(tick, 1000); // 每秒更新
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
    setTasks(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  }, []);

  const handleSelect = (id: string) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelect = () => {
    if (isSelectMode) {
      setIsSelectMode(false);
      setSelectedTasks([]);
    } else {
      setIsSelectMode(true);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

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
    }
  }, [tasks]);

  const handleDelete = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTasks(prev => prev.filter(x => x !== id));
  }, []);

  const handleBatchDelete = () => {
    setTasks(prev => prev.filter(t => !selectedTasks.includes(t.id)));
    setSelectedTasks([]);
    setIsSelectMode(false);
  };

  const handleAddTask = (formData: {
    name: string; taskType: string; timeType: string;
    executeTime: string; path: string; note: string;
  }) => {
    if (editingTask) {
      setTasks(prev => prev.filter(t => t.id !== editingTask.id));
    }

    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const newTask: StartupTask = {
      id: editingTask?.id || Date.now().toString(),
      name: formData.name,
      path: formData.path,
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
        onImportTask={() => {}}
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
        onExport={() => {}}
        onBatchDelete={handleBatchDelete}
        onBatchExport={() => {}}
      />
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null); }}
        onSubmit={handleAddTask}
      />
    </div>
  );
};

export default HomePage;
