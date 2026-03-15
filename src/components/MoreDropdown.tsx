import React, { useEffect, useRef, useState } from 'react';

interface MoreDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onDelete: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const MoreDropdown: React.FC<MoreDropdownProps> = ({ isOpen, onClose, onExport, onDelete }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [openUp, setOpenUp] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Check if dropdown would overflow viewport bottom
  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      if (rect.bottom > viewportH - 10) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`more-dropdown ${openUp ? 'open-up' : ''}`} ref={ref}>
      <button className="dropdown-item" onClick={() => { onExport(); onClose(); }}>导出配置</button>
      <button className="dropdown-item danger" onClick={() => { onDelete(); onClose(); }}>删除</button>
    </div>
  );
};

export default MoreDropdown;
