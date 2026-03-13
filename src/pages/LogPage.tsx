import React, { useState } from 'react';
import { LogEntry } from '../types';

interface LogPageProps {
  searchQuery: string;
}

const LogPage: React.FC<LogPageProps> = ({ searchQuery }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // Demo log data for selected dates
  const getDemoLogs = (_day: number): LogEntry[] => {
    return [];
  };

  const logs = getDemoLogs(selectedDay);

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const weekHeaders = ['日', '一', '二', '三', '四', '五', '六'];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(1);
  };

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const filteredLogs = searchQuery
    ? logs.filter(l => l.taskName.includes(searchQuery))
    : logs;

  const extColorMap: Record<string, string> = {
    '.app': '#42A5F5',
    '.bat': '#FF9800',
    '.exe': '#8BC34A',
    '.sh': '#FF9800',
  };

  return (
    <div className="log-page-v2">
      {/* Left: Calendar */}
      <div className="log-calendar">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>{monthNames[currentMonth === 0 ? 11 : currentMonth - 1].replace('月', '')}月</button>
          <button className="cal-nav-btn" onClick={nextMonth}>{currentMonth + 1}月 →</button>
          <span className="cal-current-month">{currentMonth + 1}月</span>
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
            </div>
          ))}
        </div>
      </div>

      {/* Right: Timeline */}
      <div className="log-timeline-panel">
        <h3 className="timeline-date-title">
          {currentMonth + 1}月{selectedDay}日
        </h3>
        {filteredLogs.length === 0 ? (
          <div className="timeline-empty">
            <p>当日无日志记录</p>
          </div>
        ) : (
          <div className="timeline-list">
            {filteredLogs.map((log, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-dot-line">
                  <div className="timeline-dot"></div>
                  {index < filteredLogs.length - 1 && <div className="timeline-line"></div>}
                </div>
                <div className="timeline-content">
                  <span className="file-ext-badge" style={{ backgroundColor: extColorMap[log.fileExt || '.exe'] || '#8BC34A' }}>
                    {log.fileExt || '.exe'}
                  </span>
                  <span className="timeline-task-name">{log.taskName}</span>
                  <span className="timeline-task-type">{log.taskType}</span>
                  <span className="timeline-time-type">{log.timeType}</span>
                  <span className="timeline-exec-time">{log.executeTime}</span>
                  <span className={`status-tag ${log.statusText.includes('失败') ? 'error' : 'success'}`}>
                    {log.statusText}
                  </span>
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
