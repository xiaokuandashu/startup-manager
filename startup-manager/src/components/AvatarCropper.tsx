import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

interface AvatarCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImage: string) => void;
}

interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 裁剪图片辅助函数
const createCroppedImage = (imageSrc: string, pixelCrop: CroppedArea): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('Canvas not supported');
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, 200, 200
      );
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = imageSrc;
  });
};

const AvatarCropper: React.FC<AvatarCropperProps> = ({ isOpen, onClose, onSave }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea | null>(null);

  const onCropComplete = useCallback((_: CroppedArea, croppedPixels: CroppedArea) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        const cropped = await createCroppedImage(imageSrc, croppedAreaPixels);
        onSave(cropped);
        handleClose();
      } catch (e) {
        console.error('裁剪失败:', e);
      }
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content avatar-cropper-modal" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-cropper-header">
          <h3>更换头像</h3>
          <button className="modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {!imageSrc ? (
          <div className="avatar-select-area">
            <label className="avatar-file-label">
              <img src="/icon/icon_xiangce.svg" alt="选择" width="48" height="48" style={{ opacity: 0.5 }} />
              <span>点击选择图片</span>
              <span className="avatar-file-hint">支持 JPG、PNG 格式</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        ) : (
          <>
            <div className="avatar-crop-area">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="avatar-zoom-bar">
              <span>缩放</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="avatar-cropper-footer">
          <button className="btn-cancel" onClick={handleClose}>取消</button>
          <button
            className="btn-save"
            disabled={!imageSrc || !croppedAreaPixels}
            onClick={handleSave}
          >
            保存头像
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropper;
