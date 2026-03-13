import React from 'react';

interface UserInfo {
  id: string;
  phone: string;
  vipStatus: string;
  vipExpireDate?: string;
}

interface UserDropdownProps {
  onSettings: () => void;
  onLogin: () => void;
  user: UserInfo | null;
  onLogout: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ onSettings, onLogin, user, onLogout }) => {
  return (
    <div className="user-dropdown">
      <div className="user-dropdown-header">
        <img src="/icon/icon_touxiangmoren.svg" alt="avatar" width="50" height="50" style={{ borderRadius: '50%' }} />
        <span className="user-dropdown-name">{user ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '请登陆'}</span>
      </div>
      <div className="user-dropdown-body">
        {user ? (
          <>
            <span className="user-status-tag">
              {user.vipStatus === 'active' ? `会员用户 · 到期 ${user.vipExpireDate || ''}` : '普通用户'}
            </span>
            <button className="user-dropdown-link" onClick={onSettings}>设置</button>
            <button className="user-dropdown-link" onClick={onLogout} style={{ color: '#EF4444' }}>退出登录</button>
          </>
        ) : (
          <>
            <span className="user-status-tag">未登陆</span>
            <button className="user-dropdown-link" onClick={onSettings}>设置</button>
          </>
        )}
      </div>
      {!user && (
        <div className="user-dropdown-footer">
          <button className="btn-login-orange" onClick={onLogin}>登陆</button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
