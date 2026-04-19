(function() {
  'use strict';

  // DOM 요소 참조
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

  // 1. 데이터 불러오기
  async function loadData() {
    showState('loading');
    try {
      // json 파일 경로 확인 필수 (./js/crematoriums.json)
      const res = await fetch('./js/crematoriums.json');
      if (!res.ok) throw new Error('데이터 파일을 불러올 수 없습니다.');
      
      const json = await res.json();
      allData = (json.data || []).filter(item => item.is_active !== false);
      
      renderCards(allData);
    } catch (e) {
      console.error('데이터 로드 에러:', e);
      showState('empty');
      resultCount.innerText = '데이터를 불러오는 데 실패했습니다.';
    }
  }

  // 2. 필터링 및 검색 적용
  function filterAndRender() {
    const q = currentSearch.trim().toLowerCase();
    
    const filtered = allData.filter(item => {
      // 지역 필터 (정확히 일치하거나 '전체')
      const matchRegion = (currentRegion === '전체' || item.region === currentRegion);
      
      // 검색 필터 (이름 또는 주소에 포함 여부)
      const matchSearch = !q || 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.address && item.address.toLowerCase().includes(q));
      
      return matchRegion && matchSearch;
    });

    renderCards(filtered);
  }

  // 3. 카드 화면에 그리기
  function renderCards(list) {
    cardGrid.innerHTML = '';
    
    if (list.length === 0) {
      showState('empty');
      resultCount.innerHTML = '검색 결과 <strong>0</strong>건';
      return;
    }

    showState('list');
    resultCount.innerHTML = `검색 결과 <strong>${list.length}</strong>건`;

    list.forEach(item => {
      const card = document.createElement('article');
      card.className = 'crematorium-card';
      card.innerHTML = `
        <div class="card-top">
          <span class="card-region-badge">${item.region}</span>
          <h2 class="card-name">${item.name}</h2>
          <p class="card-address"><i class="fa-solid fa-location-dot"></i> ${item.address}</p>
        </div>
        <div class="card-body">
          <div class="card-info-row">
            <i class="fa-solid fa-clock"></i>
            <span>${item.operating_hours || '정보 없음'}</span>
          </div>
          <div class="card-info-row">
            <i class="fa-solid fa-phone"></i>
            <span>${item.phone || '정보 없음'}</span>
          </div>
        </div>
        <div class="card-footer">
          <button class="card-detail-btn" onclick="goDetail('${item.id}')">상세 정보 보기</button>
        </div>
      `;
      cardGrid.appendChild(card);
    });
  }

  // 4. 상세 페이지 이동
  window.goDetail = function(id) {
    location.href = `detail.html?id=${encodeURIComponent(id)}`;
  };

  // 5. 화면 상태 제어 (로딩, 데이터 없음 등)
  function showState(state) {
    loadingBox.classList.add('hidden');
    emptyBox.classList.add('hidden');
    cardGrid.classList.add('hidden');

    if (state === 'loading') {
      loadingBox.classList.remove('hidden');
    } else if (state === 'empty') {
      emptyBox.classList.remove('hidden');
    } else if (state === 'list') {
      cardGrid.classList.remove('hidden');
    }
  }

  // 6. 이벤트 리스너
  // 검색어 입력 시
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    filterAndRender();
  });

  // 검색어 삭제 버튼
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    filterAndRender();
  });

  // 지역 필터 버튼 클릭 시
  regionFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.region-btn');
    if (!btn) return;

    // 활성화 버튼 표시 변경
    regionFilter.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentRegion = btn.dataset.region;
    filterAndRender();
  });

  // 초기 실행
  loadData();

})();
