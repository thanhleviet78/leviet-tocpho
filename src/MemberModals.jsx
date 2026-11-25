import React, { useState, useEffect } from 'react';
import { X, MapPin, Edit3, Plus, Trash2 } from 'lucide-react';

const GENERATION_LIST = Array.from({ length: 20 }, (_, i) => i + 1);

const isGps = (value) => typeof value === 'string' && /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(value);
const normalizeGraveRecord = (record) => {
  if (!record) return record;
  const oldLocation = record.graveLocation || '';
  const oldCoords = record.graveCoords || '';
  if (isGps(oldLocation)) return { ...record, graveLocation: oldCoords && !isGps(oldCoords) ? oldCoords : '', graveCoords: oldLocation };
  if (isGps(oldCoords)) return { ...record, graveLocation: oldLocation, graveCoords: oldCoords };
  return { ...record, graveLocation: oldLocation, graveCoords: '' };
};

export const normalizeSpouses = (member) => {
  if (!member) return Array.of();
  if (Array.isArray(member.spouses)) return member.spouses;
  if (member.spouse && member.spouse.trim() !== '') {
    return Array.of({ role: 'Vợ chánh', name: member.spouse, birthYear: '', hometown: '', deathDate: '', graveLocation: '', graveCoords: '' });
  }
  return Array.of();
};

export default function MemberModals({
  members,
  selected,
  onCloseSelected,
  onSaveEdit,
  onDeleteMember,
  showAdd,
  onCloseAdd,
  onAddMember,
  onOpenMap,
  readOnly = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const emptySpouse = { role: 'Vợ chánh', name: '', birthYear: '', hometown: '', deathDate: '', graveLocation: '', graveCoords: '' };

  const [form, setForm] = useState({
    name: '', gender: 'Nam', generation: 3, childOrder: 1, title: '', birthYear: '',
    deathDate: 'Còn sống', spouses: Array.of({ ...emptySpouse }), avatar: '',
    address: 'Làng Phú Ngạn, xã Quảng Thành (TDP Tây Phú, phường Hóa Châu, TP.Huế)',
    graveLocation: '', graveCoords: '', graveNote: '', parentId: 1, motherName: '', bio: ''
  });

  useEffect(() => {
    setIsEditing(false);
    setEditForm(null);
  }, [selected]);

    const cleanPlaceholder = (val) => (!val || val === 'Chưa rõ' || val === 'Chưa cập nhật' ? '' : val);

  const handleStartEdit = () => {
    if (readOnly) return;
    const currentSpouses = normalizeSpouses(selected).map((sp) => ({
      ...normalizeGraveRecord(sp),
      birthYear: cleanPlaceholder(sp.birthYear),
      hometown: cleanPlaceholder(sp.hometown),
      deathDate: cleanPlaceholder(sp.deathDate),
      graveLocation: cleanPlaceholder(sp.graveLocation),
      graveCoords: cleanPlaceholder(sp.graveCoords)
    }));

    setEditForm({
      ...normalizeGraveRecord(selected),
      childOrder: selected.childOrder ?? '',
      motherName: cleanPlaceholder(selected.motherName),
      birthYear: cleanPlaceholder(selected.birthYear),
      deathDate: cleanPlaceholder(selected.deathDate),
      address: cleanPlaceholder(selected.address),
      graveNote: cleanPlaceholder(selected.graveNote),
      bio: cleanPlaceholder(selected.bio),
      spouses: currentSpouses.length > 0 ? currentSpouses : Array.of({ ...emptySpouse })
    });
    setIsEditing(true);
  };

  const handleEditAddSpouse = () => {
    const order = editForm.spouses.length + 1;
    setEditForm({
      ...editForm,
      spouses: editForm.spouses.concat({ role: `Vợ thứ ${order}`, name: '', birthYear: '', hometown: '', deathDate: '', graveLocation: '', graveCoords: '' })
    });
  };

  const handleEditUpdateSpouse = (idx, field, val) => {
    const updated = editForm.spouses.map((sp, i) => (i === idx ? { ...sp, [field]: val } : sp));
    setEditForm({ ...editForm, spouses: updated });
  };

  const handleEditRemoveSpouse = (idx) => {
    setEditForm({ ...editForm, spouses: editForm.spouses.filter((_, i) => i !== idx) });
  };

  const submitEdit = (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    const cleanSpouses = editForm.spouses.filter((sp) => sp.name.trim() !== '');
    const isUnnamed = editForm.name.toLowerCase().includes('vô danh');
        onSaveEdit({
      ...editForm,
      birthYear: editForm.birthYear.trim() || 'Chưa rõ',
      deathDate: editForm.deathDate.trim() || 'Chưa rõ',
      spouses: cleanSpouses,
      childOrder: isUnnamed || editForm.childOrder === '' ? null : Number(editForm.childOrder),
      generation: Number(editForm.generation),
      parentId: editForm.parentId === '' || editForm.parentId === null ? null : Number(editForm.parentId)
    });
    setIsEditing(false);
  };

  const handleAddSpouse = () => {
    const order = form.spouses.length + 1;
    setForm({
      ...form,
      spouses: form.spouses.concat({ role: `Vợ thứ ${order}`, name: '', birthYear: '', hometown: '', deathDate: '', graveLocation: '', graveCoords: '' })
    });
  };

  const handleUpdateSpouse = (idx, field, val) => {
    const updated = form.spouses.map((sp, i) => (i === idx ? { ...sp, [field]: val } : sp));
    setForm({ ...form, spouses: updated });
  };

  const handleRemoveSpouse = (idx) => {
    setForm({ ...form, spouses: form.spouses.filter((_, i) => i !== idx) });
  };

  const submitAdd = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const cleanSpouses = form.spouses.filter((sp) => sp.name.trim() !== '');
    const isUnnamed = form.name.toLowerCase().includes('vô danh');
    onAddMember({
      ...form,
      spouses: cleanSpouses,
      id: Date.now(),
      parentId: Number(form.parentId),
      childOrder: isUnnamed || form.childOrder === '' ? null : Number(form.childOrder),
      generation: Number(form.generation)
    });
    setForm({
      name: '', gender: 'Nam', generation: 3, childOrder: 1, title: '', birthYear: '',
      deathDate: 'Còn sống', spouses: Array.of({ ...emptySpouse }), avatar: '',
      address: 'Làng Phú Ngạn, xã Quảng Thành (TDP Tây Phú, phường Hóa Châu, TP.Huế)',
      graveLocation: '', graveCoords: '', graveNote: '', parentId: 1, motherName: '', bio: ''
    });
  };

  const selectedChildren = selected ? members.filter((m) => m.parentId === selected.id).sort((a, b) => Number(a.childOrder ?? 999) - Number(b.childOrder ?? 999) || Number(a.id) - Number(b.id)) : Array.of();
  const editParentSpouses = editForm ? normalizeSpouses(members.find((m) => m.id === Number(editForm.parentId))) : Array.of();
  const addParentSpouses = normalizeSpouses(members.find((m) => m.id === Number(form.parentId)));
  return (
    <>
      {selected && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-head">
              <h3 style={{ margin: 0, color: '#7c1d1d' }}>{isEditing ? 'Chỉnh Sửa Thông Tin Gia Đình' : 'Hồ Sơ Thành Viên'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isEditing && !readOnly && (
                  <button type="button" onClick={handleStartEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    <Edit3 size={14} /> Sửa thông tin
                  </button>
                )}
                <button type="button" onClick={onCloseSelected} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
            </div>

            {isEditing && editForm ? (
              <form onSubmit={submitEdit} className="form">
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#7c1d1d' }}>1. Thông tin Chính (Chồng / Con cháu họ Lê Viết)</div>
                  <label>Họ và tên *<input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>

                  <div className="form-row">
                    <label>Thuộc đời thứ *
                      <select value={editForm.generation} onChange={(e) => setEditForm({ ...editForm, generation: e.target.value })}>
                        {GENERATION_LIST.map((g) => <option key={g} value={g}>Đời thứ {g}</option>)}
                      </select>
                    </label>
                    <label>Thứ tự con (Số)
                      <input type="number" value={editForm.childOrder} onChange={(e) => setEditForm({ ...editForm, childOrder: e.target.value })} />
                    </label>
                    <label>Giới tính
                      <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Chưa rõ">Chưa rõ</option>
                      </select>
                    </label>
                  </div>

                  <label>Con của ông (Cha)
                    <select value={editForm.parentId || ''} onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value, motherName: '' })}>
                      <option value="">-- Là Thủy Tổ (Không có đời trên) --</option>
                      {members.filter((m) => m.id !== editForm.id).map((m) => (
                        <option key={m.id} value={m.id}>[Đời {m.generation}] {m.name}</option>
                      ))}
                    </select>
                  </label>

                  {editForm.parentId && (
                    <label>Con của bà (Mẹ đẻ)
                      {editParentSpouses.length > 0 ? (
                        <select value={editForm.motherName || ''} onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}>
                          <option value="">-- Chọn mẹ đẻ --</option>
                          {editParentSpouses.map((sp, i) => (
                            <option key={i} value={sp.name}>{sp.role ? `${sp.role}: ` : ''}{sp.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input value={editForm.motherName || ''} onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })} />
                      )}
                    </label>
                  )}

                                    <label>Vai vế / Thứ bậc<input placeholder="VD: Con trai đầu, Con gái thứ 2..." value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></label>
                  <div className="form-row">
                    <label>Năm sinh<input placeholder="VD: 1920 hoặc để trống" value={editForm.birthYear} onChange={(e) => setEditForm({ ...editForm, birthYear: e.target.value })} /></label>
                    <label>Ngày chánh kỵ (giỗ)<input placeholder="VD: 12-11 Âm lịch hoặc Còn sống" value={editForm.deathDate} onChange={(e) => setEditForm({ ...editForm, deathDate: e.target.value })} /></label>
                  </div>
                  <label>Quê quán / Nơi ở<input placeholder="VD: Làng Phú Ngạn, xã Quảng Thành..." value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></label>
                  <label>Địa chỉ lăng mộ<input placeholder="Địa danh / địa chỉ mộ" value={editForm.graveLocation || ''} onChange={(e) => setEditForm({ ...editForm, graveLocation: e.target.value })} /></label>
                  <label>Tọa độ GPS lăng mộ<input placeholder="VD: 16.541200, 107.561500" value={editForm.graveCoords || ''} onChange={(e) => setEditForm({ ...editForm, graveCoords: e.target.value })} /></label>
                  <label>Ghi chú lăng mộ<input placeholder="VD: Mộ tại xứ Cồn Cờ song hồn..." value={editForm.graveNote} onChange={(e) => setEditForm({ ...editForm, graveNote: e.target.value })} /></label>
                </div>

                <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#78350f' }}>2. Thông tin Vợ chánh & Vợ thứ (hoặc Chồng)</span>
                    <button type="button" onClick={handleEditAddSpouse} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#b45309', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      <Plus size={14} /> Thêm Vợ thứ
                    </button>
                  </div>

                  {editForm.spouses.map((sp, idx) => (
                    <div key={idx} style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #fcd34d', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '12px', color: '#991b1b' }}>{idx === 0 ? 'Vợ chánh / Chồng chính' : `Vợ thứ ${idx + 1}`}</strong>
                        {idx > 0 && (
                          <button type="button" onClick={() => handleEditRemoveSpouse(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>
                            <Trash2 size={13} /> Xóa
                          </button>
                        )}
                      </div>
                      <div className="form-row">
                        <input placeholder="Vai vế" value={sp.role} onChange={(e) => handleEditUpdateSpouse(idx, 'role', e.target.value)} />
                        <input placeholder="Họ và tên vợ / chồng" value={sp.name} onChange={(e) => handleEditUpdateSpouse(idx, 'name', e.target.value)} />
                        <input placeholder="Năm sinh" value={sp.birthYear || ''} onChange={(e) => handleEditUpdateSpouse(idx, 'birthYear', e.target.value)} />
                      </div>
                      <input placeholder="Quê quán / Nơi ở của vợ" value={sp.hometown} onChange={(e) => handleEditUpdateSpouse(idx, 'hometown', e.target.value)} />
                      <div className="form-row">
                        <input placeholder="Ngày chánh kỵ" value={sp.deathDate} onChange={(e) => handleEditUpdateSpouse(idx, 'deathDate', e.target.value)} />
                        <input placeholder="Địa chỉ mộ phần vợ" value={sp.graveLocation || ''} onChange={(e) => handleEditUpdateSpouse(idx, 'graveLocation', e.target.value)} />
                        <input placeholder="Tọa độ GPS mộ phần vợ" value={sp.graveCoords || ''} onChange={(e) => handleEditUpdateSpouse(idx, 'graveCoords', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                <label>Đường dẫn ảnh chân dung<input value={editForm.avatar || ''} onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })} /></label>
                <label>Tiểu sử & Ghi chú chung<textarea rows="3" value={editForm.bio || ''} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} /></label>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Lưu Thay Đổi</button>
                  <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}>Hủy</button>
                  <button type="button" onClick={() => onDeleteMember(editForm.id)} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}>Xóa</button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef3c7', border: '2px solid #b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: '#b45309' }}>
                    {selected.name.toLowerCase().includes('vô danh') ? 'D' : (selected.childOrder || 1)}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{selected.name}</div>
                    <div style={{ fontSize: '13px', color: '#991b1b', fontWeight: '600', marginTop: '2px' }}>Đời thứ {selected.generation} • {selected.title}</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>Giới tính: {selected.gender}</div>
                  </div>
                </div>

                {selected.motherName && (
                  <p><strong>Thân mẫu (Mẹ đẻ):</strong> <span style={{ color: '#991b1b', fontWeight: '600' }}>{selected.motherName}</span></p>
                )}
                <p><strong>Năm sinh:</strong> {selected.birthYear || 'Chưa cập nhật'}</p>
                <p><strong>Ngày chánh kỵ (giỗ):</strong> {selected.deathDate}</p>
                <p><strong>Quê quán / Nơi ở:</strong> {selected.address || 'Chưa cập nhật'}</p>

                <div style={{ margin: '12px 0' }}>
                  <strong>Thông tin Phối ngẫu (Vợ / Chồng):</strong>
                  {normalizeSpouses(selected).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {normalizeSpouses(selected).map((sp, i) => (
                        <div key={i} style={{ padding: '10px 12px', backgroundColor: '#fffbeb', borderRadius: '8px', borderLeft: '3px solid #d97706', fontSize: '13px' }}>
                          <div style={{ fontWeight: '700', color: '#78350f' }}>{sp.role ? `${sp.role}: ` : ''}{sp.name}</div>
                          {sp.birthYear && <div style={{ color: '#475569', marginTop: '2px' }}>• Năm sinh: {sp.birthYear}</div>}
                          {sp.hometown && <div style={{ color: '#475569', marginTop: '2px' }}>• Quê quán / Xuất thân: {sp.hometown}</div>}
                          {sp.deathDate && <div style={{ color: '#b45309', marginTop: '2px' }}>• Ngày chánh kỵ: {sp.deathDate}</div>}
                          {sp.graveLocation && (
                            <div style={{ color: '#475569', marginTop: '4px' }}>• Địa chỉ lăng mộ: {sp.graveLocation}</div>
                          )}
                          {sp.graveCoords && (
                            <a href={`https://www.google.com/maps?q=${encodeURIComponent(sp.graveCoords.trim())}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', marginTop: '6px', backgroundColor: '#059669', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', textDecoration: 'none' }}>
                              Xem bản đồ mộ phần
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#64748b', marginLeft: '6px' }}>Chưa cập nhật</span>
                  )}
                </div>

                {(selected.graveLocation || selected.graveCoords) && (
                  <div style={{ margin: '12px 0', padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
                    {selected.graveNote && <div style={{ fontSize: '13px', fontWeight: '700', color: '#065f46', marginBottom: '4px' }}>{selected.graveNote}</div>}
                    {selected.graveLocation && <div style={{ fontSize: '13px', color: '#065f46', marginBottom: '6px' }}><strong>Địa chỉ lăng mộ:</strong> {selected.graveLocation}</div>}
                    {selected.graveCoords && <div style={{ fontSize: '13px', color: '#065f46', marginBottom: '8px' }}><strong>Tọa độ GPS:</strong> {selected.graveCoords}</div>}
                    {selected.graveCoords && <a href={`https://www.google.com/maps?q=${encodeURIComponent(selected.graveCoords.trim())}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#059669', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                      <MapPin size={15} />
                      <span>Xem bản đồ lăng mộ</span>
                    </a>}
                  </div>
                )}

                <p>
                  <strong>Số người con:</strong>{' '}
                  <span style={{ color: '#b45309', fontWeight: 'bold' }}>
                    {selectedChildren.filter((c) => !c.name.toLowerCase().includes('vô danh')).length} người con
                  </span>
                </p>
                {selectedChildren.length > 0 && (
                  <ul className="children-box">
                    {selectedChildren.map((c) => (
                      <li key={c.id}>
                        {c.name.toLowerCase().includes('vô danh') ? (
                          <strong style={{ color: '#64748b' }}>[D] </strong>
                        ) : (
                          <span>{c.childOrder || ''}. </span>
                        )}
                        <strong>{c.name}</strong> ({c.title})
                        {c.motherName && (
                          <span style={{ color: '#991b1b', fontSize: '12px' }}> — Mẹ: {c.motherName}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <p><strong>Tiểu sử & Ghi chú:</strong></p>
                <div className="bio-box">{selected.bio || 'Chưa có thông tin.'}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {!readOnly && showAdd && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-head">
              <h3 style={{ margin: 0, color: '#7c1d1d' }}>Thêm Thành Viên & Gia Đình</h3>
              <button type="button" onClick={onCloseAdd} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={submitAdd} className="form">
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#7c1d1d' }}>1. Thông tin Chính (Chồng / Con cháu họ Lê Viết)</div>
                <label>Họ và tên *<input required placeholder="Ví dụ: Lê Viết An (hoặc Lê Vô danh)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>

                <div className="form-row">
                  <label>Thuộc đời thứ *
                    <select value={form.generation} onChange={(e) => setForm({ ...form, generation: e.target.value })}>
                      {GENERATION_LIST.map((g) => <option key={g} value={g}>Đời thứ {g}</option>)}
                    </select>
                  </label>
                  <label>Thứ tự con (Số)
                    <input type="number" value={form.childOrder} onChange={(e) => setForm({ ...form, childOrder: e.target.value })} />
                  </label>
                  <label>Giới tính
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Chưa rõ">Chưa rõ</option>
                    </select>
                  </label>
                </div>

                <label>Con của ông (Cha) *
                  <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value, motherName: '' })}>
                    {members.map((m) => <option key={m.id} value={m.id}>[Đời {m.generation}] {m.name}</option>)}
                  </select>
                </label>

                <label>Con của bà (Mẹ đẻ)
                  {addParentSpouses.length > 0 ? (
                    <select value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })}>
                      <option value="">-- Chọn mẹ đẻ --</option>
                      {addParentSpouses.map((sp, i) => (
                        <option key={i} value={sp.name}>{sp.role ? `${sp.role}: ` : ''}{sp.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} />
                  )}
                </label>

                <label>Vai vế / Thứ bậc<input placeholder="Ví dụ: Con trai đầu..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <div className="form-row">
                  <label>Năm sinh<input value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} /></label>
                  <label>Ngày chánh kỵ (giỗ)<input value={form.deathDate} onChange={(e) => setForm({ ...form, deathDate: e.target.value })} /></label>
                </div>
                <label>Quê quán / Nơi ở<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                <label>Địa chỉ lăng mộ<input placeholder="Địa danh / địa chỉ mộ" value={form.graveLocation} onChange={(e) => setForm({ ...form, graveLocation: e.target.value })} /></label>
                <label>Tọa độ GPS lăng mộ<input placeholder="VD: 16.541200, 107.561500" value={form.graveCoords} onChange={(e) => setForm({ ...form, graveCoords: e.target.value })} /></label>
                <label>Ghi chú lăng mộ<input value={form.graveNote} onChange={(e) => setForm({ ...form, graveNote: e.target.value })} /></label>
              </div>

              <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#78350f' }}>2. Thông tin Vợ chánh & Vợ thứ (hoặc Chồng)</span>
                  <button type="button" onClick={handleAddSpouse} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#b45309', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    <Plus size={14} /> Thêm Vợ thứ
                  </button>
                </div>

                {form.spouses.map((sp, idx) => (
                  <div key={idx} style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #fcd34d', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '12px', color: '#991b1b' }}>{idx === 0 ? 'Vợ chánh / Chồng chính' : `Vợ thứ ${idx + 1}`}</strong>
                      {idx > 0 && (
                        <button type="button" onClick={() => handleRemoveSpouse(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>
                          <Trash2 size={13} /> Xóa
                        </button>
                      )}
                    </div>
                    <div className="form-row">
                      <input placeholder="Vai vế" value={sp.role} onChange={(e) => handleUpdateSpouse(idx, 'role', e.target.value)} />
                      <input placeholder="Họ và tên vợ / chồng" value={sp.name} onChange={(e) => handleUpdateSpouse(idx, 'name', e.target.value)} />
                      <input placeholder="Năm sinh" value={sp.birthYear || ''} onChange={(e) => handleUpdateSpouse(idx, 'birthYear', e.target.value)} />
                    </div>
                    <input placeholder="Quê quán / Nơi ở của vợ" value={sp.hometown} onChange={(e) => handleUpdateSpouse(idx, 'hometown', e.target.value)} />
                    <div className="form-row">
                      <input placeholder="Ngày chánh kỵ" value={sp.deathDate} onChange={(e) => handleUpdateSpouse(idx, 'deathDate', e.target.value)} />
                      <input placeholder="Địa chỉ mộ phần vợ" value={sp.graveLocation || ''} onChange={(e) => handleUpdateSpouse(idx, 'graveLocation', e.target.value)} />
                        <input placeholder="Tọa độ GPS mộ phần vợ" value={sp.graveCoords || ''} onChange={(e) => handleUpdateSpouse(idx, 'graveCoords', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>

              <label>Đường dẫn ảnh chân dung<input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} /></label>
              <label>Tiểu sử & Ghi chú chung<textarea rows="2" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>Lưu Vào Cây Gia Phả</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
