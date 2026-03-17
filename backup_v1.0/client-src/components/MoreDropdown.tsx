import React, { useEffect, useRef, useState } from 'react';
import { t, Language } from '../i18n';

interface MoreDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onDelete: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  lang?: Language;
}

const MoreDropdown: React.FC<MoreDropdownProps> = ({ isOpen, onClose, onExport, onDelete, lang = 'zh' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Position the dropdown using fixed positioning relative to parent
  useEffect(() => {
    if (isOpen && ref.current) {
      const parent = ref.current.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const dropdownH = 80; // approx height of dropdown
        const viewportH = window.innerHeight;
        const spaceBelow = viewportH - rect.bottom;

        if (spaceBelow < dropdownH) {
          // Open upward
          setStyle({
            position: 'fixed',
            top: rect.top - dropdownH,
            right: window.innerWidth - rect.right,
            left: 'auto',
          });
        } else {
          // Open downward
          setStyle({
            position: 'fixed',
            top: rect.bottom,
            right: window.innerWidth - rect.right,
            left: 'auto',
          });
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="more-dropdown" ref={ref} style={style}>
      <button className="dropdown-item" onClick={() => { onExport(); onClose(); }}>{t('exportConfig', lang)}</button>
      <button className="dropdown-item danger" onClick={() => { onDelete(); onClose(); }}>{t('delete', lang)}</button>
    </div>
  );
};

export default MoreDropdown;
