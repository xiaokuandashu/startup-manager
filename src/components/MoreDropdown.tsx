import React, { useEffect, useRef } from 'react';

interface MoreDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onDelete: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const MoreDropdown: React.FC<MoreDropdownProps> = ({ isOpen, onClose, onExport, onDelete }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="more-dropdown" ref={ref}>
      <button className="dropdown-item" onClick={() => { onExport(); onClose(); }}>导出配置</button>
      <button className="dropdown-item danger" onClick={() => { onDelete(); onClose(); }}>删除</button>
    </div>
  );
};

export default MoreDropdown;
