/* =========================================
   admin.js – 화장장 관리자 페이지
   ========================================= */
(function() {
  'use strict';

  const TABLE = 'crematoriums';

  // DOM refs
  const adminTableBody = document.getElementById('adminTableBody');
  const adminLoading   = document.getElementById('adminLoading');
  const adminEmpty     = document.getElementById('adminEmpty');
  const adminSearch    = document.getElementById('adminSearch');
  const addNewBtn      = document.getElementById('addNewBtn');
  const toastMsg       = document.getElementById('toastMsg');

  // 편집 모달
  const editModal      = document.getElementById('editModal');
  const editModalClose = document.getElementById('editModalClose');
  const editCancelBtn  = document.getElementById('editCancelBtn');
  const editSaveBtn    = document.getElementById('editSaveBtn');
  const modalTitle     = document.getElementById('modalTitle');

  // 삭제 모달
  const deleteModal      = document.getElementById('deleteModal');
  const deleteModalClose = document.getElementById('deleteModalClose');
  const deleteCancelBtn  = document.getElementById('deleteCancelBtn');
  const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  const deleteTargetName = document.getElementById('deleteTargetName');

  let allData     = [];
  let editingId   = null;   // null = 신규, string = 기존 ID
  let deletingId  = null;

  /* ── 데이터 로드 ── */
  async function loadData() {
    adminLoading.classList.remove('hidden');
    adminEmpty.classList.add('hidden');
    adminTableBody.innerHTML = '';
    try {
      const res  = await fetch('./js/crematoriums.json');
      const json = await res.json();
      allData = json.data || [];
      renderTable(allData);
    } catch(e) {
      showToast('데이터 로드 실패: ' + e.message, 'error');
    } finally {
      adminLoading.classList.add('hidden');
    }
  }

  /* ── 테이블 렌더링 ── */
  function renderTable(list) {
    if (!list || list.length === 0) {
      adminEmpty.classList.remove('hidden');
      return;
    }
    adminEmpty.classList.add('hidden');
    adminTableBody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${escHtml(item.name || '-')}</strong></td>
        <td>${escHtml(item.region || '-')}</td>
        <td>${escHtml(item.city || '-')}</td>
        <td>${escHtml(item.phone || '-')}</td>
        <td>
          <span class="status-badge ${item.is_active ? 'status-active' : 'status-inactive'}">
            ${item.is_active ? '활성' : '비활성'}
          </span>
        </td>
        <td>
          <button class="table-edit-btn" onclick="openEdit('${item.id}')">
            <i class="fa-solid fa-pen"></i> 수정
          </button>
          <button class="table-delete-btn" onclick="openDelete('${item.id}', '${escHtml(item.name || '')}')">
            <i class="fa-solid fa-trash"></i> 삭제
          </button>
        </td>
      </tr>
    `).join('');
  }

  /* ── 검색 필터 ── */
  adminSearch.addEventListener('input', () => {
    const q = adminSearch.value.trim().toLowerCase();
    const filtered = allData.filter(item =>
      (item.name   || '').toLowerCase().includes(q) ||
      (item.region || '').toLowerCase().includes(q) ||
      (item.city   || '').toLowerCase().includes(q)
    );
    renderTable(filtered);
  });

  /* ── 편집 모달 열기 (신규) ── */
  addNewBtn.addEventListener('click', () => {
    editingId = null;
    modalTitle.innerHTML = '<i class="fa-solid fa-plus"></i> 새 화장장 추가';
    clearForm();
    editModal.classList.remove('hidden');
  });

  /* ── 편집 모달 열기 (수정) ── */
  window.openEdit = function(id) {
    const item = allData.find(d => d.id === id);
    if (!item) return;
    editingId = id;
    modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 화장장 정보 편집';
    fillForm(item);
    editModal.classList.remove('hidden');
  };

  /* ── 폼 채우기 ── */
  function fillForm(item) {
    document.getElementById('fId').value              = item.id || '';
    document.getElementById('fName').value            = item.name || '';
    document.getElementById('fRegion').value          = item.region || '';
    document.getElementById('fCity').value            = item.city || '';
    document.getElementById('fPhone').value           = item.phone || '';
    document.getElementById('fAddress').value         = item.address || '';
    document.getElementById('fMapLink').value         = item.map_link || '';
    document.getElementById('fSourceUrl').value       = item.source_url || '';
    document.getElementById('fOperatingHours').value  = item.operating_hours || '';
    document.getElementById('fSchedule').value        = item.schedule || '';
    document.getElementById('fRequiredDocs').value    = item.required_docs || '';
    document.getElementById('fReservationInfo').value = item.reservation_info || '';
    document.getElementById('fFeeInfo').value         = item.fee_info || '';
    document.getElementById('fNotice').value          = item.notice || '';
    document.getElementById('fIsActive').checked      = item.is_active !== false;
  }

  /* ── 폼 초기화 ── */
  function clearForm() {
    document.getElementById('editForm').reset();
    document.getElementById('fIsActive').checked = true;
  }

  /* ── 저장 ── */
  editSaveBtn.addEventListener('click', async () => {
    const nameEl = document.getElementById('fName');
    if (!nameEl.value.trim()) {
      nameEl.focus();
      showToast('화장장 이름을 입력해주세요.', 'error');
      return;
    }
    const regionEl = document.getElementById('fRegion');
    if (!regionEl.value) {
      regionEl.focus();
      showToast('지역을 선택해주세요.', 'error');
      return;
    }

    const payload = {
      name:             document.getElementById('fName').value.trim(),
      region:           document.getElementById('fRegion').value,
      city:             document.getElementById('fCity').value.trim(),
      phone:            document.getElementById('fPhone').value.trim(),
      address:          document.getElementById('fAddress').value.trim(),
      map_link:         document.getElementById('fMapLink').value.trim(),
      source_url:       document.getElementById('fSourceUrl').value.trim(),
      operating_hours:  document.getElementById('fOperatingHours').value.trim(),
      schedule:         document.getElementById('fSchedule').value.trim(),
      required_docs:    document.getElementById('fRequiredDocs').value.trim(),
      reservation_info: document.getElementById('fReservationInfo').value.trim(),
      fee_info:         document.getElementById('fFeeInfo').value.trim(),
      notice:           document.getElementById('fNotice').value.trim(),
      is_active:        document.getElementById('fIsActive').checked,
    };

    editSaveBtn.disabled = true;
    editSaveBtn.textContent = '저장 중...';

    try {
      let res;
      if (editingId) {
        // 수정 (PUT)
        res = await fetch(`tables/${TABLE}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // 신규 (POST)
        res = await fetch(`tables/${TABLE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) throw new Error('저장 실패 (' + res.status + ')');

      editModal.classList.add('hidden');
      showToast(editingId ? '수정되었습니다.' : '새 화장장이 추가되었습니다.', 'success');
      await loadData();
    } catch(e) {
      showToast('오류: ' + e.message, 'error');
    } finally {
      editSaveBtn.disabled = false;
      editSaveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 저장';
    }
  });

  /* ── 편집 모달 닫기 ── */
  [editModalClose, editCancelBtn].forEach(el =>
    el.addEventListener('click', () => editModal.classList.add('hidden'))
  );
  editModal.addEventListener('click', e => {
    if (e.target === editModal) editModal.classList.add('hidden');
  });

  /* ── 삭제 모달 열기 ── */
  window.openDelete = function(id, name) {
    deletingId = id;
    deleteTargetName.textContent = name;
    deleteModal.classList.remove('hidden');
  };

  /* ── 삭제 확인 ── */
  deleteConfirmBtn.addEventListener('click', async () => {
    if (!deletingId) return;
    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = '삭제 중...';
    try {
      const res = await fetch(`tables/${TABLE}/${deletingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패 (' + res.status + ')');
      deleteModal.classList.add('hidden');
      showToast('삭제되었습니다.', 'success');
      await loadData();
    } catch(e) {
      showToast('오류: ' + e.message, 'error');
    } finally {
      deleteConfirmBtn.disabled = false;
      deleteConfirmBtn.innerHTML = '<i class="fa-solid fa-trash"></i> 삭제';
    }
  });

  /* ── 삭제 모달 닫기 ── */
  [deleteModalClose, deleteCancelBtn].forEach(el =>
    el.addEventListener('click', () => deleteModal.classList.add('hidden'))
  );
  deleteModal.addEventListener('click', e => {
    if (e.target === deleteModal) deleteModal.classList.add('hidden');
  });

  /* ── 토스트 ── */
  function showToast(msg, type='') {
    toastMsg.textContent = msg;
    toastMsg.className = 'toast-msg' + (type ? ` ${type}` : '');
    toastMsg.classList.remove('hidden');
    setTimeout(() => toastMsg.classList.add('hidden'), 3000);
  }

  /* ── HTML 이스케이프 ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── 초기화 ── */
  loadData();

})();
