import React from 'react';

interface UserInfo {
  id: string;
  email: string;
  vipStatus: string;
  vipExpireDate?: string;
}

interface UserDropdownProps {
  onSettings: () => void;
  onLogin: () => void;
  user: UserInfo | null;
  onLogout: () => void;
  avatarSrc?: string;
  onChangeAvatar?: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ onSettings, onLogin, user, onLogout, avatarSrc, onChangeAvatar }) => {
  return (
    <div className="user-dropdown">
      <div className="user-dropdown-header">
        <div className="user-dropdown-avatar-wrapper" onClick={onChangeAvatar} title="点击更换头像" style={{ cursor: 'pointer' }}>
          <img src={avatarSrc || '/icon/icon_touxiangmoren.svg'} alt="avatar" width="50" height="50" style={{ borderRadius: '50%', objectFit: 'cover' }} />
          <div className="avatar-change-hint">更换</div>
        </div>
        <span className="user-dropdown-name">{user ? user.email.replace(/^(.{3}).*(@.*)$/, '$1****$2') : '请登录'}</span>
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
            <span className="user-status-tag">未登录</span>
            <button className="user-dropdown-link" onClick={onSettings}>设置</button>
          </>
        )}
      </div>
      {!user && (
        <div className="user-dropdown-footer">
          <button className="btn-login-orange" onClick={onLogin}>登录</button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
