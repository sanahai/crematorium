(function() {
  'use strict';

  const STORAGE_KEY = 'crematoriumData';
  const DEFAULT_DATA_URL = './js/crematoriums.json';

  const adminTableBody = document.getElementById('adminTableBody');
  const adminLoading = document.getElementById('adminLoading');
  const adminEmpty = document.getElementById('adminEmpty');
  const adminSearch = document.getElementById('adminSearch');
  const addNewBtn = document.getElementById('addNewBtn');
  const resetDataBtn = document.getElementById('resetDataBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const editModal = document.getElementById('editModal');
  const deleteModal = document.getElementById('deleteModal');
  const modalTitle = document.getElementById('modalTitle');
  const deleteTargetName = document.getElementById('deleteTargetName');
  const toastMsg = document.getElementById('toastMsg');

  let allData = [];
  let editingId = null;
  let deletingId = null;

  async function loadData() {
    adminLoading.classList.remove('hidden');
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        allData = JSON.parse(local);
      } else {
        const res = await fetch(DEFAULT_DATA_URL);
        const json = await res.json();
        allData = json.data || [];
      }
      renderTable(allData);
    } catch (error) {
      showToast('데이터 로드 실패');
    } finally {
      adminLoading.classList.add('hidden');
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
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
        <td><strong>${esc(item.name)}</strong></td>
        <td>${esc(item.region)}</td>
        <td>${esc(item.city || '-')}</td>
        <td>${esc(item.operating_hours || '-')}</td>
        <td><span class="status-badge ${item.is_active === false ? 'status-inactive' : 'status-active'}">${item.is_active === false ? '숨김' : '노출'}</span></td>
        <td>
          <button class="table-edit-btn" data-id="${esc(item.id)}">수정</button>
          <button class="table-delete-btn" data-id="${esc(item.id)}" data-name="${esc(item.name)}">삭제</button>
        </td>
      </tr>
    `).join('');
  }

  function openEdit(id) {
    const item = allData.find(entry => entry.id === id);
    if (!item) return;
    editingId = id;
    modalTitle.textContent = '시설 정보 수정';
    fillForm(item);
    editModal.classList.remove('hidden');
  }

  function openNew() {
    editingId = null;
    modalTitle.textContent = '시설 추가';
    document.getElementById('editForm').reset();
    document.getElementById('fRequiredDocs').value = '{\n  "병사": [],\n  "외인사": [],\n  "개장유골": [],\n  "외국인": [],\n  "공통": []\n}';
    document.getElementById('fIsActive').checked = true;
    editModal.classList.remove('hidden');
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
    document.getElementById('fDuration').value = item.duration || '';
    document.getElementById('fReservationMethod').value = item.reservation_method || '';
    document.getElementById('fSchedule').value = (item.schedule || []).join('\n');
    document.getElementById('fReservationInfo').value = (item.reservation_info || []).join('\n');
    document.getElementById('fFeeInfo').value = (item.fee_info || []).join('\n');
    document.getElementById('fNotice').value = item.notice || '';
    document.getElementById('fRequiredDocs').value = JSON.stringify(item.required_docs || {}, null, 2);
    document.getElementById('fIsActive').checked = item.is_active !== false;
  }

  function saveForm() {
    const requiredDocsText = document.getElementById('fRequiredDocs').value.trim();
    let requiredDocs;
    try {
      requiredDocs = requiredDocsText ? JSON.parse(requiredDocsText) : {};
    } catch (error) {
      showToast('서류 JSON 형식이 올바르지 않습니다.');
      return;
    }

    const payload = {
      id: editingId || slugify(document.getElementById('fName').value),
      name: document.getElementById('fName').value.trim(),
      region: document.getElementById('fRegion').value,
      city: document.getElementById('fCity').value.trim(),
      phone: document.getElementById('fPhone').value.trim(),
      address: document.getElementById('fAddress').value.trim(),
      map_link: document.getElementById('fMapLink').value.trim(),
      source_url: document.getElementById('fSourceUrl').value.trim(),
      operating_hours: document.getElementById('fOperatingHours').value.trim(),
      duration: document.getElementById('fDuration').value.trim(),
      reservation_method: document.getElementById('fReservationMethod').value.trim(),
      schedule: splitLines(document.getElementById('fSchedule').value),
      reservation_info: splitLines(document.getElementById('fReservationInfo').value),
      fee_info: splitLines(document.getElementById('fFeeInfo').value),
      notice: document.getElementById('fNotice').value.trim(),
      required_docs: requiredDocs,
      is_active: document.getElementById('fIsActive').checked
    };

    if (!payload.name || !payload.region) {
      showToast('시설명과 지역은 필수입니다.');
      return;
    }

    if (editingId) {
      allData = allData.map(item => item.id === editingId ? payload : item);
      showToast('수정되었습니다.');
    } else {
      allData.unshift(payload);
      showToast('추가되었습니다.');
    }
    persist();
    renderTable(allData);
    editModal.classList.add('hidden');
  }

  async function resetToDefault() {
    const res = await fetch(DEFAULT_DATA_URL);
    const json = await res.json();
    allData = json.data || [];
    persist();
    renderTable(allData);
    showToast('기본 데이터를 복원했습니다.');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ data: allData }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'crematoriums.json';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('JSON을 내보냈습니다.');
  }

  function deleteCurrent() {
    allData = allData.filter(item => item.id !== deletingId);
    persist();
    renderTable(allData);
    deleteModal.classList.add('hidden');
    showToast('삭제되었습니다.');
  }

  function splitLines(value) {
    return String(value || '').split('\n').map(line => line.trim()).filter(Boolean);
  }

  function slugify(text) {
    return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');
  }

  function showToast(message) {
    toastMsg.textContent = message;
    toastMsg.classList.remove('hidden');
    setTimeout(() => toastMsg.classList.add('hidden'), 2400);
  }

  function esc(value) {
    return String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  addNewBtn.addEventListener('click', openNew);
  document.getElementById('editSaveBtn').addEventListener('click', saveForm);
  document.getElementById('editCancelBtn').addEventListener('click', () => editModal.classList.add('hidden'));
  document.getElementById('editModalClose').addEventListener('click', () => editModal.classList.add('hidden'));
  document.getElementById('deleteConfirmBtn').addEventListener('click', deleteCurrent);
  document.getElementById('deleteCancelBtn').addEventListener('click', () => deleteModal.classList.add('hidden'));
  document.getElementById('deleteModalClose').addEventListener('click', () => deleteModal.classList.add('hidden'));
  exportJsonBtn.addEventListener('click', exportJson);
  resetDataBtn.addEventListener('click', resetToDefault);

  adminSearch.addEventListener('input', () => {
    const keyword = adminSearch.value.trim().toLowerCase();
    const filtered = allData.filter(item => [item.name, item.region, item.city].join(' ').toLowerCase().includes(keyword));
    renderTable(filtered);
  });

  adminTableBody.addEventListener('click', (event) => {
    const editBtn = event.target.closest('.table-edit-btn');
    if (editBtn) {
      openEdit(editBtn.dataset.id);
      return;
    }
    const deleteBtn = event.target.closest('.table-delete-btn');
    if (deleteBtn) {
      deletingId = deleteBtn.dataset.id;
      deleteTargetName.textContent = deleteBtn.dataset.name;
      deleteModal.classList.remove('hidden');
    }
  });

  loadData();
})();
