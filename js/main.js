/* =========================================
   main.js – 화장장 목록 페이지 (실시간 API 연동)
   ========================================= */
(function() {
  'use strict';

  // DOM refs
  const cardGrid      = document.getElementById('cardGrid');
  const loadingBox    = document.getElementById('loadingBox');
  const emptyBox      = document.getElementById('emptyBox');
  const searchInput   = document.getElementById('searchInput');
  const searchClearBtn= document.getElementById('searchClearBtn');
  const regionFilter  = document.getElementById('regionFilter');
  const resultCount   = document.getElementById('resultCount');

  let allData     = [];
  let currentRegion = '전체';
  let currentSearch = '';

  /* ── 데이터 로드 (공공데이터 API 연결) ── */
  async function loadData() {
    showState('loading');
    try {
      // 1. 인증키 및 URL 설정 (스크린샷 기반)
      const API_KEY = 'a4bea687508507ebfe11d5215e2467d19b58c78e2a50667f9a4b19fb3e7de0c8'; 
      const API_URL = `https://apis.data.go.kr/1352000/ODMS_DATA_05_1/call73756f70?serviceKey=${API_KEY}&type=json&numOfRows=100`;

      // 2. API 호출
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('API 호출 실패');
      
      const json = await res.json();
      
      // 3. API 응답 구조에 따른 데이터 추출
      const rawItems = json.response?.body?.items || [];
      
      // 4. 기존 앱 형식에 맞게 데이터 변환 (매핑)
      allData = rawItems.map((item, index) => ({
        id: item.facltNm || index.toString(), // 시설명을 ID로 사용
        name: item.facltNm,                  // 시설명
        region: item.ctprvnNm,               // 시도
        city: item.signguNm,                 // 시군구
        address: item.roadNmAddr,            // 도로명주소
        phone: item.telno,                   // 전화번호
        operating_hours: "07:00 ~ 17:00",    // 고정값 (필요시 수정)
        is_active: true
      }));

      renderCards(allData);
    } catch(e) {
      console.error("데이터 로드 실패:", e);
      showState('empty');
    }
  }

  /* ── 필터 + 검색 ── */
  function filterAndRender() {
    const q = currentSearch.trim().toLowerCase();
    const filtered = allData.filter(item => {
      const matchRegion = currentRegion === '전체' || item.region === currentRegion;
      const matchSearch = !q ||
        (item.name    || '').toLowerCase().includes(q) ||
        (item.region  || '').toLowerCase().includes(q) ||
        (item.city    || '').toLowerCase().includes(q) ||
        (item.address || '').toLowerCase().includes(q);
      return matchRegion && matchSearch;
    });
    renderCards(filtered);
  }

  /* ── 카드 렌더링 ── */
  function renderCards(list) {
    if (!list || list.length === 0) {
      showState('empty');
      resultCount.innerHTML = `전체 <strong>0</strong>개 시설`;
      return;
    }
    showState('list');
    resultCount.innerHTML = `전체 <strong>${list.length}</strong>개 시설`;

    cardGrid.innerHTML = list.map(item => `
      <article class="crematorium-card" data-id="${item.id}">
        <div class="card-top">
          <span class="card-region-badge">${escHtml(item.region || '')}</span>
          <h2 class="card-name">${escHtml(item.name || '')}</h2>
          <p class="card-address">
            <i class="fa-solid fa-location-dot"></i>
            ${escHtml(item.address || '주소 정보 없음')}
          </p>
        </div>
        <div class="card-body">
          <div class="card-info-row">
            <i class="fa-solid fa-clock"></i>
            <span>${escHtml(item.operating_hours || '운영시간 정보 없음')}</span>
          </div>
          <div class="card-info-row">
            <i class="fa-solid fa-phone"></i>
            <span>${escHtml(item.phone || '-')}</span>
          </div>
          <div class="card-info-row">
            <i class="fa-solid fa-calendar-check"></i>
            <span>e하늘 장사정보시스템 예약</span>
          </div>
        </div>
        <div class="card-footer">
          <button class="card-detail-btn" onclick="goDetail('${item.id}')">
            <i class="fa-solid fa-circle-info"></i> 상세 정보
          </button>
        </div>
      </article>
    `).join('');
  }

  /* ── 상세 이동 ── */
  window.goDetail = function(id) {
    window.location.href = `detail.html?id=${encodeURIComponent(id)}`;
  };

  /* ── 상태 표시 ── */
  function showState(state) {
    loadingBox.classList.add('hidden');
    emptyBox.classList.add('hidden');
    if (state === 'loading') {
        loadingBox.classList.remove('hidden');
        cardGrid.innerHTML = '';
    }
    else if (state === 'empty') {
        emptyBox.classList.remove('hidden');
        cardGrid.innerHTML = '';
    }
  }

  /* ── HTML 이스케이프 ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── 이벤트 리스너 ── */
  searchInput.addEventListener('input', e => {
    currentSearch = e.target.value;
    filterAndRender();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    filterAndRender();
  });

  regionFilter.addEventListener('click', e => {
    const btn = e.target.closest('.region-btn');
    if (!btn) return;
    regionFilter.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRegion = btn.dataset.region;
    filterAndRender();
  });

  /* ── 초기화 실행 ── */
  loadData();

})();
