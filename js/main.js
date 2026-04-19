(function() {
  'use strict';

  const STORAGE_KEY = 'crematoriumData';
  const cardGrid = document.getElementById('cardGrid');
  const loadingBox = document.getElementById('loadingBox');
  const emptyBox = document.getElementById('emptyBox');
  const resultCount = document.getElementById('resultCount');
  const summaryStrip = document.getElementById('summaryStrip');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const regionFilter = document.getElementById('regionFilter');

  let allData = [];
  let currentRegion = '전체';

  async function loadData() {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        allData = JSON.parse(local);
      } else {
        const res = await fetch('./js/crematoriums.json');
        const json = await res.json();
        allData = json.data || [];
      }
      applyFilters();
    } catch (error) {
      loadingBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>데이터를 불러오지 못했습니다.</p>';
    }
  }

  function applyFilters() {
    const keyword = (searchInput.value || '').trim().toLowerCase();
    const filtered = allData.filter(item => {
      if (item.is_active === false) return false;
      const matchesRegion = currentRegion === '전체' || item.region === currentRegion;
      const searchTarget = [item.name, item.address, item.city, item.region].join(' ').toLowerCase();
      return matchesRegion && searchTarget.includes(keyword);
    });
    renderSummary(filtered);
    renderCards(filtered);
  }

  function renderSummary(list) {
    resultCount.innerHTML = `<strong>${list.length}개</strong> 시설이 검색되었습니다.`;
    const regions = [...new Set(list.map(item => item.region))];
    summaryStrip.innerHTML = `
      <span><i class="fa-regular fa-map"></i> 선택 지역: ${currentRegion}</span>
      <span><i class="fa-regular fa-building"></i> 표시 지역 수: ${regions.length}</span>
      <span><i class="fa-regular fa-share-from-square"></i> 상세 페이지에서 카카오 전송 가능</span>
    `;
  }

  function renderCards(list) {
    loadingBox.classList.add('hidden');
    if (!list.length) {
      cardGrid.classList.add('hidden');
      emptyBox.classList.remove('hidden');
      return;
    }
    emptyBox.classList.add('hidden');
    cardGrid.classList.remove('hidden');
    cardGrid.innerHTML = list.map(item => {
      const docsCount = countDocs(item.required_docs);
      return `
        <article class="facility-card">
          <div class="facility-card-top">
            <div class="card-badge-row">
              <span class="card-region-badge">${escapeHtml(shortRegion(item.region))}</span>
              <span class="mini-tag">${escapeHtml(item.city || '지역안내')}</span>
            </div>
            <h3 class="card-name">${escapeHtml(item.name)}</h3>
            <p class="card-address"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.address || '-')}</p>
          </div>
          <div class="facility-card-body">
            <div class="card-info-row"><i class="fa-regular fa-clock"></i><span>${escapeHtml(item.operating_hours || '운영시간 문의')}</span></div>
            <div class="card-info-row"><i class="fa-solid fa-hourglass-half"></i><span>${escapeHtml(item.duration || '소요시간 문의')}</span></div>
            <div class="card-info-row"><i class="fa-solid fa-file-lines"></i><span>사망 유형별 서류 ${docsCount}개 묶음</span></div>
            <div class="card-info-row"><i class="fa-solid fa-phone"></i><span>${escapeHtml(item.phone || '-')}</span></div>
          </div>
          <div class="facility-card-footer">
            <a class="ghost-btn" href="detail.html?id=${encodeURIComponent(item.id)}#share"><i class="fa-solid fa-comment"></i> 서류 보내기</a>
            <a class="solid-btn" href="detail.html?id=${encodeURIComponent(item.id)}">상세보기</a>
          </div>
        </article>
      `;
    }).join('');
  }

  function countDocs(docs) {
    if (!docs || typeof docs !== 'object') return 0;
    return Object.values(docs).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
  }

  function shortRegion(region) {
    return region.replace('특별시','').replace('광역시','').replace('특별자치시','').replace('도','');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  searchInput.addEventListener('input', applyFilters);
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
    searchInput.focus();
  });

  regionFilter.addEventListener('click', (event) => {
    const btn = event.target.closest('.region-btn');
    if (!btn) return;
    currentRegion = btn.dataset.region;
    document.querySelectorAll('.region-btn').forEach(node => node.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });

  loadData();
})();
