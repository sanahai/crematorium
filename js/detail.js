(function() {
  'use strict';

  const loadingBox = document.getElementById('loadingBox');
  const detailCard = document.getElementById('detailCard');

  async function loadDetail() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { window.location.href = 'index.html'; return; }

    try {
      const res = await fetch('./js/crematoriums.json');
      const json = await res.json();
      const item = json.data.find(d => String(d.id) === String(id));

      if (!item) throw new Error('Not Found');

      // 상단 기본 정보
      document.getElementById('dName').textContent = item.name;
      document.getElementById('dRegion').textContent = item.region;
      document.getElementById('dAddress').textContent = item.address;
      document.getElementById('dPhoneLink').textContent = item.phone;
      document.getElementById('dPhoneLink').href = `tel:${item.phone.replace(/[^0-9]/g, '')}`;

      // 홈페이지 버튼 연결
      const srcEl = document.getElementById('dSourceLink');
      if (item.source_url) {
        srcEl.href = item.source_url;
        srcEl.style.display = 'inline-block';
      } else {
        srcEl.style.display = 'none';
      }

      // 공지사항
      if (item.notice) {
        document.getElementById('dNoticeWrap').classList.remove('hidden');
        document.getElementById('dNotice').textContent = item.notice;
      }

      // 상세 탭 데이터 (줄바꿈 유지를 위해 innerText 사용)
      document.getElementById('docsChecklist').innerText = item.required_docs || '정보 없음';
      document.getElementById('dScheduleTable').innerText = item.schedule || '정보 없음';
      document.getElementById('dReservation').innerText = item.reservation_info || '정보 없음';
      document.getElementById('dFee').innerText = item.fee_info || '정보 없음';

      loadingBox.classList.add('hidden');
      detailCard.classList.remove('hidden');
    } catch(e) {
      console.error(e);
      loadingBox.innerHTML = '<p>정보를 불러올 수 없습니다. <a href="index.html">목록으로</a></p>';
    }
  }

  // 탭 전환 이벤트
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    });
  });

  loadDetail();
})();
