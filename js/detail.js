(function() {
  'use strict';

  const STORAGE_KEY = 'crematoriumDataOverride_v2';
  const KAKAO_JAVASCRIPT_KEY = '';
  const DEFAULT_TYPE = '병사';

  const loadingBox = document.getElementById('loadingBox');
  const detailCard = document.getElementById('detailCard');
  const toastMsg = document.getElementById('toastMsg');
  const docsChecklist = document.getElementById('docsChecklist');
  const docsMeta = document.getElementById('docsMeta');
  const kakaoModal = document.getElementById('kakaoModal');
  const modalFacilityInfo = document.getElementById('modalFacilityInfo');
  const modalDocsList = document.getElementById('modalDocsList');

  let currentItem = null;
  let currentType = DEFAULT_TYPE;
  let checkedDocs = new Set();

  initKakao();
  bindTabs();
  bindModal();
  bindDeathTypeButtons();
  loadDetail();

  function initKakao() {
    if (!window.Kakao) return;
    if (KAKAO_JAVASCRIPT_KEY && !window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JAVASCRIPT_KEY);
    }
  }

  async function loadDetail() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      location.href = 'index.html';
      return;
    }

    try {
      const data = await loadDataset();
      currentItem = (data.data || []).find(item => String(item.id) === String(id));
      if (!currentItem) throw new Error('대상 데이터를 찾지 못했습니다.');
      renderDetail(currentItem);
      loadingBox.classList.add('hidden');
      detailCard.classList.remove('hidden');
    } catch (error) {
      console.error(error);
      loadingBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>상세 정보를 불러오지 못했습니다.</p>';
    }
  }

  async function loadDataset() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) return JSON.parse(local);
    const res = await fetch('./js/crematoriums.json');
    return res.json();
  }

  function renderDetail(item) {
    setText('dName', item.name);
    setText('dRegion', item.region + (item.city ? ` · ${item.city}` : ''));
    setText('dAddress', item.address || '-');
    setText('dHours', item.operating_hours || '운영시간 확인 필요');
    setText('dHoursBadge', item.operating_hours || '운영시간 확인 필요');
    setText('dDuration', item.cremation_duration || '화장 소요시간 확인 필요');
    setText('dSummary', item.summary || '사망 유형별 필요서류를 먼저 확인하세요.');

    const phoneLink = document.getElementById('dPhoneLink');
    phoneLink.textContent = item.phone || '-';
    phoneLink.href = item.phone ? `tel:${String(item.phone).replace(/[^0-9]/g, '')}` : '#';

    const mapLink = document.getElementById('dMapLink');
    mapLink.href = item.map_link || buildMapSearchUrl(item.name, item.address);

    const sourceLink = document.getElementById('dSourceLink');
    if (item.source_url) {
      sourceLink.href = item.source_url;
      sourceLink.classList.remove('hidden');
    } else {
      sourceLink.classList.add('hidden');
    }

    const noticeWrap = document.getElementById('dNoticeWrap');
    if (item.notice) {
      noticeWrap.classList.remove('hidden');
      setHtml('dNotice', nl2br(escapeHtml(item.notice)));
    } else {
      noticeWrap.classList.add('hidden');
    }

    renderSchedule(item.schedule_slots || []);
    renderFee(item);
    setHtml('dReservation', renderInfoBlock(item.reservation_info));
    renderDocs(item, currentType);
  }

  function renderDocs(item, type) {
    currentType = type;
    const parsed = parseDocs(item.required_docs || '');
    const commonDocs = parsed['공통'] || [];
    const typeDocs = parsed[type] || [];
    const docs = [...commonDocs, ...typeDocs];

    docsMeta.innerHTML = `
      <span class="meta-chip">선택 유형: ${escapeHtml(type)}</span>
      <span class="meta-chip">공통 ${commonDocs.length}건</span>
      <span class="meta-chip">유형별 ${typeDocs.length}건</span>
    `;

    if (!docs.length) {
      docsChecklist.innerHTML = '<div class="info-card">등록된 필요서류가 없습니다.</div>';
      return;
    }

    docsChecklist.innerHTML = docs.map((doc, idx) => {
      const key = `${type}_${idx}_${doc}`;
      const checked = checkedDocs.has(key) ? 'checked' : '';
      return `
        <label class="doc-check-item ${checked ? 'checked' : ''}">
          <input type="checkbox" class="doc-check" data-key="${escapeAttr(key)}" ${checked}>
          <span>${escapeHtml(doc)}</span>
        </label>
      `;
    }).join('');
  }

  function renderSchedule(slots) {
    const wrap = document.getElementById('dScheduleTable');
    if (!slots.length) {
      wrap.innerHTML = '<div class="info-card">회차별 시간표 정보가 없습니다.</div>';
      return;
    }
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>회차</th><th>시간</th><th>비고</th></tr></thead>
        <tbody>
          ${slots.map(slot => `<tr><td>${escapeHtml(slot.label)}</td><td>${escapeHtml(slot.time)}</td><td>${escapeHtml(slot.note || '-')}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function renderFee(item) {
    setHtml('dFee', renderInfoBlock(item.fee_info));
    const wrap = document.getElementById('dFeeTable');
    if (!item.fee_table || !item.fee_table.length) {
      wrap.innerHTML = '';
      return;
    }
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>구분</th><th>금액</th></tr></thead>
        <tbody>
          ${item.fee_table.map(row => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td>${escapeHtml((row.prices || []).join(' / '))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(node => node.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(node => node.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
      });
    });
  }

  function bindDeathTypeButtons() {
    document.querySelectorAll('.dtype-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dtype-btn').forEach(node => node.classList.remove('active'));
        btn.classList.add('active');
        if (currentItem) renderDocs(currentItem, btn.dataset.type);
      });
    });

    docsChecklist.addEventListener('change', event => {
      const checkbox = event.target.closest('.doc-check');
      if (!checkbox) return;
      const container = checkbox.closest('.doc-check-item');
      if (checkbox.checked) checkedDocs.add(checkbox.dataset.key);
      else checkedDocs.delete(checkbox.dataset.key);
      container.classList.toggle('checked', checkbox.checked);
    });

    document.getElementById('kakaoShareBtn').addEventListener('click', openShareModal);
  }

  function bindModal() {
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalCopyText').addEventListener('click', copyShareText);
    document.getElementById('modalCopyLink').addEventListener('click', copyCurrentLink);
    document.getElementById('modalKakaoSend').addEventListener('click', shareToKakao);
    kakaoModal.addEventListener('click', event => {
      if (event.target === kakaoModal) closeModal();
    });
  }

  function openShareModal() {
    if (!currentItem) return;
    const docs = getCurrentDocs();
    modalFacilityInfo.innerHTML = `
      <p><strong>${escapeHtml(currentItem.name)}</strong></p>
      <p>${escapeHtml(currentType)} 기준</p>
      <p>${escapeHtml(currentItem.address || '-')}</p>
      <p>${escapeHtml(currentItem.phone || '-')}</p>
    `;
    modalDocsList.innerHTML = docs.map(doc => `<div class="modal-doc-item">• ${escapeHtml(doc)}</div>`).join('');
    kakaoModal.classList.remove('hidden');
  }

  function closeModal() {
    kakaoModal.classList.add('hidden');
  }

  function getCurrentDocs() {
    const parsed = parseDocs(currentItem?.required_docs || '');
    return [...(parsed['공통'] || []), ...(parsed[currentType] || [])];
  }

  function buildShareText() {
    const docs = getCurrentDocs();
    return [
      `[${currentItem.name}] ${currentType} 기준 필요서류`,
      `주소: ${currentItem.address || '-'}`,
      `전화: ${currentItem.phone || '-'}`,
      `운영시간: ${currentItem.operating_hours || '확인 필요'}`,
      `화장 소요: ${currentItem.cremation_duration || '확인 필요'}`,
      '',
      '준비서류',
      ...docs.map(doc => `- ${doc}`),
      '',
      '예약 및 최종 확인: e하늘 또는 시설 문의',
      `${location.href}`
    ].join('\n');
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(buildShareText());
      showToast('공유 문구를 복사했습니다.');
    } catch (error) {
      console.error(error);
      showToast('복사에 실패했습니다.');
    }
  }

  async function copyCurrentLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast('상세 링크를 복사했습니다.');
    } catch (error) {
      console.error(error);
      showToast('링크 복사에 실패했습니다.');
    }
  }

  async function shareToKakao() {
    const shareText = buildShareText();
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'text',
        text: shareText,
        link: {
          mobileWebUrl: location.href,
          webUrl: location.href
        }
      });
      showToast('카카오톡 공유창을 열었습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('카카오 키가 없어 공유 문구를 복사했습니다. 카카오톡에 붙여넣어 보내세요.');
    } catch (error) {
      console.error(error);
      showToast('공유 문구 복사에 실패했습니다.');
    }
  }

  function parseDocs(raw) {
    const result = { 공통: [], 병사: [], 외인사: [], 개장유골: [], 외국인: [] };
    if (!raw) return result;
    const parts = raw.split(/\n\s*\[(공통|병사|외인사|개장유골|외국인)\]\s*/).slice(1);
    if (!parts.length) {
      result.공통 = raw.split('\n').map(line => line.trim()).filter(Boolean);
      return result;
    }
    for (let i = 0; i < parts.length; i += 2) {
      const key = parts[i];
      const lines = (parts[i + 1] || '')
        .split('\n')
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);
      result[key] = lines;
    }
    return result;
  }

  function renderInfoBlock(text) {
    if (!text) return '<div class="info-card">정보가 없습니다.</div>';
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    return `<div class="info-card">${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}</div>`;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value ?? '';
  }

  function setHtml(id, value) {
    document.getElementById(id).innerHTML = value;
  }

  function buildMapSearchUrl(name, address) {
    const q = encodeURIComponent(`${name || ''} ${address || ''}`.trim());
    return `https://map.kakao.com/link/search/${q}`;
  }

  function nl2br(text) {
    return String(text).replace(/\n/g, '<br>');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }

  function showToast(message) {
    toastMsg.textContent = message;
    toastMsg.classList.remove('hidden');
    setTimeout(() => toastMsg.classList.add('hidden'), 2600);
  }
})();
