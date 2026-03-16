import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { t, Language } from '../i18n';

interface LogPageProps {
  searchQuery: string;
  lang?: Language;
}

const LOGS_STORAGE_KEY = 'task_execution_logs';

// 读取所有日志
const loadAllLogs = (): LogEntry[] => {
  try {
    const saved = localStorage.getItem(LOGS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
};

const LogPage: React.FC<LogPageProps> = ({ searchQuery, lang = 'zh' }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [allLogs, setAllLogs] = useState<LogEntry[]>(loadAllLogs);

  // 每2秒刷新日志
  useEffect(() => {
    const timer = setInterval(() => {
      setAllLogs(loadAllLogs());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // 按日期筛选日志
  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dayLogs = allLogs.filter(log => {
    if (!log.timestamp) return false;
    return log.timestamp.startsWith(selectedDateStr);
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // 最新在前

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // i18n month and week names
  const getMonthNames = () => {
    if (lang === 'zh') return ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    if (lang === 'ja') return ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  };
  const getWeekHeaders = () => {
    if (lang === 'zh') return ['日', '一', '二', '三', '四', '五', '六'];
    if (lang === 'ja') return ['日', '月', '火', '水', '木', '金', '土'];
    if (lang === 'ko') return ['일', '월', '화', '수', '목', '금', '토'];
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  };
  const monthNames = getMonthNames();
  const weekHeaders = getWeekHeaders();

  // 检查某天是否有日志
  const hasLogsOnDay = (day: number): boolean => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allLogs.some(log => log.timestamp?.startsWith(dateStr));
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(currentYear - 1); setCurrentMonth(11); }
    else { setCurrentMonth(currentMonth - 1); }
    setSelectedDay(1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(currentYear + 1); setCurrentMonth(0); }
    else { setCurrentMonth(currentMonth + 1); }
    setSelectedDay(1);
  };

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const filteredLogs = searchQuery
    ? dayLogs.filter(l => l.taskName.includes(searchQuery) || l.message.includes(searchQuery))
    : dayLogs;

  const extColorMap: Record<string, string> = {
    '.app': '#42A5F5', '.bat': '#FF9800', '.exe': '#8BC34A', '.sh': '#FF9800',
  };

  // i18n labels
  const recordsLabel = t('logRecords', lang);
  const noLogsLabel = t('noLogsToday', lang);
  const yearLabel = lang === 'zh' || lang === 'ja' ? '年' : '/';
  const monthLabel = lang === 'zh' || lang === 'ja' ? '月' : '/';
  const dayLabel = lang === 'zh' || lang === 'ja' ? '日' : '';

  const formatDateTitle = () => {
    if (lang === 'zh' || lang === 'ja') return `${currentYear}${yearLabel}${currentMonth + 1}${monthLabel}${selectedDay}${dayLabel}`;
    return `${currentYear}/${currentMonth + 1}/${selectedDay}`;
  };
  const formatMonthNav = () => {
    if (lang === 'zh' || lang === 'ja') return `${currentYear}${yearLabel}${currentMonth + 1}${monthLabel}`;
    return `${monthNames[currentMonth]} ${currentYear}`;
  };

  return (
    <div className="log-page-v2">
      {/* Left: Calendar */}
      <div className="log-calendar">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>← {monthNames[currentMonth === 0 ? 11 : currentMonth - 1]}</button>
          <span className="cal-current-month">{formatMonthNav()}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>{monthNames[currentMonth === 11 ? 0 : currentMonth + 1]} →</button>
        </div>
        <div className="calendar-grid">
          {weekHeaders.map(h => (
            <div key={h} className="cal-weekday">{h}</div>
          ))}
          {calendarDays.map((day, i) => (
            <div
              key={i}
              className={`cal-day ${day === null ? 'empty' : ''} ${day === selectedDay ? 'selected' : ''} ${day !== null && isToday(day) ? 'today' : ''}`}
              onClick={() => day !== null && setSelectedDay(day)}
            >
              {day}
              {day !== null && hasLogsOnDay(day) && <span className="cal-dot"></span>}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Timeline */}
      <div className="log-timeline-panel">
        <h3 className="timeline-date-title">
          {formatDateTitle()} · {filteredLogs.length}{recordsLabel}
        </h3>
        {filteredLogs.length === 0 ? (
          <div className="timeline-empty">
            <p>{noLogsLabel}</p>
          </div>
        ) : (
          <div className="timeline-list">
            {filteredLogs.map((log, index) => (
              <div key={log.id || index} className="timeline-item">
                <div className="timeline-dot-line">
                  <div className={`timeline-dot ${log.level === 'error' ? 'dot-error' : log.level === 'success' ? 'dot-success' : ''}`}></div>
                  {index < filteredLogs.length - 1 && <div className="timeline-line"></div>}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    {log.icon && log.icon.startsWith('data:image') ? (
                      <img src={log.icon} alt={log.taskName} className="task-real-icon" style={{ width: 24, height: 24, marginRight: 8 }} />
                    ) : (
                      <span className="file-ext-badge" style={{ backgroundColor: extColorMap[log.fileExt || '.exe'] || '#8BC34A', width: 24, height: 24, fontSize: 9 }}>
                        {log.fileExt || '.exe'}
                      </span>
                    )}
                    <span className="timeline-task-name">{log.taskName}</span>
                    <span className="timeline-timestamp">{log.timestamp?.split(' ')[1] || ''}</span>
                  </div>
                  <div className="timeline-details">
                    <span className="timeline-task-type">{log.taskType}</span>
                    <span className="timeline-time-type">{log.timeType}</span>
                    <span className="timeline-exec-time">{log.executeTime}</span>
                    <span className={`status-tag ${log.statusText?.includes('失败') || log.statusText?.includes('error') || log.statusText?.includes('Error') ? 'error' : 'success'}`}>
                      {log.statusText}
                    </span>
                  </div>
                  {log.message && <div className="timeline-message">{log.message}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogPage;
