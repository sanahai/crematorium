(function() {
  'use strict';

  const STORAGE_KEY = 'crematoriumDataOverride_v2';
  const cardGrid = document.getElementById('cardGrid');
  const loadingBox = document.getElementById('loadingBox');
  const emptyBox = document.getElementById('emptyBox');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const regionFilter = document.getElementById('regionFilter');
  const resultCount = document.getElementById('resultCount');
  const toastMsg = document.getElementById('toastMsg');

  let allData = [];
  let currentRegion = '전체';
  let currentSearch = '';

  async function loadData() {
    showState('loading');
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        allData = (parsed.data || []).filter(item => item.is_active !== false);
      } else {
        const res = await fetch('./js/crematoriums.json');
        const json = await res.json();
        allData = (json.data || []).filter(item => item.is_active !== false);
      }
      filterAndRender();
    } catch (error) {
      console.error(error);
      showState('empty');
      resultCount.textContent = '데이터를 불러오지 못했습니다.';
    }
  }

  function filterAndRender() {
    const q = currentSearch.trim().toLowerCase();
    const filtered = allData.filter(item => {
      const haystack = [item.name, item.region, item.city, item.address].filter(Boolean).join(' ').toLowerCase();
      const matchRegion = currentRegion === '전체' || item.region === currentRegion;
      const matchSearch = !q || haystack.includes(q);
      return matchRegion && matchSearch;
    });
    renderCards(filtered);
  }

  function renderCards(list) {
    cardGrid.innerHTML = '';
    if (!list.length) {
      showState('empty');
      resultCount.innerHTML = '검색 결과 <strong>0건</strong>';
      return;
    }
    showState('list');
    resultCount.innerHTML = `검색 결과 <strong>${list.length}건</strong>`;

    list.forEach(item => {
      const feePreview = item.fee_table && item.fee_table.length
        ? item.fee_table[0].prices.join(' / ')
        : (item.fee_info || '요금 확인 필요');

      const card = document.createElement('article');
      card.className = 'crematorium-card';
      card.innerHTML = `
        <div class="card-top">
          <span class="card-region-badge">${escapeHtml(item.region)}${item.city ? ` · ${escapeHtml(item.city)}` : ''}</span>
          <h2 class="card-name">${escapeHtml(item.name)}</h2>
          <p class="card-address"><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(item.address || '-')}</span></p>
        </div>
        <div class="card-body">
          <div class="card-info-row"><i class="fa-regular fa-clock"></i><span>${escapeHtml(item.operating_hours || '운영시간 확인 필요')}</span></div>
          <div class="card-info-row"><i class="fa-solid fa-hourglass-half"></i><span>${escapeHtml(item.cremation_duration || '화장 소요시간 확인 필요')}</span></div>
          <div class="card-info-row"><i class="fa-solid fa-won-sign"></i><span>${escapeHtml(feePreview)}</span></div>
          <div class="card-info-row"><i class="fa-solid fa-phone"></i><span>${escapeHtml(item.phone || '-')}</span></div>
        </div>
        <div class="card-footer two-actions">
          <button class="card-detail-btn" data-id="${escapeHtml(item.id)}">상세 보기</button>
          <button class="card-kakao-btn" data-id="${escapeHtml(item.id)}"><i class="fa-brands fa-square-kakao"></i> 서류 공유</button>
        </div>
      `;
      cardGrid.appendChild(card);
    });
  }

  function buildQuickShareText(item) {
    const commonDocs = extractCommonDocs(item.required_docs).slice(0, 4);
    const detailUrl = `${location.origin}${location.pathname.replace(/index\.html$/, '')}detail.html?id=${encodeURIComponent(item.id)}`;
    return [
      `[${item.name}]`,
      `주소: ${item.address || '-'}`,
      `전화: ${item.phone || '-'}`,
      `운영시간: ${item.operating_hours || '확인 필요'}`,
      `대표 필요서류:`,
      ...commonDocs.map(doc => `- ${doc}`),
      `상세 확인: ${detailUrl}`
    ].join('\n');
  }

  function extractCommonDocs(rawText) {
    if (!rawText) return ['상세 페이지에서 사망 유형을 선택해 확인해 주세요.'];
    const blocks = rawText.split(/\n\s*\[(.+?)\]\s*/).slice(1);
    const map = {};
    for (let i = 0; i < blocks.length; i += 2) {
      map[blocks[i]] = (blocks[i + 1] || '').split('\n').map(v => v.trim()).filter(Boolean);
    }
    return map['공통'] || Object.values(map)[0] || ['상세 페이지에서 사망 유형을 선택해 확인해 주세요.'];
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

  function showToast(message) {
    toastMsg.textContent = message;
    toastMsg.classList.remove('hidden');
    setTimeout(() => toastMsg.classList.add('hidden'), 2200);
  }

  function showState(state) {
    loadingBox.classList.toggle('hidden', state !== 'loading');
    emptyBox.classList.toggle('hidden', state !== 'empty');
    cardGrid.classList.toggle('hidden', state !== 'list');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  searchInput.addEventListener('input', event => {
    currentSearch = event.target.value;
    filterAndRender();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    filterAndRender();
  });

  regionFilter.addEventListener('click', event => {
    const btn = event.target.closest('.region-btn');
    if (!btn) return;
    regionFilter.querySelectorAll('.region-btn').forEach(node => node.classList.remove('active'));
    btn.classList.add('active');
    currentRegion = btn.dataset.region;
    filterAndRender();
  });

  cardGrid.addEventListener('click', async event => {
    const detailBtn = event.target.closest('.card-detail-btn');
    const shareBtn = event.target.closest('.card-kakao-btn');
    if (detailBtn) {
      location.href = `detail.html?id=${encodeURIComponent(detailBtn.dataset.id)}`;
      return;
    }
    if (shareBtn) {
      const item = allData.find(entry => entry.id === shareBtn.dataset.id);
      if (!item) return;
      try {
        await copyText(buildQuickShareText(item));
        showToast('공유 문구를 복사했습니다. 카카오톡에 붙여넣어 보내세요.');
      } catch (error) {
        console.error(error);
        showToast('복사에 실패했습니다.');
      }
    }
  });

  loadData();
})();
