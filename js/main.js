(function() {
  'use strict';

  const cardGrid = document.getElementById('cardGrid');
  const loadingBox = document.getElementById('loadingBox');
  const emptyBox = document.getElementById('emptyBox');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const regionFilter = document.getElementById('regionFilter');
  const resultCount = document.getElementById('resultCount');

  let allData = [];
  let currentRegion = '전체';
  let currentSearch = '';

  async function loadData() {
    showState('loading');
    try {
      const res = await fetch('./js/crematoriums.json');
      const json = await res.json();
      allData = (json.data || []).filter(d => d.is_active !== false);
      renderCards(allData);
    } catch(e) {
      console.error(e);
      showState('empty');
    }
  }

  function filterAndRender() {
    const q = currentSearch.trim().toLowerCase();
    const filtered = allData.filter(item => {
      const matchRegion = currentRegion === '전체' || item.region === currentRegion;
      const matchSearch = !q || item.name.toLowerCase().includes(q) || item.address.toLowerCase().includes(q);
      return matchRegion && matchSearch;
    });
    renderCards(filtered);
  }

  function renderCards(list) {
    if (!list.length) { showState('empty'); resultCount.innerText = '0개 시설'; return; }
    showState('list');
    resultCount.innerHTML = `검색 결과 <strong>${list.length}</strong>개 시설`;
    cardGrid.innerHTML = list.map(item => `
      <article class="crematorium-card">
        <div class="card-top">
          <span class="card-region-badge">${item.region}</span>
          <h2 class="card-name">${item.name}</h2>
          <p class="card-address"><i class="fa-solid fa-location-dot"></i> ${item.address}</p>
        </div>
        <div class="card-body">
          <div class="card-info-row"><i class="fa-solid fa-clock"></i> <span>${item.operating_hours}</span></div>
          <div class="card-info-row"><i class="fa-solid fa-phone"></i> <span>${item.phone}</span></div>
        </div>
        <div class="card-footer">
          <button class="card-detail-btn" onclick="goDetail('${item.id}')">상세 정보 보기</button>
        </div>
      </article>
    `).join('');
  }

  window.goDetail = id => window.location.href = `detail.html?id=${encodeURIComponent(id)}`;

  function showState(state) {
    loadingBox.classList.toggle('hidden', state !== 'loading');
    emptyBox.classList.toggle('hidden', state !== 'empty');
  }

  searchInput.addEventListener('input', e => { currentSearch = e.target.value; filterAndRender(); });
  searchClearBtn.addEventListener('click', () => { searchInput.value = ''; currentSearch = ''; filterAndRender(); });
  regionFilter.addEventListener('click', e => {
    const btn = e.target.closest('.region-btn');
    if (!btn) return;
    regionFilter.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRegion = btn.dataset.region;
    filterAndRender();
  });

  loadData();
})();
