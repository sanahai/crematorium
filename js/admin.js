(function() {
  'use strict';

  const STORAGE_KEY = 'crematoriumDataOverride_v2';
  const BASE_JSON_PATH = './js/crematoriums.json';

  const adminTableBody = document.getElementById('adminTableBody');
  const adminLoading = document.getElementById('adminLoading');
  const adminEmpty = document.getElementById('adminEmpty');
  const adminSearch = document.getElementById('adminSearch');
  const addNewBtn = document.getElementById('addNewBtn');
  const exportBtn = document.getElementById('exportBtn');
  const resetBtn = document.getElementById('resetBtn');
  const toastMsg = document.getElementById('toastMsg');

  const editModal = document.getElementById('editModal');
  const editModalClose = document.getElementById('editModalClose');
  const editCancelBtn = document.getElementById('editCancelBtn');
  const editSaveBtn = document.getElementById('editSaveBtn');
  const modalTitle = document.getElementById('modalTitle');

  const deleteModal = document.getElementById('deleteModal');
  const deleteModalClose = document.getElementById('deleteModalClose');
  const deleteCancelBtn = document.getElementById('deleteCancelBtn');
  const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  const deleteTargetName = document.getElementById('deleteTargetName');

  let allData = [];
  let editingId = null;
  let deletingId = null;

  loadData();

  async function loadData() {
    adminLoading.classList.remove('hidden');
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        allData = JSON.parse(local).data || [];
      } else {
        const res = await fetch(BASE_JSON_PATH);
        const json = await res.json();
        allData = json.data || [];
      }
      renderTable(allData);
    } catch (error) {
      console.error(error);
      showToast('데이터를 불러오지 못했습니다.', 'error');
    } finally {
      adminLoading.classList.add('hidden');
    }
  }

  function renderTable(list) {
    if (!list.length) {
      adminEmpty.classList.remove('hidden');
      adminTableBody.innerHTML = '';
      return;
    }
    adminEmpty.classList.add('hidden');
    adminTableBody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${escHtml(item.name)}</strong></td>
        <td>${escHtml(item.region || '-')}</td>
        <td>${escHtml(item.city || '-')}</td>
        <td>${escHtml(item.phone || '-')}</td>
        <td><span class="status-badge ${item.is_active !== false ? 'status-active' : 'status-inactive'}">${item.is_active !== false ? '활성' : '비활성'}</span></td>
        <td>
          <button class="table-edit-btn" data-id="${escHtml(item.id)}"><i class="fa-solid fa-pen"></i> 수정</button>
          <button class="table-delete-btn" data-id="${escHtml(item.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>
        </td>
      </tr>
    `).join('');
  }

  adminSearch.addEventListener('input', () => {
    const q = adminSearch.value.trim().toLowerCase();
    const filtered = allData.filter(item => [item.name, item.region, item.city, item.phone].filter(Boolean).join(' ').toLowerCase().includes(q));
    renderTable(filtered);
  });

  addNewBtn.addEventListener('click', () => {
    editingId = null;
    modalTitle.innerHTML = '<i class="fa-solid fa-plus"></i> 새 화장장 추가';
    clearForm();
    editModal.classList.remove('hidden');
  });

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ data: allData }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'crematoriums.json';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('JSON 파일을 내려받았습니다.', 'success');
  });

  resetBtn.addEventListener('click', async () => {
    if (!confirm('로컬에 저장된 수정 내용을 지우고 기본값으로 되돌릴까요?')) return;
    localStorage.removeItem(STORAGE_KEY);
    await loadData();
    showToast('기본 데이터로 복원했습니다.', 'success');
  });

  adminTableBody.addEventListener('click', event => {
    const editBtn = event.target.closest('.table-edit-btn');
    const deleteBtn = event.target.closest('.table-delete-btn');
    if (editBtn) openEdit(editBtn.dataset.id);
    if (deleteBtn) openDelete(deleteBtn.dataset.id);
  });

  function openEdit(id) {
    const item = allData.find(entry => entry.id === id);
    if (!item) return;
    editingId = id;
    modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 화장장 정보 편집';
    fillForm(item);
    editModal.classList.remove('hidden');
  }

  function openDelete(id) {
    const item = allData.find(entry => entry.id === id);
    if (!item) return;
    deletingId = id;
    deleteTargetName.textContent = item.name;
    deleteModal.classList.remove('hidden');
  }

  function fillForm(item) {
    document.getElementById('fId').value = item.id || '';
    document.getElementById('fName').value = item.name || '';
    document.getElementById('fRegion').value = item.region || '';
    document.getElementById('fCity').value = item.city || '';
    document.getElementById('fPhone').value = item.phone || '';
    document.getElementById('fAddress').value = item.address || '';
    document.getElementById('fMapLink').value = item.map_link || '';
    document.getElementById('fSourceUrl').value = item.source_url || '';
    document.getElementById('fOperatingHours').value = item.operating_hours || '';
    document.getElementById('fDuration').value = item.cremation_duration || '';
    document.getElementById('fSummary').value = item.summary || '';
    document.getElementById('fSchedule').value = serializeSchedule(item.schedule_slots || []);
    document.getElementById('fRequiredDocs').value = item.required_docs || '';
    document.getElementById('fReservationInfo').value = item.reservation_info || '';
    document.getElementById('fFeeInfo').value = item.fee_info || '';
    document.getElementById('fFeeTable').value = serializeFeeTable(item.fee_table || []);
    document.getElementById('fNotice').value = item.notice || '';
    document.getElementById('fIsActive').checked = item.is_active !== false;
  }

  function clearForm() {
    document.getElementById('editForm').reset();
    document.getElementById('fIsActive').checked = true;
  }

  editSaveBtn.addEventListener('click', () => {
    const name = document.getElementById('fName').value.trim();
    const region = document.getElementById('fRegion').value;
    if (!name || !region) {
      showToast('화장장명과 지역은 필수입니다.', 'error');
      return;
    }

    const id = editingId || `${region}-${Date.now()}`;
    const payload = {
      id,
      name,
      region,
      city: document.getElementById('fCity').value.trim(),
      phone: document.getElementById('fPhone').value.trim(),
      address: document.getElementById('fAddress').value.trim(),
      map_link: document.getElementById('fMapLink').value.trim(),
      source_url: document.getElementById('fSourceUrl').value.trim(),
      operating_hours: document.getElementById('fOperatingHours').value.trim(),
      cremation_duration: document.getElementById('fDuration').value.trim(),
      summary: document.getElementById('fSummary').value.trim(),
      schedule_slots: parseSchedule(document.getElementById('fSchedule').value),
      required_docs: document.getElementById('fRequiredDocs').value.trim(),
      reservation_info: document.getElementById('fReservationInfo').value.trim(),
      fee_info: document.getElementById('fFeeInfo').value.trim(),
      fee_table: parseFeeTable(document.getElementById('fFeeTable').value),
      notice: document.getElementById('fNotice').value.trim(),
      is_active: document.getElementById('fIsActive').checked
    };

    if (editingId) {
      allData = allData.map(item => item.id === editingId ? payload : item);
    } else {
      allData.unshift(payload);
    }

    persist();
    renderTable(allData);
    editModal.classList.add('hidden');
    showToast(editingId ? '수정했습니다.' : '새 데이터를 추가했습니다.', 'success');
  });

  deleteConfirmBtn.addEventListener('click', () => {
    if (!deletingId) return;
    allData = allData.filter(item => item.id !== deletingId);
    deletingId = null;
    persist();
    renderTable(allData);
    deleteModal.classList.add('hidden');
    showToast('삭제했습니다.', 'success');
  });

  [editModalClose, editCancelBtn].forEach(node => node.addEventListener('click', () => editModal.classList.add('hidden')));
  [deleteModalClose, deleteCancelBtn].forEach(node => node.addEventListener('click', () => deleteModal.classList.add('hidden')));

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: allData }));
  }

  function parseSchedule(raw) {
    return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [label = '', time = '', note = ''] = line.split('|').map(v => v.trim());
      return { label, time, note };
    });
  }

  function parseFeeTable(raw) {
    return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [label = '', ...prices] = line.split('|').map(v => v.trim()).filter(Boolean);
      return { label, prices };
    });
  }

  function serializeSchedule(list) {
    return list.map(row => [row.label, row.time, row.note].filter(Boolean).join('|')).join('\n');
  }

  function serializeFeeTable(list) {
    return list.map(row => [row.label, ...(row.prices || [])].filter(Boolean).join('|')).join('\n');
  }

  function showToast(msg, type = '') {
    toastMsg.textContent = msg;
    toastMsg.className = 'toast-msg' + (type ? ` ${type}` : '');
    toastMsg.classList.remove('hidden');
    setTimeout(() => toastMsg.classList.add('hidden'), 2400);
  }

  function escHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
})();
