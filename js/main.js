/* =========================================
   main.js – 화장장 목록 페이지 (로컬 JSON 연동)
   ========================================= */
(function() {
  'use strict';

  // DOM 참조
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

  /* ── 데이터 로드 (프로젝트 내 JSON 파일 읽기) ── */
  async function loadData() {
    showState('loading');
    try {
      // 1. 같은 저장소 내의 json 파일 경로 호출
      const res = await fetch('./js/crematoriums.json');
      
      if (!res.ok) {
        throw new Error('데이터 파일을 찾을 수 없습니다 (404).');
      }
      
      const json = await res.json();
      
      // 2. JSON 데이터 저장 (is_active가 true인 것만 필터링)
      allData = (json.data || []).filter(d => d.is_active !== false);
      
      // 3. 화면에 그리기
      renderCards(allData);
    } catch(e) {
      console.error("데이터 로드 실패:", e);
      showState('empty');
    }
  }

  /* ── 필터 + 검색 로직 ── */
  function filterAndRender() {
    const q = currentSearch.trim().toLowerCase();
    const filtered = allData.filter(item => {
      // 지역 필터 확인
      const matchRegion = currentRegion === '전체' || item.region.includes(currentRegion);
      // 검색어 확인 (이름, 지역, 시군구, 주소 포함 여부)
      const matchSearch = !q ||
        (item.name    || '').toLowerCase().includes(q) ||
        (item.region  || '').toLowerCase().includes(q) ||
        (item.city    || '').toLowerCase().includes(q) ||
        (item.address || '').toLowerCase().includes(q);
        
      return matchRegion && matchSearch;
    });
    renderCards(filtered);
  }

  /* ── 카드 HTML 렌더링 ── */
  function renderCards(list) {
    if (!list || list.length === 0) {
      showState('empty');
      resultCount.innerHTML = `검색 결과 <strong>0</strong>개`;
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
            <span>${escHtml(item.operating_hours || '정보 없음')}</span>
          </div>
          <div class="card-info-row">
            <i class="fa-solid fa-phone"></i>
            <span>${escHtml(item.phone || '-')}</span>
          </div>
          <div class="card-info-row">
            <i class="fa-solid fa-calendar-check"></i>
            <span>e하늘 장사정보시스템 예약 필요</span>
          </div>
        </div>
        <div class="card-footer">
          <button class="card-detail-btn" onclick="goDetail('${item.id}')">
            <i class="fa-solid fa-circle-info"></i> 상세 정보 보기
          </button>
        </div>
      </article>
    `).join('');
  }

  /* ── 상세 페이지 이동 ── */
  window.goDetail = function(id) {
    // 상세 페이지 URL에 ID를 파라미터로 전달
    window.location.href = `detail.html?id=${encodeURIComponent(id)}`;
  };

  /* ── 화면 상태 제어 (로딩, 빈 화면 등) ── */
  function showState(state) {
    loadingBox.classList.add('hidden');
    emptyBox.classList.add('hidden');
    
    if (state === 'loading') {
      loadingBox.classList.remove('hidden');
      cardGrid.innerHTML = '';
    } else if (state === 'empty') {
      emptyBox.classList.remove('hidden');
      cardGrid.innerHTML = '';
    }
  }

  /* ── 보안을 위한 HTML 이스케이프 ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ── 이벤트 설정 ── */
  // 1. 검색창 입력
  searchInput.addEventListener('input', e => {
    currentSearch = e.target.value;
    filterAndRender();
  });

  // 2. 검색어 삭제 버튼
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    filterAndRender();
  });

  // 3. 지역 필터 버튼 클릭
  regionFilter.addEventListener('click', e => {
    const btn = e.target.closest('.region-btn');
    if (!btn) return;
    
    // 버튼 활성화 스타일 변경
    regionFilter.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    currentRegion = btn.dataset.region;
    filterAndRender();
  });

  /* ── 실행 ── */
  loadData();

})();
