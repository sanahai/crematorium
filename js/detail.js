/* =========================================
   detail.js – 화장장 상세 페이지 (로컬 JSON 연동)
   ========================================= */
(function() {
  'use strict';

  // 설정
  const DATA_PATH = './js/crematoriums.json';
  const DEATH_TYPES = ['병사', '외인사', '개장유골', '외국인'];

  // DOM 참조
  const loadingBox       = document.getElementById('loadingBox');
  const detailCard       = document.getElementById('detailCard');
  const docsChecklist    = document.getElementById('docsChecklist');
  const toastMsg         = document.getElementById('toastMsg');

  let currentItem = null;
  let currentDeathType = '병사';

  /* ── URL에서 id 파싱 ── */
  function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  /* ── 데이터 로드 (로컬 JSON 파일에서 특정 ID 찾기) ── */
  async function loadDetail(id) {
    try {
      // 1. 전체 데이터 파일 호출
      const res = await fetch(DATA_PATH);
      if (!res.ok) throw new Error('데이터 파일을 찾을 수 없습니다.');
      
      const json = await res.json();
      
      // 2. 전달받은 ID와 일치하는 항목 찾기
      const item = json.data.find(d => String(d.id) === String(id));
      
      if (!item) throw new Error('해당 화장장 정보를 찾을 수 없습니다.');
      
      currentItem = item;
      renderDetail(item);
    } catch(e) {
      console.error(e);
      loadingBox.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        <p>정보를 불러오지 못했습니다. <a href="index.html">목록으로 돌아가기</a></p>`;
    }
  }

  /* ── 상세 정보 렌더링 ── */
  function renderDetail(item) {
    document.title = `${item.name} – 상세 정보`;

    // 기본 정보 채우기
    document.getElementById('dRegion').textContent = item.region || '';
    document.getElementById('dName').textContent = item.name || '';
    document.getElementById('dAddress').textContent = item.address || '주소 정보 없음';
    
    const phoneEl = document.getElementById('dPhoneLink');
    if (phoneEl) {
      phoneEl.textContent = item.phone || '-';
      phoneEl.href = item.phone ? `tel:${item.phone.replace(/[^0-9]/g, '')}` : '#';
    }

    // 지도 링크 (카카오맵 검색 연결)
    const mapEl = document.getElementById('dMapLink');
    if (mapEl) {
      mapEl.href = `https://map.kakao.com/link/search/${encodeURIComponent(item.name)}`;
    }

    // 운영 시간 등 기타 정보
    const hoursEl = document.getElementById('dHours');
    if (hoursEl) hoursEl.textContent = item.operating_hours || '07:00 ~ 17:00';

    // 로딩 숨기고 카드 보이기
    loadingBox.classList.add('hidden');
    detailCard.classList.remove('hidden');
  }

  /* ── 탭 전환 로직 ── */
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
      const targetPanel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetPanel) targetPanel.classList.remove('hidden');
    });
  });

  /* ── HTML 이스케이프 ── */
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── 초기화 실행 ── */
  const id = getIdFromUrl();
  if (id) {
    loadDetail(id);
  } else {
    window.location.href = 'index.html';
  }

})();
