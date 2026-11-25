import React, { useState } from 'react';
import { X, Copy, Check, MapPin, Navigation, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function MapModal({ mapModal, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!mapModal) return null;

  const cleanCoords = mapModal.coords.replace(/\s+/g, '');
  const parts = cleanCoords.split(',');
  const lat = parts.at(0) || '16.540601';
  const lng = parts.at(1) || '107.560710';

  // Dùng phép cộng chuỗi + truyền thống để không bao giờ bị lỗi mất ký tự
  const domain = 'https://www.' + 'google.com';
  const path = '/maps' + '?q=';
  const googleMapsLink = domain + path + lat + ',' + lng;

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCoords);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-bg" style={{ zIndex: 60 }}>
      <div className="modal" style={{ maxWidth: '460px' }}>
        <div className="modal-head">
          <h3 style={{ margin: 0, color: '#78350f', fontSize: '17px' }}>{mapModal.title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Khung thông tin tọa độ và mã QR vẽ trực tiếp */}
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '18px',
            textAlign: 'center',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#92400e', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
            <MapPin size={18} color="#dc2626" />
            <span>Tọa độ định vị GPS</span>
          </div>

          <div style={{ fontSize: '13px', color: '#78716c', marginTop: '8px' }}>
            Làng Phú Ngạn, xã Quảng Thành (nay là TDP Tây Phú, phường Hóa Châu, TP.Huế)
          </div>

          {/* Vẽ mã QR trực tiếp bằng code (Chạy cả khi mất mạng) */}
          <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', display: 'inline-block', border: '1px solid #e2e8f0' }}>
            <QRCodeCanvas value={googleMapsLink} size={150} />
          </div>

          <div style={{ fontSize: '12px', color: '#78716c', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <QrCode size={14} />
            <span>Dùng Camera điện thoại quét mã QR trên để dẫn đường ngay</span>
          </div>
        </div>

        {/* Hàng nút thao tác chuẩn xác */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            <Navigation size={18} />
            <span>Mở Google Maps chỉ đường</span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            <span>{copied ? 'Đã sao chép tọa độ GPS!' : 'Sao chép tọa độ GPS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
