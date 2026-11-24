import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit3, Trash2 } from 'lucide-react';

export default function NewsModals({
  selectedNews,
  onCloseSelectedNews,
  onSaveNews,
  onDeleteNews,
  showAddNews,
  onCloseAddNews,
  readOnly = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    id: null,
    date: '',
    title: '',
    image: '',
    summary: '',
    content: ''
  });

  useEffect(() => {
    if (selectedNews) {
      setIsEditing(false);
      setForm({
        id: selectedNews.id,
        date: selectedNews.date || '',
        title: selectedNews.title || '',
        image: selectedNews.image || '',
        summary: selectedNews.summary || '',
        content: selectedNews.content || selectedNews.summary || ''
      });
    }
  }, [selectedNews]);

  useEffect(() => {
    if (showAddNews) {
      setIsEditing(false);
      setForm({
        id: null,
        date: 'Năm Bính Ngọ 2026',
        title: '',
        image: '',
        summary: '',
        content: ''
      });
    }
  }, [showAddNews]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const finalContent = form.content.trim() || form.summary.trim();
    const finalSummary =
      form.summary.trim() ||
      (finalContent.length > 140 ? `${finalContent.slice(0, 140)}...` : finalContent);

    onSaveNews({
      ...form,
      id: form.id || Date.now(),
      summary: finalSummary,
      content: finalContent
    });

    setIsEditing(false);
    if (showAddNews) onCloseAddNews();
  };

  return (
    <>
      {/* 1. CỬA SỔ ĐỌC BÀI VIẾT CHI TIẾT & SỬA TIN */}
      {selectedNews && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-head">
              <h3 style={{ margin: 0, color: '#7c1d1d' }}>
                {isEditing ? 'Chỉnh Sửa Bài Viết' : 'Chi Tiết Tin Tức & Sự Kiện'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isEditing && !readOnly && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #f59e0b',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={14} /> Sửa bài viết
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCloseSelectedNews}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="form">
                <label>
                  Tiêu đề bài viết *
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>

                <div className="form-row">
                  <label>
                    Thời gian / Nhãn sự kiện
                    <input
                      placeholder="VD: Ngày 18-19 tháng Giêng ÂL"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </label>
                  <label>
                    Đường dẫn ảnh minh họa (nếu có)
                    <input
                      placeholder="/images/le-chap-ma.jpg"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                    />
                  </label>
                </div>

                <label>
                  Tóm tắt ngắn (hiện trên thẻ Trang chủ)
                  <textarea
                    rows="2"
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  />
                </label>

                <label>
                  Nội dung bài viết đầy đủ *
                  <textarea
                    required
                    rows="6"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                  />
                </label>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    Lưu Bài Viết
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteNews(selectedNews.id)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '4px 12px',
                    borderRadius: '99px',
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '10px'
                  }}
                >
                  <Calendar size={14} /> {selectedNews.date}
                </div>

                <h2 style={{ margin: '0 0 14px 0', color: '#7c1d1d', fontSize: '20px', lineHeight: '1.4' }}>
                  {selectedNews.title}
                </h2>

                {selectedNews.image && (
                  <img
                    src={selectedNews.image}
                    alt={selectedNews.title}
                    style={{
                      width: '100%',
                      maxHeight: '280px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      border: '1px solid #e5d7be'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}

                <div
                  style={{
                    fontSize: '15px',
                    color: '#292524',
                    lineHeight: '1.75',
                    whiteSpace: 'pre-line',
                    backgroundColor: '#faf6f0',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e5d7be'
                  }}
                >
                  {selectedNews.content || selectedNews.summary}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CỬA SỔ ĐĂNG BÀI VIẾT MỚI */}
      {!readOnly && showAddNews && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-head">
              <h3 style={{ margin: 0, color: '#7c1d1d' }}>Đăng Tin Tức / Thông Báo Dòng Họ</h3>
              <button
                type="button"
                onClick={onCloseAddNews}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <label>
                Tiêu đề bài viết *
                <input
                  required
                  placeholder="VD: Thông báo Lễ Chánh kỵ Ngài Thủy Tổ năm 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label>
                  Thời gian / Nhãn sự kiện
                  <input
                    placeholder="VD: Ngày 12-11 Âm lịch"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label>
                  Đường dẫn ảnh minh họa (nếu có)
                  <input
                    placeholder="/images/tu-duong.jpg"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Tóm tắt ngắn (nếu để trống sẽ tự trích đoạn đầu)
                <textarea
                  rows="2"
                  placeholder="Nhập 1-2 câu giới thiệu ngắn gọn..."
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </label>

              <label>
                Nội dung bài viết đầy đủ *
                <textarea
                  required
                  rows="6"
                  placeholder="Nhập chi tiết thông báo, chương trình buổi lễ hoặc danh sách đóng góp công đức..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </label>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
                Đăng Lên Trang Chủ
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
