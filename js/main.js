/* =========================================
   main.js – 화장장 목록 페이지
   ========================================= */
(function() {
  'use strict';

  const TABLE = 'crematoriums';
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
    const API_KEY = 'a4bea687508507ebfe11d5215e2467d19b58c78e2a50667f9a4b19fb3e7de0c8'; // 발급받은 Decoding 인증키 입력
    const API_URL = `https://apis.data.go.kr/1352000/ODMS_DATA_05_1/call73756f70?serviceKey=${API_KEY}&type=json&numOfRows=100`;

    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('API 호출 실패');
    
    const json = await res.json();
    
    // 공공데이터 포털의 일반적인 데이터 구조 (필드명은 실제 API 가이드를 참조하여 매핑 필요)
    // 데이터가 items 안에 배열로 들어오는 경우가 많습니다.
    const rawItems = json.response?.body?.items || [];
    
    allData = rawItems.map((item, index) => ({
      id: item.facltNm || index.toString(), // 화장장 명칭을 ID 대용으로 사용하거나 인덱스 사용
      name: item.facltNm,                  // 시설명
      region: item.ctprvnNm,               // 시도
      city: item.signguNm,                 // 시군구
      address: item.roadNmAddr,            // 도로명주소
      phone: item.telno,                   // 전화번호
      operating_hours: "07:00 ~ 17:00",    // API에 없다면 고정값
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
          <button class="card-kakao-btn" onclick="quickKakao(event, '${item.id}')">
            <i class="fa-brands fa-square-kakao"></i> 카카오 공유
          </button>
        </div>
      </article>
    `).join('');
  }

  /* ── 상세 이동 ── */
  window.goDetail = function(id) {
    window.location.href = `detail.html?id=${id}`;
  };

  /* ── 목록에서 빠른 카카오 공유 ── */
  window.quickKakao = function(e, id) {
    e.stopPropagation();
    const item = allData.find(d => d.id === id);
    if (!item) return;
    sendKakaoShare(item, '병사');
  };

  /* ── 카카오 공유 ── */
  function sendKakaoShare(item, deathType) {
    const docs = parseDocsByType(item.required_docs || '', deathType);
    const docsText = docs.map((d,i) => `${i+1}. ${d}`).join('\n');

    const title = `📍 화장장 안내: ${item.name}`;
    const description =
      `📌 주소: ${item.address || '-'}\n` +
      `📞 전화: ${item.phone || '-'}\n` +
      `⏰ 운영: ${item.operating_hours || '-'}\n\n` +
      `【${deathType} 사망 시 필요 서류】\n${docsText}\n\n` +
      `📋 예약: e하늘 장사정보시스템 (www.15774129.go.kr)`;

    const url = window.location.origin + '/detail.html?id=' + item.id;

    if (window.Kakao && Kakao.isInitialized()) {
      try {
        Kakao.Share.sendDefault({
          objectType: 'text',
          text: `${title}\n\n${description}`,
          link: { mobileWebUrl: url, webUrl: url }
        });
        return;
      } catch(err) { /* fallback */ }
    }
    // fallback: 카카오 앱 딥링크
    const encodedText = encodeURIComponent(`${title}\n\n${description}`);
    const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?text=${encodedText}`;
    fallbackShare(title, description, kakaoUrl, url);
  }

  /* ── 공유 fallback (복사 + 새창) ── */
  function fallbackShare(title, text, kakaoUrl, pageUrl) {
    const fullText = `${title}\n\n${text}`;
    navigator.clipboard.writeText(fullText).then(() => {
      if (confirm('카카오톡 앱이 초기화되지 않아 텍스트를 클립보드에 복사했습니다.\n카카오톡을 열어 붙여넣기 하시겠습니까?')) {
        window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(pageUrl)}`, '_blank');
      }
    }).catch(() => {
      alert('공유 텍스트:\n\n' + fullText);
    });
  }

  /* ── 서류 파싱 ── */
  function parseDocsByType(raw, type) {
    const lines = raw.split(/[\n,|]+/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return ['사망진단서(시체검안서) 원본 1부', '신청인 신분증'];

    // 타입별 키워드 매핑
    const typeMap = {
      '병사':   ['병사', '일반', '사망진단서'],
      '외인사': ['외인사', '사고사', '검사지휘서', '외인', '기타'],
      '개장유골':['개장', '유골', '개장신고'],
      '외국인': ['외국인', '국내거소', '외국인등록']
    };
    const keywords = typeMap[type] || [];

    // 선택된 타입에 관련된 줄만 필터
    let filtered = lines.filter(line =>
      keywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
    );
    if (filtered.length === 0) filtered = lines.slice(0, 4); // fallback

    // 공통 서류 추가
    const common = ['신청인 신분증'];
    const all = [...new Set([...filtered, ...common])];
    return all;
  }

  /* ── 상태 표시 ── */
  function showState(state) {
    loadingBox.classList.add('hidden');
    emptyBox.classList.add('hidden');
    cardGrid.innerHTML = '';
    if (state === 'loading') loadingBox.classList.remove('hidden');
    else if (state === 'empty') emptyBox.classList.remove('hidden');
    // 'list' → 아무것도 안 함 (cardGrid가 채워짐)
  }

  /* ── HTML 이스케이프 ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── 이벤트 ── */
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

  // 카드 클릭 → 상세 이동 (버튼 제외)
  cardGrid.addEventListener('click', e => {
    const card = e.target.closest('.crematorium-card');
    if (!card) return;
    if (e.target.closest('button')) return;
    goDetail(card.dataset.id);
  });

  /* ── 초기화 ── */
  loadData();

})();
