import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Calendar, MapPin, ChevronRight, ChevronDown, ChevronsDown, ChevronsUp, Landmark, BookOpen, Download, Home, Users, PhoneCall, Newspaper, Images } from 'lucide-react';
import { INITIAL_MEMBERS, FAMILY_INFO, REVISION_HISTORY, ANNUAL_NEWS, CONTACT_INFO, TEMPLE_RENOVATIONS } from './data';
import MapModal from './MapModal';
import MemberModals, { normalizeSpouses } from './MemberModals';
import NewsModals from './NewsModals';
import { TEMPLE_GALLERY } from './gallery';
import './App.css';

const GENERATION_LIST = Array.from({ length: 20 }, (_, i) => i + 1);

const STORAGE_KEY = 'le-viet-gia-pha-v1';
// Chỉ máy quản lý chạy localhost mới được đọc/ghi dữ liệu riêng trong Local Storage.
// Website công khai luôn dùng dữ liệu đóng gói trong src/data.js của Deployment.
const IS_LOCAL_ADMIN = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isGps = (value) => typeof value === 'string' && /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(value);
const normalizeGraveRecord = (record) => {
  if (!record || typeof record !== 'object') return record;
  const oldLocation = record.graveLocation || '';
  const oldCoords = record.graveCoords || '';
  // Legacy schema stored GPS in graveLocation and place description in graveCoords.
  if (isGps(oldLocation)) {
    return { ...record, graveLocation: oldCoords && !isGps(oldCoords) ? oldCoords : '', graveCoords: oldLocation };
  }
  if (isGps(oldCoords)) return { ...record, graveLocation: oldLocation, graveCoords: oldCoords };
  return { ...record, graveLocation: oldLocation, graveCoords: '' };
};
const normalizeMemberGraves = (list) => (Array.isArray(list) ? list.map((m) => ({
  ...normalizeGraveRecord(m),
  spouses: Array.isArray(m.spouses) ? m.spouses.map(normalizeGraveRecord) : m.spouses
})) : list);
const normalizeSavedData = (saved) => saved && Array.isArray(saved.members) ? { ...saved, members: normalizeMemberGraves(saved.members) } : saved;

const readSavedData = () => {
  if (!IS_LOCAL_ADMIN) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSavedData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};


const validateMembers = (memberList) => {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(memberList) || memberList.length === 0) {
    return { errors: ['Danh sách thành viên trống hoặc không hợp lệ.'], warnings: [] };
  }

  const idCounts = new Map();
  memberList.forEach((member) => {
    const id = String(member?.id ?? '').trim();
    if (!id) errors.push(`Thành viên "${member?.name || '(chưa có tên)'}" thiếu mã ID.`);
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
    if (!String(member?.name ?? '').trim()) errors.push(`ID ${id || '(trống)'} thiếu tên.`);
    const generation = Number(member?.generation);
    if (!Number.isInteger(generation) || generation < 1) errors.push(`${member?.name || id}: đời không hợp lệ (${member?.generation ?? 'trống'}).`);
    if (member?.childOrder != null && member?.childOrder !== '' && (!Number.isInteger(Number(member.childOrder)) || Number(member.childOrder) < 1)) {
      errors.push(`${member?.name || id}: thứ tự con không hợp lệ (${member.childOrder}).`);
    }
  });
  idCounts.forEach((count, id) => {
    if (id && count > 1) errors.push(`Mã ID ${id} bị trùng (${count} lần).`);
  });

  const ids = new Set(memberList.map((member) => String(member?.id ?? '').trim()).filter(Boolean));
  memberList.forEach((member) => {
    const id = String(member?.id ?? '').trim();
    const parentId = member?.parentId;
    if (parentId != null && String(parentId).trim() !== '') {
      if (String(parentId) === id) errors.push(`${member.name || id} tự liên kết làm cha/mẹ của chính mình.`);
      else if (!ids.has(String(parentId))) errors.push(`${member.name || id} có mã cha/mẹ ${parentId} không tồn tại.`);
      else {
        const parent = memberList.find((candidate) => String(candidate?.id) === String(parentId));
        if (Number(member.generation) !== Number(parent?.generation) + 1) {
          warnings.push(`${member.name || id}: đời ${member.generation} không khớp với đời của người cha/mẹ.`);
        }
      }
    }
  });

  const parentMap = new Map(memberList.map((member) => [String(member?.id ?? ''), member?.parentId == null ? null : String(member.parentId)]));
  memberList.forEach((member) => {
    const startId = String(member?.id ?? '');
    const seen = new Set();
    let current = startId;
    while (current != null && current !== '') {
      if (seen.has(current)) {
        errors.push(`Phát hiện vòng liên kết cha/mẹ tại ID ${startId}.`);
        break;
      }
      seen.add(current);
      current = parentMap.get(current) ?? null;
    }
  });

  const childOrderGroups = new Map();
  memberList.forEach((member) => {
    if (member?.parentId == null || member?.childOrder == null) return;
    const key = `${member.parentId}:${member.childOrder}`;
    childOrderGroups.set(key, (childOrderGroups.get(key) || 0) + 1);
  });
  const duplicateChildOrders = [...childOrderGroups.entries()].filter(([, count]) => count > 1);
  if (duplicateChildOrders.length) warnings.push(`${duplicateChildOrders.length} nhóm có thứ tự con bị trùng; cần đối chiếu.`);

  const rootCount = memberList.filter((member) => member?.parentId == null || String(member.parentId).trim() === '').length;
  if (rootCount !== 1) warnings.push(`Có ${rootCount} thành viên không có cha/mẹ được liên kết (thường nên có 1 người gốc).`);

  const nameCounts = new Map();
  memberList.forEach((member) => {
    const name = String(member?.name ?? '').trim();
    if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  });
  const duplicateNames = [...nameCounts.entries()].filter(([, count]) => count > 1);
  if (duplicateNames.length) warnings.push(`${duplicateNames.length} tên trùng nhau; cần đối chiếu thủ công vì có thể là người khác nhau ở các nhánh/đời.`);

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
};

const GEN_COLORS = [
  '#991b1b', '#b45309', '#047857', '#1d4ed8',
  '#6d28d9', '#0f766e', '#be123c', '#4338ca'
];

const getGenColor = (gen) => GEN_COLORS[(Number(gen || 1) - 1) % GEN_COLORS.length];

// Component Cuốn thư hoa văn phân tách giữa các mục
function ScrollDivider({ title }) {
return (
<div className="scroll-divider">
<div className="scroll-line" />
<div className="scroll-badge">{title}</div>
<div className="scroll-line" />
</div>
);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('TRANG_CHU'); // Mặc định mở Trang chủ mỗi khi tải website
  const [savedData] = useState(readSavedData);
  const [members, setMembers] = useState(() => normalizeMemberGraves(savedData?.members ?? INITIAL_MEMBERS));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGen, setFilterGen] = useState('ALL');
  const [treeViewMode, setTreeViewMode] = useState('LIST');
  const [treeZoom, setTreeZoom] = useState(0.85);
  const [treeExpandedIds, setTreeExpandedIds] = useState(() =>
    normalizeMemberGraves(savedData?.members ?? INITIAL_MEMBERS).filter((m) => Number(m.generation) <= 3).map((m) => m.id)
  );
  const toggleTreeExpand = (id) => {
    setTreeExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mapModal, setMapModal] = useState(null);
  const [expandedIds, setExpandedIds] = useState(Array.of(1, 2, 4, 6));
  const [newsList, setNewsList] = useState(() => savedData?.newsList ?? ANNUAL_NEWS);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showAddNews, setShowAddNews] = useState(false);
  const [revisions, setRevisions] = useState(() => savedData?.revisions ?? REVISION_HISTORY);
  const [revisionModal, setRevisionModal] = useState(null); // null | { mode: 'ADD' | 'EDIT', data?: object }
  const [revForm, setRevForm] = useState({ id: null, date: '', author: '' });

  const openAddRevision = () => {
    setRevForm({ id: null, date: `Năm ${new Date().getFullYear()}`, author: '' });
    setRevisionModal({ mode: 'ADD' });
  };

  const openEditRevision = (item) => {
    setRevForm(item);
    setRevisionModal({ mode: 'EDIT', data: item });
  };

  const handleSaveRevision = (e) => {
    e.preventDefault();
    if (!revForm.date.trim() || !revForm.author.trim()) return;
    if (revisionModal && revisionModal.mode === 'EDIT') {
      setRevisions((prev) => prev.map((r) => (r.id === revForm.id ? revForm : r)));
    } else {
      setRevisions((prev) => [...prev, { ...revForm, id: Date.now() }]);
    }
    setRevisionModal(null);
  };

  const handleDeleteRevision = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lần phụng tu này không?')) {
      setRevisions((prev) => prev.filter((r) => r.id !== id));
      setRevisionModal(null);
    }
  };

  const [renovations, setRenovations] = useState(() => savedData?.renovations ?? TEMPLE_RENOVATIONS);

  useEffect(() => {
    if (!IS_LOCAL_ADMIN) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, newsList, revisions, renovations, savedAt: new Date().toISOString() }));
    } catch (error) {
      console.warn('Không thể lưu dữ liệu gia phả vào trình duyệt:', error);
    }
  }, [members, newsList, revisions, renovations]);
  const [renovationModal, setRenovationModal] = useState(null); // null | { mode: 'ADD' | 'EDIT', data?: object }
  const [renoForm, setRenoForm] = useState({ id: null, year: '', title: '', detail: '' });

  const openAddRenovation = () => {
    setRenoForm({ id: null, year: `Năm ${new Date().getFullYear()}`, title: '', detail: '' });
    setRenovationModal({ mode: 'ADD' });
  };

  const openEditRenovation = (item) => {
    setRenoForm(item);
    setRenovationModal({ mode: 'EDIT', data: item });
  };

  const handleSaveRenovation = (e) => {
    e.preventDefault();
    if (!renoForm.title.trim()) return;
    if (renovationModal && renovationModal.mode === 'EDIT') {
      setRenovations((prev) => prev.map((r) => (r.id === renoForm.id ? renoForm : r)));
    } else {
      setRenovations((prev) => [{ ...renoForm, id: Date.now() }, ...prev]);
    }
    setRenovationModal(null);
  };

  const handleDeleteRenovation = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đợt trùng tu này không?')) {
      setRenovations((prev) => prev.filter((r) => r.id !== id));
      setRenovationModal(null);
    }
  };

  const handleSaveNews = (item) => {
  const exists = newsList.some((n) => n.id === item.id);
    if (exists) {
      setNewsList(newsList.map((n) => (n.id === item.id ? item : n)));
      setSelectedNews(item);
    } else {
      setNewsList([item, ...newsList]);
      setShowAddNews(false);
    }
  };

  const handleDeleteNews = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này khỏi Trang chủ không?')) {
      setNewsList(newsList.filter((n) => n.id !== id));
      setSelectedNews(null);
    }
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : prev.concat(id)));
  };

  const expandAll = () => setExpandedIds(members.map((m) => m.id));
  const collapseAll = () => setExpandedIds(Array.of());
  const [matchIndex, setMatchIndex] = useState(0);

  // Hàm chuẩn hóa chữ thường và bỏ dấu tiếng Việt để tìm kiếm linh hoạt
  const normalizeText = (str) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();

  const searchResultGroups = (() => {
    const rawQuery = searchTerm.trim().toLocaleLowerCase();
    const normalizedQuery = normalizeText(searchTerm);
    if (!normalizedQuery) return { exact: [], accentVariants: [], extended: [], total: 0 };
    const exact = members.filter((m) => String(m.name || '').trim().toLocaleLowerCase() === rawQuery);
    const accentVariants = members.filter((m) => {
      const name = String(m.name || '').trim();
      return normalizeText(name) === normalizedQuery && name.toLocaleLowerCase() !== rawQuery;
    });
    const extended = members.filter((m) => {
      const normalizedName = normalizeText(m.name);
      return normalizedName.includes(normalizedQuery) && normalizedName !== normalizedQuery;
    });
    return { exact, accentVariants, extended, total: exact.length + accentVariants.length + extended.length };
  })();

  const handleJumpToSearch = (nextStep = false) => {
    const query = normalizeText(searchTerm);
    if (!query) {
      const inputEl = document.getElementById('member-search-input');
      if (inputEl) inputEl.focus();
      return;
    }

    // Lọc tất cả thành viên khớp từ khóa (không phân biệt hoa/thường)
    const matchedList = members.filter((m) => normalizeText(m.name).includes(query));
    if (matchedList.length === 0) {
      alert(`Không tìm thấy thành viên nào có tên "${searchTerm}".`);
      return;
    }

    // Mở rộng toàn bộ cây để đảm bảo thẻ kết quả luôn hiển thị trên màn hình
    setExpandedIds(members.map((m) => m.id));
    setTreeExpandedIds(members.map((m) => m.id));

    const targetIdx = nextStep ? (matchIndex + 1) % matchedList.length : 0;
    setMatchIndex(targetIdx);
    const targetMember = matchedList.at(targetIdx);

    // Đợi cây mở rộng xong rồi cuộn mượt mà tới đúng thẻ thành viên đó
    setTimeout(() => {
      const cardEl = document.getElementById(`member-card-${targetMember.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  const handleSaveEdit = (updatedMember) => {
    const parent = updatedMember.parentId == null || String(updatedMember.parentId).trim() === ''
      ? null
      : members.find((m) => String(m.id) === String(updatedMember.parentId));
    if (updatedMember.parentId != null && String(updatedMember.parentId).trim() !== '' && !parent) {
      alert('Không thể lưu: người cha/mẹ được chọn không tồn tại trong dữ liệu.');
      return;
    }
    if (parent && Number(updatedMember.generation) !== Number(parent.generation) + 1) {
      alert(`Không thể lưu: thành viên phải thuộc đời ${Number(parent.generation) + 1} theo liên kết cha/mẹ đang chọn.`);
      return;
    }
    const candidate = members.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    const candidateReport = validateMembers(candidate);
    const cycleOrSelfLink = candidateReport.errors.some((message) =>
      message.includes('vòng liên kết') || message.includes('tự liên kết')
    );
    if (cycleOrSelfLink) {
      alert('Không thể lưu: thay đổi này tạo liên kết cha/mẹ không hợp lệ.');
      return;
    }
    setMembers(candidate);
    setSelected(updatedMember);
  };

  const handleDeleteMember = (id) => {
    if (members.some((m) => m.parentId === id)) {
      alert('Không thể xóa thành viên này vì đang có danh sách con cháu bên dưới.');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi danh sách không?')) {
      setMembers(members.filter((m) => m.id !== id));
      setSelected(null);
    }
  };

  const handleAddMember = (newMember) => {
    if (members.some((m) => String(m.id) === String(newMember.id))) {
      alert('Không thể thêm: mã thành viên đã tồn tại.');
      return;
    }
    const parent = newMember.parentId == null ? null : members.find((m) => String(m.id) === String(newMember.parentId));
    if (newMember.parentId != null && !parent) {
      alert('Không thể thêm: không tìm thấy người cha/mẹ được chọn.');
      return;
    }
    if (parent && Number(newMember.generation) !== Number(parent.generation) + 1) {
      alert(`Không thể thêm: thành viên phải thuộc đời ${Number(parent.generation) + 1} theo liên kết cha/mẹ.`);
      return;
    }
    setMembers(members.concat(newMember));
    if (newMember.parentId != null && !expandedIds.includes(newMember.parentId)) {
      setExpandedIds(expandedIds.concat(newMember.parentId));
    }
    setShowAdd(false);
  };

  // Xuất module dữ liệu hoàn chỉnh để thay thế src/data.js trước khi Git Push.
  // Bao gồm dữ liệu đang quản lý trên localhost và các cấu hình tĩnh hiện tại.
  const handleExportWebsiteData = () => {
    const report = validateMembers(members);
    if (report.errors.length) {
      alert(`Chưa thể xuất dữ liệu website vì còn ${report.errors.length} lỗi cấu trúc.\n${report.errors.slice(0, 8).join('\n')}`);
      return;
    }
    const exports = [
      ['FAMILY_INFO', FAMILY_INFO],
      ['REVISION_HISTORY', revisions],
      ['TEMPLE_RENOVATIONS', renovations],
      ['ANNUAL_NEWS', newsList],
      ['CONTACT_INFO', CONTACT_INFO],
      ['INITIAL_MEMBERS', members]
    ];
    const moduleText = `// TỰ ĐỘNG XUẤT TỪ LOCAL ADMIN - ${new Date().toISOString()}\n// Dùng thay thế toàn bộ src/data.js, sau đó Git add/commit/push.\n\n` +
      exports.map(([name, value]) => `export const ${name} = ${JSON.stringify(value, null, 2)};`).join('\n\n') + '\n';
    const blob = new Blob([moduleText], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data.js`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    alert(`Đã xuất data.js với ${members.length} thành viên. Hãy chép file này đè lên src/data.js trong dự án trước khi Git Push.`);
  };

  const memorials = members.filter(
    (m) =>
      m.deathDate &&
      m.deathDate.toLowerCase() !== 'còn sống' &&
      m.deathDate.toLowerCase() !== 'chưa rõ' &&
      !m.deathDate.toLowerCase().includes('mất sớm')
  );

  const renderMemberCard = (m, subChildren, isExpanded) => {
    const hasChildren = subChildren.length > 0;
    const isMatched = searchTerm.trim() !== '' && normalizeText(m.name).includes(normalizeText(searchTerm));
    const memberSpouses = normalizeSpouses(m);
    const isUnnamed = m.name.toLowerCase().includes('vô danh');
    const genColor = getGenColor(m.generation);

    const validChildrenCount = subChildren.filter((c) => !c.name.toLowerCase().includes('vô danh')).length;

    return (
      <div
        id={`member-card-${m.id}`}
        onClick={() => setSelected(m)}
        style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
          padding: '8px 14px', borderRadius: '9px', height: 'auto',
          border: isMatched ? '2px solid #d97706' : '1px solid #e2e8f0',
          backgroundColor: isMatched ? '#fef3c7' : '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>
          {hasChildren && filterGen === 'ALL' ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(m.id, e)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                width: '52px', height: '28px', borderRadius: '6px',
                border: `1.5px solid ${genColor}`,
                backgroundColor: isExpanded ? genColor : '#ffffff',
                color: isExpanded ? '#ffffff' : genColor,
                fontSize: '11px', fontWeight: '800', cursor: 'pointer', flexShrink: 0
              }}
            >
              <span>Đ{m.generation}</span>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span
              style={{
                width: '52px', height: '28px', borderRadius: '6px',
                border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc',
                color: '#64748b', fontSize: '11px', fontWeight: '700',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}
            >
              Đ{m.generation}
            </span>
          )}

                    <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '28px' }}>
              {(() => {
                const isFemale = m.gender === 'Nữ';
                const circleBg = isUnnamed ? '#f1f5f9' : isFemale ? '#fce7f3' : '#fef3c7';
                const circleBorder = isUnnamed ? '#94a3b8' : isFemale ? '#ec4899' : '#f59e0b';
                const circleColor = isUnnamed ? '#475569' : isFemale ? '#9d174d' : '#92400e';

                if (m.avatar) {
                  return (
                    <img
                      src={m.avatar}
                      alt={m.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${circleBorder}`, flexShrink: 0 }}
                    />
                  );
                }

                return (
                  <span
                    title={isUnnamed ? 'Vô danh' : m.gender}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: circleBg,
                      border: `1.5px solid ${circleBorder}`,
                      color: circleColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '13px',
                      flexShrink: 0
                    }}
                  >
                    {isUnnamed ? 'D' : (m.childOrder || 1)}
                  </span>
                );
              })()}

              <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{m.name}</span>

            <span className="badge">
             {Number(m.generation) === 1 && m.title ? `${m.title} • ` : ''}
             Đời thứ {m.generation}
           </span>

              {(() => {
                const parentObj = m.parentId ? members.find((p) => p.id === m.parentId) : null;
                const fatherName = parentObj ? parentObj.name : '';
                const motherName = m.motherName || '';
                const parentsLabel = [fatherName, motherName].filter(Boolean).join(' - ');

                if (!parentsLabel) return null;

                return (
                  <span style={{ fontSize: '12px', backgroundColor: '#f8fafc', color: '#475569', padding: '2px 9px', borderRadius: '99px', border: '1px solid #cbd5e1', fontWeight: '500' }}>
                    Con của: <strong style={{ color: '#334155' }}>{parentsLabel}</strong>
                  </span>
                );
              })()}
            </div>

            {( (m.birthYear && m.birthYear !== 'Chưa rõ') || memberSpouses.length > 0 ) && (
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                {m.birthYear && m.birthYear !== 'Chưa rõ' && (
                  <span>
                    Sinh: {m.birthYear}
                    {memberSpouses.length > 0 ? ' • ' : ''}
                  </span>
                )}
                {memberSpouses.length > 0 && (
                  <span>
                    Phối ngẫu:{' '}
                    <strong>{memberSpouses.map((sp) => `${sp.name}${sp.role ? ` (${sp.role})` : ''}`).join(', ')}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

        </div>

        {validChildrenCount > 0 && (
          <span
            onClick={(e) => filterGen === 'ALL' && toggleExpand(m.id, e)}
            style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '99px', backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
          >
            {validChildrenCount} người con
          </span>
        )}
      </div>
    );
  };

  // Hàm vẽ Sơ đồ hình cây tóm tắt (Độc lập hoàn toàn với Danh sách chi tiết, chống lặp nhánh)
  const renderVisualTreeNode = (rootMember) => {
    const getChildren = (parentId) => {
      const rawChildren = members.filter((c) => Number(c.parentId) === Number(parentId));
      const uniqueMap = new Map();
      rawChildren.forEach((item) => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });
      return Array.from(uniqueMap.values()).sort((a, b) => (a.childOrder || 99) - (b.childOrder || 99));
    };

    const renderNodeCard = (member) => {
      const genNum = Number(member.generation);
      const isTopHorizontal = genNum <= 3;
      const isFemale = member.gender === 'Nữ';
      const isMatched = searchTerm.trim() !== '' && normalizeText(member.name).includes(normalizeText(searchTerm));

      const cleanName = member.name.replace(/\(.*?\)/g, '').trim();
      const displayTitle = genNum === 1 ? `${member.title || 'Ngài Thủy tổ'} - ${cleanName}` : cleanName;
      const verticalWords = displayTitle.split(/\s+/);

      return (
        <div
          id={`tree-node-${member.id}`}
          role="button"
          tabIndex={0}
          onClick={() => setSelected(member)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(member); } }}
          title={`${member.name} (Đời thứ ${member.generation}) - Bấm để xem chi tiết`}
          style={{
            backgroundColor: isMatched ? '#fef3c7' : genNum === 1 ? '#7c1d1d' : isFemale ? '#fff1f2' : '#ffffff',
            color: genNum === 1 ? '#fde68a' : '#0f172a',
            border: isMatched || genNum === 1 ? '2px solid #d97706' : isFemale ? '1.5px solid #f472b6' : '1.5px solid #991b1b',
            borderRadius: '5px',
            padding: isTopHorizontal ? '5px 10px' : '4px 2px',
            width: isTopHorizontal ? 'auto' : '30px',
            minWidth: isTopHorizontal ? '92px' : '30px',
            minHeight: isTopHorizontal ? 'auto' : '78px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isTopHorizontal ? 'center' : 'flex-start',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            position: 'relative',
            zIndex: 2
          }}
        >
          {isTopHorizontal ? (
            <>
              <div style={{ fontSize: '9px', fontWeight: '700', marginBottom: '2px', color: genNum === 1 ? '#fcd34d' : '#991b1b' }}>
                {genNum === 1 ? 'Đời thứ I' : `Đ${genNum} • ${member.childOrder === 1 ? 'Trưởng' : `T.${member.childOrder}`}`}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap' }}>{displayTitle}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '8px', fontWeight: '800', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '3px', width: '100%', color: '#991b1b', lineHeight: '1.1' }}>
                <div>Đ{genNum}</div>
                <div style={{ fontSize: '7.5px', opacity: 0.85 }}>{member.childOrder === 1 ? 'Trưởng' : `T.${member.childOrder}`}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10.5px', fontWeight: '700', lineHeight: '1.12' }}>
                {verticalWords.map((word, wIdx) => (
                  <span key={wIdx}>{word}</span>
                ))}
              </div>
            </>
          )}
        </div>
      );
    };

    const renderChildrenCluster = (parent) => {
      const children = getChildren(parent.id);
      if (children.length === 0) return null;

      const isParentExpanded = treeExpandedIds.includes(parent.id);
      if (!isParentExpanded) return null;

      const hasAnyGrandChild = children.some((c) => getChildren(c.id).length > 0);
      const isLeafCluster = children.length > 5 && !hasAnyGrandChild;
      const activeSubParents = children.filter(
        (c) => getChildren(c.id).length > 0 && (treeExpandedIds.includes(c.id))
      );

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '1.5px', height: '10px', backgroundColor: '#991b1b' }} />

          {isLeafCluster ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, auto)', gap: '4px 3px', padding: '6px', borderTop: '1.5px solid #991b1b', backgroundColor: 'rgba(254, 243, 199, 0.35)', borderRadius: '6px' }}>
              {children.map((child) => (
                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {renderNodeCard(child)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', position: 'relative' }}>
              {children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === children.length - 1;
                const isOnly = children.length === 1;
                const childKids = getChildren(child.id);
                const isChildExpanded = treeExpandedIds.includes(child.id);

                return (
                  <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', padding: Number(child.generation) <= 3 ? '0 4px' : '0 1.5px' }}>
                    {!isOnly && (
                      <div style={{ position: 'absolute', top: 0, left: isFirst ? '50%' : 0, right: isLast ? '50%' : 0, height: '1.5px', backgroundColor: '#991b1b' }} />
                    )}
                    <div style={{ width: '1.5px', height: '10px', backgroundColor: '#991b1b' }} />
                    {renderNodeCard(child)}

                    {childKids.length > 0 && (
                      <>
                        <div style={{ width: '1.5px', height: '5px', backgroundColor: '#991b1b' }} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTreeExpand(child.id);
                          }}
                          style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '50%',
                            border: '1px solid #991b1b',
                            backgroundColor: isChildExpanded ? '#fef2f2' : '#991b1b',
                            color: isChildExpanded ? '#991b1b' : '#ffffff',
                            fontSize: '10px',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            zIndex: 3
                          }}
                        >
                          {isChildExpanded ? '−' : `+${childKids.length}`}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeSubParents.length === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {renderChildrenCluster(activeSubParents.at(0))}
            </div>
          )}

          {activeSubParents.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1.5px dashed #d97706', maxWidth: '100%' }}>
              {activeSubParents.map((subParent) => (
                <div key={subParent.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)', border: '1px solid #e5d7be', borderRadius: '6px', padding: '4px 3px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#7c1d1d', backgroundColor: '#fef3c7', padding: '1px 7px', borderRadius: '99px', border: '1px solid #f59e0b', marginBottom: '2px', whiteSpace: 'nowrap' }}>
                    ↳ Nhánh {subParent.name.replace(/\(.*?\)/g, '').trim()}
                  </div>
                  {renderChildrenCluster(subParent)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    const rootKids = getChildren(rootMember.id);
    const isRootExpanded = treeExpandedIds.includes(rootMember.id);

    return (
      <div key={rootMember.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {renderNodeCard(rootMember)}
        {rootKids.length > 0 && (
          <>
            <div style={{ width: '1.5px', height: '6px', backgroundColor: '#991b1b' }} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTreeExpand(rootMember.id);
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '1px solid #991b1b',
                backgroundColor: isRootExpanded ? '#fef2f2' : '#991b1b',
                color: isRootExpanded ? '#991b1b' : '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
            >
              {isRootExpanded ? '−' : `+${rootKids.length}`}
            </button>
            {renderChildrenCluster(rootMember)}
          </>
        )}
      </div>
    );
  };


  const renderVerticalTree = (parentId = null, level = 0) => {
    // Sort by explicit childOrder so records added later (e.g. child #12)
    // cannot jump ahead of #8–#11 in the displayed genealogy list.
    const children = members
      .filter((m) => m.parentId === parentId)
      .sort((a, b) => {
        const orderA = Number(a.childOrder ?? 999);
        const orderB = Number(b.childOrder ?? 999);
        return orderA - orderB;
      });
    if (!children.length) return null;

    return (
      <div style={{ marginLeft: level === 0 ? '0px' : '12px', borderLeft: level === 0 ? 'none' : '2px dashed #fcd34d', paddingLeft: level === 0 ? '0px' : '4px' }}>
        {children.map((m) => {
        const subChildren = members
          .filter((c) => c.parentId === m.id)
          .sort((a, b) => Number(a.childOrder ?? 999) - Number(b.childOrder ?? 999) || Number(a.id) - Number(b.id));
        const isExpanded = expandedIds.includes(m.id);

          return (
            <div key={m.id} style={{ marginTop: '5px' }}>
            {renderMemberCard(m, subChildren, isExpanded)}
            {subChildren.length > 0 && isExpanded && renderVerticalTree(m.id, level + 1)}
          </div>
          );
        })}
      </div>
    );
  };

  const filteredByGen = members.filter((m) => {
    const matchGen = filterGen === 'ALL' || String(m.generation) === filterGen;
    const matchName = !searchTerm || normalizeText(m.name).includes(normalizeText(searchTerm));
    return matchGen && matchName;
  });
  return (
    <div>
      {/* BANNER NỀN ẨN LONG & VIỀN HOA VĂN HOÀNG GIA */}
      <header className="banner-imperial">
        <div className="corner-ornament corner-tl" />
        <div className="corner-ornament corner-tr" />
        <div className="corner-ornament corner-bl" />
        <div className="corner-ornament corner-br" />

        <div className="banner-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(253, 230, 138, 0.15)', padding: '10px', borderRadius: '12px', border: '1.5px solid #fde68a' }}>
              <Landmark size={38} color="#fde68a" />
            </div>
            <div>
              <h1 className="banner-title" style={{ fontFamily: 'Georgia, serif' }}>{FAMILY_INFO.name}</h1>
              <div style={{ fontSize: '14px', color: '#fde68a', opacity: 0.95, marginTop: '4px', fontStyle: 'italic' }}>
                "Cây có cội mới nảy cành xanh lá • Nước có nguồn mới bể cả sông sâu"
              </div>
            </div>
          </div>

          {IS_LOCAL_ADMIN && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleExportWebsiteData} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#166534', color: '#fff', border: '1px solid #86efac', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }} title="Xuất src/data.js đã cập nhật để đưa lên website công khai">
              <Download size={16} /> Xuất dữ liệu cập nhật website
            </button>

          </div>
          )}
        </div>

        <div className="banner-sub-row">
          <div onClick={() => setMapModal({ title: 'Nhà thờ Họ Lê Viết - Làng Phú Ngạn (TDP Tây Phú, Hóa Châu)', coords: FAMILY_INFO.templeCoords })} className="banner-address">
            <MapPin size={16} color="#fde68a" />
            <span>{FAMILY_INFO.subtitle}</span>
            <span className="map-pill">Google Maps nhà thờ Họ</span>
          </div>
        </div>
      </header>

      {/* THANH ĐIỀU HƯỚNG 3 MỤC: TRANG CHỦ - GIA PHẢ - LIÊN HỆ */}
      <nav className="nav-bar">
        <button type="button" onClick={() => setActiveTab('TRANG_CHU')} className={`nav-tab ${activeTab === 'TRANG_CHU' ? 'active' : ''}`}>
        <Home size={18} /> Trang chủ
        </button>
        <button type="button" onClick={() => setActiveTab('GIA_PHA')} className={`nav-tab ${activeTab === 'GIA_PHA' ? 'active' : ''}`}>
        <Users size={18} /> Gia phả họ Lê Viết
        </button>
        <button type="button" onClick={() => setActiveTab('ANH_NHA_THO_HO')} className={`nav-tab ${activeTab === 'ANH_NHA_THO_HO' ? 'active' : ''}`}>
        <Images size={18} /> Ảnh nhà thờ họ
        </button>
        <button type="button" onClick={() => setActiveTab('LIEN_HE')} className={`nav-tab ${activeTab === 'LIEN_HE' ? 'active' : ''}`}>
        <PhoneCall size={18} /> Liên hệ
        </button>
      </nav>

      {/* NỘI DUNG MỤC 1: TRANG CHỦ & TIN LỄ HẰNG NĂM */}
      {activeTab === 'TRANG_CHU' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' }}>
          <ScrollDivider title="Từ Đường & Lời Tựa Dòng Họ" />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e5dcc8', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <img src={FAMILY_INFO.templeImage} alt="Nhà thờ họ Lê Viết" style={{ width: '360px', maxWidth: '100%', height: '230px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #f59e0b' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div style={{ flex: 1, minWidth: '280px' }}>
            <h2 style={{ margin: '0 0 12px 0', color: '#7c1d1d', fontFamily: 'Georgia, serif' }}>Từ đường Họ Lê Viết — Làng Phú Ngạn</h2>
            <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.7', fontStyle: 'italic' }}>"{FAMILY_INFO.homeIntro || FAMILY_INFO.intro}"</p>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
            Từ đường tọa lạc tại <strong>{FAMILY_INFO.subtitle}</strong>. Đây là nơi phụng thờ Ngài Thủy tổ <strong>Lê Viết Ban</strong> - Thuỷ tổ tỷ <strong>Nguyễn Thị Bông</strong> cùng các bậc tiền nhân liệt vị qua các đời, là chốn đi về sum họp của con cháu nội ngoại mỗi dịp lễ Tết, Chạp mộ.
            </p>

            <button type="button" onClick={() => setActiveTab('GIA_PHA')} className="btn-primary" style={{ marginTop: '8px' }}>
            <Users size={16} /> Xem cây Phả hệ 20 Đời
            </button>
            </div>
          </div>

          <ScrollDivider title="Tin Tức & Sự Kiện Lễ Hội Hằng Năm" />

          {IS_LOCAL_ADMIN && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button type="button" onClick={() => setShowAddNews(true)} className="btn-primary">
                + Đăng bài viết mới
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
            {newsList.map((news) => (
              <div
                key={news.id}
                onClick={() => setSelectedNews(news)}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e5d7be',
                  borderTop: '3px solid #881313',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600' }}>
                      <Newspaper size={13} /> {news.date}
                    </span>
                    <span style={{ fontSize: '12px', color: '#881313', fontWeight: '600' }}>Xem / Sửa →</span>
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#7c1d1d' }}>{news.title}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#57534e', lineHeight: '1.6' }}>{news.summary}</p>
                </div>
              </div>
            ))}
          </div>

          <ScrollDivider title="Lịch Sử Phụng Tu Tộc Phổ & Sổ vàng công đức" />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e5dcc8' }}>
              <h3 style={{ margin: '0 0 14px 0', color: '#7c1d1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} /> Lịch sử phụng tu Tộc Phổ
              </h3>
              {REVISION_HISTORY.map((rev, index) => (
                <div key={rev.id} style={{ padding: '10px 12px', backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #991b1b', fontSize: '14px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', color: '#7c1d1d' }}>{index + 1}. Phụng tu: {rev.date}</div>
                  <div style={{ color: '#334155', marginTop: '2px' }}>Người thực hiện: <strong>{rev.author}</strong></div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e5dcc8' }}>
              <h3 style={{ margin: '0 0 14px 0', color: '#7c1d1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={20} /> Công đức & Tri ân
            </h3>

              <div
                onClick={() => {
                  const fullGratitudeText =
                    'Hội đồng Gia tộc trân trọng khắc ghi và thành kính tri ân toàn thể con cháu nội ngoại, dâu rể gần xa đã hướng về cội nguồn, đồng tâm góp công, góp của tu bổ, tôn tạo Từ đường họ Lê Viết ngày càng khang trang, uy nghiêm.\n' +
                    'Mỗi sự đóng góp, dù tịnh tài, vật lực hay công sức, đều là nghĩa cử cao đẹp, như nén tâm hương thành kính dâng lên Tiên tổ, thể hiện đạo lý “Uống nước nhớ nguồn”, lòng hiếu kính và tình đoàn kết dòng tộc.\n' +
                    'Nguyện cầu hồng ân Tiên tổ phù hộ cho toàn thể gia tộc bình an, hưng thịnh, con cháu thuận hòa, hiếu nghĩa, phúc lộc trường tồn; để nghĩa tình và công đức hôm nay mãi được trân quý, lưu truyền đến các thế hệ mai sau.';

                  const donatePost = newsList.find((n) => n.title.includes('Sổ Vàng') || n.title.includes('Đóng góp')) || {
                    id: 99,
                    date: 'Công đức & Tri ân',
                    title: 'Sổ Vàng công đức & Tri ân',
                    summary: 'Hội đồng Gia tộc trân trọng khắc ghi và thành kính tri ân toàn thể con cháu nội ngoại, dâu rể gần xa đã hướng về cội nguồn, đồng tâm góp công, góp của tu bổ, tôn tạo Từ đường họ Lê Viết ngày càng khang trang, uy nghiêm.',
                    content: fullGratitudeText
                  };
                  setSelectedNews(donatePost);
                }}
                className="memorial-item"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', color: '#7c1d1d', fontSize: '15px' }}>Sổ Vàng công đức & Tri ân</span>
                  <span style={{ fontSize: '12px', color: '#881313', fontWeight: '600' }}>Sửa →</span>
                </div>

                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', textAlign: 'justify' }}>
                  <p style={{ margin: 0, textIndent: '0.7cm' }}>
                    Hội đồng Gia tộc trân trọng khắc ghi và thành kính tri ân toàn thể con cháu nội ngoại, dâu rể gần xa đã hướng về cội nguồn, đồng tâm góp công, góp của tu bổ, tôn tạo Từ đường họ Lê Viết ngày càng khang trang, uy nghiêm.
                  </p>
                  <p style={{ margin: 0, textIndent: '0.7cm' }}>
                    Mỗi sự đóng góp, dù tịnh tài, vật lực hay công sức, đều là nghĩa cử cao đẹp, như nén tâm hương thành kính dâng lên Tiên tổ, thể hiện đạo lý “Uống nước nhớ nguồn”, lòng hiếu kính và tình đoàn kết dòng tộc.
                  </p>
                  <p style={{ margin: 0, textIndent: '0.7cm' }}>
                    Nguyện cầu hồng ân Tiên tổ phù hộ cho toàn thể gia tộc bình an, hưng thịnh, con cháu thuận hòa, hiếu nghĩa, phúc lộc trường tồn; để nghĩa tình và công đức hôm nay mãi được trân quý, lưu truyền đến các thế hệ mai sau.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NỘI DUNG MỤC ẢNH NHÀ THỜ HỌ */}
      {activeTab === 'ANH_NHA_THO_HO' && (
        <section className="temple-gallery-page">
          <ScrollDivider title="Hình Ảnh Nhà Thờ Họ Lê Viết" />
          <p className="temple-gallery-intro">
            Hình ảnh Từ đường, các dịp tế lễ, tu sửa và sinh hoạt của con cháu trong dòng họ.
          </p>
          {TEMPLE_GALLERY.length > 0 ? (
            <div className="temple-gallery-grid">
              {TEMPLE_GALLERY.map((photo, index) => (
                <figure className="temple-gallery-card" key={`${photo.src}-${index}`}>
                  <img src={photo.src} alt={photo.caption || `Ảnh nhà thờ họ ${index + 1}`} loading="lazy" decoding="async" />
                  {photo.caption && <figcaption>{photo.caption}</figcaption>}
                </figure>
              ))}
            </div>
          ) : (
            <div className="temple-gallery-empty">
              <Images size={42} />
              <h3>Chưa có hình ảnh</h3>
              <p>Hãy chép ảnh vào thư mục <code>public/images/nha-tho-ho/</code>, sau đó khai báo đường dẫn và chú thích trong tệp <code>src/gallery.js</code>.</p>
            </div>
          )}
        </section>
      )}

      {/* NỘI DUNG MỤC 2: GIA PHẢ DÒNG HỌ */}
      {activeTab === 'GIA_PHA' && (
        <div className="layout">
          <main className="tree-area">
            {/* Thanh công cụ lọc đời, tìm kiếm và thêm thành viên */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', padding: '14px', borderRadius: '10px', border: '1px solid #fde68a', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flex: 1 }}>
                <div className="filter-box" style={{ border: '1px solid #cbd5e1' }}>
                  <select className="filter-select" value={filterGen} onChange={(e) => setFilterGen(e.target.value)}>
                    <option value="ALL">Tất cả các đời</option>
                    {GENERATION_LIST.map((g) => <option key={g} value={String(g)}>Đời thứ {g}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '250px', flexWrap: 'wrap' }}>
                  <div className="search-box" style={{ border: '1px solid #cbd5e1', flex: 1, minWidth: '180px' }}>
                    <Search size={18} color="#64748b" />
                    <input
                      id="member-search-input"
                      style={{ width: '100%' }}
                      placeholder="Nhập tên cần tìm (VD: Lê vô danh)..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setMatchIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleJumpToSearch(false);
                        }
                      }}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setMatchIndex(0);
                        }}
                        title="Xóa từ khóa tìm kiếm"
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: '0 4px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJumpToSearch(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#7c1d1d',
                      color: '#fde68a',
                      border: '1px solid #d97706',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Search size={15} /> Tìm kiếm
                  </button>

                  {searchTerm.trim() !== '' && (() => {
                    const count = members.filter((m) => normalizeText(m.name).includes(normalizeText(searchTerm))).length;
                    if (count <= 1) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => handleJumpToSearch(true)}
                        style={{
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #f59e0b',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Người tiếp ({(matchIndex % count) + 1}/{count}) ↓
                      </button>
                    );
                  })()}
                </div>
              </div>

              {IS_LOCAL_ADMIN && (
                <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
                  <UserPlus size={18} /> Thêm thành viên
                </button>
              )}
            </div>

            {searchTerm.trim() !== '' && searchResultGroups.total > 0 && (
              <div style={{ margin: '0 0 12px', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '9px', background: '#f8fafc', fontSize: '13px', color: '#334155' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Tìm thấy {searchResultGroups.total} thành viên phù hợp</div>
                {searchResultGroups.exact.length > 0 && <div><strong>Khớp chính xác:</strong> {searchResultGroups.exact.map((m) => m.name).join(', ')}</div>}
                {searchResultGroups.accentVariants.length > 0 && <div style={{ marginTop: '4px' }}><strong>Khớp gần (khác dấu/cách viết):</strong> {searchResultGroups.accentVariants.map((m) => m.name).join(', ')}</div>}
                {searchResultGroups.extended.length > 0 && <div style={{ marginTop: '4px' }}><strong>Tên có chứa cụm tìm kiếm:</strong> {searchResultGroups.extended.map((m) => m.name).join(', ')}</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#7c1d1d' }}>
                {filterGen === 'ALL' ? `Sơ đồ Phả hệ dòng họ (${members.length} thành viên)` : `Danh Sách Thành Viên Đời Thứ ${filterGen} (${filteredByGen.length} người)`}
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>* Bấm vào từng thẻ thành viên để xem hoặc nhập/sửa thông tin Chồng, Vợ chánh, Vợ thứ và danh sách con cái.</p>
              </div>

              {filterGen === 'ALL' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <button
                      type="button"
                      onClick={() => setTreeViewMode('LIST')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        backgroundColor: treeViewMode === 'LIST' ? '#7c1d1d' : 'transparent',
                        color: treeViewMode === 'LIST' ? '#fde68a' : '#475569'
                      }}
                    >
                      Danh sách chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => setTreeViewMode('VISUAL_TREE')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        backgroundColor: treeViewMode === 'VISUAL_TREE' ? '#7c1d1d' : 'transparent',
                        color: treeViewMode === 'VISUAL_TREE' ? '#fde68a' : '#475569'
                      }}
                    >
                      Sơ đồ hình cây
                    </button>
                  </div>

                  {treeViewMode === 'LIST' && (
                    <>
                      <button type="button" onClick={expandAll} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}>
                        <ChevronsDown size={15} /> Mở tất cả
                      </button>
                      <button type="button" onClick={collapseAll} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}>
                        <ChevronsUp size={15} /> Thu gọn
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {filterGen === 'ALL' ? (
              <div>
                <div className="ancestral-plaque">
                <div className="plaque-corner plaque-tl" />
                <div className="plaque-corner plaque-tr" />
                <div className="plaque-corner plaque-bl" />
                <div className="plaque-corner plaque-br" />

                <div className="plaque-header">
                ❖ Phụng Thờ Tiền Nhân Liệt Vị ❖
                </div>

                <div>
                  {FAMILY_INFO.ancestorsPrayer &&
                    FAMILY_INFO.ancestorsPrayer.map((line, idx) => (
                      <div key={idx} className="plaque-line">
                      {line}
                    </div>
                  ))}
                </div>

              <div className="plaque-connector" />
              </div>

              {treeViewMode === 'LIST' ? (
                renderVerticalTree(null)
              ) : (
                <div
                  style={{
                    overflowX: 'auto',
                    padding: '16px',
                    backgroundColor: '#fdfbf7',
                    borderRadius: '10px',
                    border: '1px solid #e5d7be'
                  }}
                >
                  {/* Thanh công cụ Thu phóng & Mở/Thu gọn nhánh độc lập */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px dashed #d6c7b2', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#78716c', fontStyle: 'italic' }}>
                      Bấm nút <strong>(−)</strong> hoặc <strong>(+số con)</strong> dưới mỗi người để thu gọn/mở từng nhánh
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setTreeExpandedIds([])}
                        style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}
                      >
                        Thu gọn hết
                      </button>
                      <button
                        type="button"
                        onClick={() => setTreeExpandedIds(members.filter((m) => Number(m.generation) <= 3).map((m) => m.id))}
                        style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}
                      >
                        Gọn tới Đời 4
                      </button>
                      <button
                        type="button"
                        onClick={() => setTreeExpandedIds(members.map((m) => m.id))}
                        style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}
                      >
                        Mở hết
                      </button>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px' }}>
                        <button
                          type="button"
                          onClick={() => setTreeZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                          style={{ border: 'none', background: 'none', fontWeight: '800', cursor: 'pointer', padding: '2px 6px', fontSize: '14px', color: '#7c1d1d' }}
                          title="Thu nhỏ sơ đồ"
                        >
                          −
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', minWidth: '38px', textAlign: 'center' }}>
                          {Math.round(treeZoom * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setTreeZoom((z) => Math.min(1.1, Number((z + 0.1).toFixed(2))))}
                          style={{ border: 'none', background: 'none', fontWeight: '800', cursor: 'pointer', padding: '2px 6px', fontSize: '14px', color: '#7c1d1d' }}
                          title="Phóng to sơ đồ"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Khung vẽ sơ đồ áp dụng mức thu phóng */}
                  <div style={{ display: 'inline-flex', minWidth: '100%', justifyContent: 'center', zoom: treeZoom }}>
                    {members
                      .filter((m) => !m.parentId)
                      .map((rootMember) => renderVisualTreeNode(rootMember))}
                  </div>
                </div>
              )}

            </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredByGen.map((m) => renderMemberCard(m, members.filter((c) => c.parentId === m.id).sort((a, b) => Number(a.childOrder ?? 999) - Number(b.childOrder ?? 999) || Number(a.id) - Number(b.id)), false))}
              </div>
            )}
          </main>

          {treeViewMode === 'LIST' && (
            <div className="sidebar-col">
            <aside className="sidebar">
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontFamily: 'Georgia, serif',
                  color: '#7c1d1d',
                  borderBottom: '1px solid #e5d7be',
                  paddingBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  letterSpacing: '0.5px'
                }}
              >
                <span style={{ color: '#d97706', fontSize: '14px' }}>❧ ❖</span>
                <span>Lời tựa Tộc Phổ</span>
                <span style={{ color: '#d97706', fontSize: '14px' }}>❖ ❧</span>
              </h3>
            <img src={FAMILY_INFO.templeImage} alt="Nhà thờ họ Lê Viết" className="temple-photo" onError={(e) => { e.target.style.display = 'none'; }} />
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: '10px 0 0 0', fontStyle: 'italic' }}>"{FAMILY_INFO.intro}"</p>
          </aside>

            <aside className="sidebar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '10px' }}>
                <BookOpen size={20} color="#991b1b" style={{ flexShrink: 0 }} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#7c1d1d', whiteSpace: 'nowrap' }}>
                  Lịch sử phụng tu Tộc Phổ
                </h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                {IS_LOCAL_ADMIN && <button
                  type="button"
                  onClick={openAddRevision}
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  + Thêm
                </button>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {revisions.map((rev, index) => (
                  <div
                    key={rev.id}
                    onClick={() => IS_LOCAL_ADMIN && openEditRevision(rev)}
                    style={{ padding: '10px 12px', backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #991b1b', fontSize: '13px', lineHeight: '1.5', cursor: IS_LOCAL_ADMIN ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '700', color: '#7c1d1d' }}>{index + 1}. Phụng tu: {rev.date}</span>
                      {IS_LOCAL_ADMIN && <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600' }}>Sửa →</span>}
                    </div>
                    <div style={{ color: '#334155', marginTop: '2px' }}>Người thực hiện: <strong>{rev.author}</strong></div>
                  </div>
                ))}
              </div>
            </aside>

            <aside className="sidebar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '10px' }}>
                <Landmark size={20} color="#991b1b" style={{ flexShrink: 0 }} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#7c1d1d', whiteSpace: 'nowrap' }}>
                  Lịch sử Trùng tu Từ Đường
                </h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                {IS_LOCAL_ADMIN && <button
                  type="button"
                  onClick={openAddRenovation}
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  + Thêm
                </button>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {renovations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => IS_LOCAL_ADMIN && openEditRenovation(item)}
                    className="memorial-item"
                    style={{ position: 'relative', cursor: IS_LOCAL_ADMIN ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: '4px' }}>
                        {item.year}
                      </span>
                      {IS_LOCAL_ADMIN && <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600' }}>Sửa →</span>}
                    </div>
                    <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '6px', fontSize: '14px' }}>{item.title}</div>
                    {item.detail && (
                      <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: '1.5' }}>{item.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
        </div>
      )}
       
    {/* MỤC 4: LIÊN HỆ */}
      {activeTab === 'LIEN_HE' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 32px' }}>
          <ScrollDivider title="Thông Tin Liên Hệ Ban biên tập Tộc Phổ" />

          <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '12px', border: '1px solid #e5dcc8', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#7c1d1d', fontFamily: 'Georgia, serif' }}>Ban Phụng tu & Lưu trữ Gia phả Họ Lê Viết</h2>
            <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', backgroundColor: '#fffbeb', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              {CONTACT_INFO.note}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px', fontSize: '15px' }}>
              <div><strong>Người phụ trách biên tập:</strong> {CONTACT_INFO.editor}</div>
              <div>
                <strong>Email tiếp nhận thông tin:</strong>{' '}
                <a href={`mailto:${CONTACT_INFO.email}`} style={{ color: '#991b1b', fontWeight: '700' }}>{CONTACT_INFO.email}</a>
              </div>
              <div>
                <strong>Điện thoại / Zalo:</strong>{' '}
                <a href={`tel:${CONTACT_INFO.phone}`} style={{ color: '#991b1b', fontWeight: '700' }}>{CONTACT_INFO.phone}</a>
              </div>
              <div><strong>Địa chỉ Từ đường:</strong> {CONTACT_INFO.address}</div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button type="button" onClick={() => setMapModal({ title: 'Nhà thờ Họ Lê Viết - Làng Phú Ngạn (TDP Tây Phú, Hóa Châu)', coords: FAMILY_INFO.templeCoords })} className="btn-primary">
                <MapPin size={18} /> Mở bản đồ & Mã QR chỉ đường về Từ đường
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THANH TÌNH TRẠNG CUỐI TRANG (FOOTER) */}
      <footer className="royal-footer">
        <div className="royal-footer-inner">
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#fde68a' }}>
              GIA PHẢ HỌ LÊ VIẾT — LÀNG PHÚ NGẠN, HÓA CHÂU, TP.HUẾ
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
              © 2026 Bản quyền thuộc Hội đồng Gia tộc Họ Lê Viết • Phụng tu số hóa năm Bính Ngọ • Tổng số: {members.length} thành viên
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { setActiveTab('TRANG_CHU'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="footer-link-btn">
              Về trang chủ
            </button>
            <button type="button" onClick={() => { setActiveTab('GIA_PHA'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="footer-link-btn">
              Xem gia phả
            </button>
            <button type="button" onClick={() => { setActiveTab('LIEN_HE'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="footer-link-btn">
              Liên hệ
            </button>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="footer-link-btn">
              Lên đầu trang ↑
            </button>
          </div>
        </div>
      </footer>

      <MapModal mapModal={mapModal} onClose={() => setMapModal(null)} />

      <MemberModals
        members={members}
        selected={selected}
        onCloseSelected={() => setSelected(null)}
        onSaveEdit={handleSaveEdit}
        onDeleteMember={handleDeleteMember}
        showAdd={showAdd}
        onCloseAdd={() => setShowAdd(false)}
        onAddMember={handleAddMember}
        onOpenMap={setMapModal}
        readOnly={!IS_LOCAL_ADMIN}
      />

      <NewsModals
        selectedNews={selectedNews}
        onCloseSelectedNews={() => setSelectedNews(null)}
        onSaveNews={handleSaveNews}
        onDeleteNews={handleDeleteNews}
        showAddNews={showAddNews}
        onCloseAddNews={() => setShowAddNews(false)}
        readOnly={!IS_LOCAL_ADMIN}
      />

      {IS_LOCAL_ADMIN && revisionModal && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-head">
              <h3 style={{ margin: 0, color: '#7c1d1d' }}>
                {revisionModal.mode === 'EDIT' ? 'Sửa Thông Tin Phụng Tu Tộc Phổ' : 'Thêm Lần Phụng Tu Tộc Phổ Mới'}
              </h3>
              <button type="button" onClick={() => setRevisionModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRevision} className="form">
              <label>
                Thời gian / Năm phụng tu *
                <input
                  required
                  placeholder="VD: Năm Bính Ngọ 2026 hoặc Tháng 3/2026"
                  value={revForm.date}
                  onChange={(e) => setRevForm({ ...revForm, date: e.target.value })}
                />
              </label>

              <label>
                Người thực hiện / Ban biên tập *
                <input
                  required
                  placeholder="VD: Ông Lê Viết Thanh (Con cháu đời thứ ...)"
                  value={revForm.author}
                  onChange={(e) => setRevForm({ ...revForm, author: e.target.value })}
                />
              </label>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Lưu Lần Phụng Tu
                </button>
                {revisionModal.mode === 'EDIT' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRevision(revForm.id)}
                    style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Xóa
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {IS_LOCAL_ADMIN && renovationModal && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-head">
              <h3 style={{ margin: 0, color: '#7c1d1d' }}>
                {renovationModal.mode === 'EDIT' ? 'Sửa Lần Trùng Tu Từ Đường' : 'Thêm Lần Trùng Tu / Xây Dựng Mới'}
              </h3>
              <button type="button" onClick={() => setRenovationModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRenovation} className="form">
              <label>
                Năm / Thời gian thực hiện *
                <input
                  required
                  placeholder="VD: Năm 2026 hoặc Tháng 8/2027"
                  value={renoForm.year}
                  onChange={(e) => setRenoForm({ ...renoForm, year: e.target.value })}
                />
              </label>

              <label>
                Hạng mục xây dựng / trùng tu *
                <input
                  required
                  placeholder="VD: Sơn sửa Tiền đường & Hậu tẩm"
                  value={renoForm.title}
                  onChange={(e) => setRenoForm({ ...renoForm, title: e.target.value })}
                />
              </label>

              <label>
                Nội dung chi tiết (Kinh phí, vật liệu, ghi chú...)
                <textarea
                  rows="3"
                  placeholder="Mô tả chi tiết hạng mục tôn tạo..."
                  value={renoForm.detail}
                  onChange={(e) => setRenoForm({ ...renoForm, detail: e.target.value })}
                />
              </label>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Lưu Lịch Sử Trùng Tu
                </button>
                {renovationModal.mode === 'EDIT' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRenovation(renoForm.id)}
                    style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Xóa
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
