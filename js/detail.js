(function() {
  'use strict';

  const loadingBox = document.getElementById('loadingBox');
  const detailCard = document.getElementById('detailCard');

  async function loadDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { window.location.href = 'index.html'; return; }

    try {
      const res = await fetch('./js/crematoriums.json');
      const json = await res.json();
      const item = json.data.find(d => String(d.id) === String(id));

      if (!item) throw new Error('정보 없음');

      // 상단 정보
      document.getElementById('dName').textContent = item.name;
      document.getElementById('dRegion').textContent = item.region;
      document.getElementById('dAddress').textContent = item.address;
      
      const phoneLink = document.getElementById('dPhoneLink');
      phoneLink.textContent = item.phone;
      phoneLink.href = `tel:${item.phone.replace(/[^0-9]/g, '')}`;

      // 공지사항
      const dNotice = document.getElementById('dNotice');
      if (item.notice) {
        document.getElementById('dNoticeWrap').classList.remove('hidden');
        dNotice.textContent = item.notice;
      }

      // 탭 데이터 연결 (innerText를 써야 줄바꿈이 유지됩니다)
      document.getElementById('docsChecklist').innerText = item.required_docs || '등록된 정보가 없습니다.';
      document.getElementById('dScheduleTable').innerText = item.schedule || '등록된 정보가 없습니다.';
      document.getElementById('dReservation').innerText = item.reservation_info || '등록된 정보가 없습니다.';
      document.getElementById('dFee').innerText = item.fee_info || '등록된 정보가 없습니다.';

      loadingBox.classList.add('hidden');
      detailCard.classList.remove('hidden');
    } catch(e) {
      console.error(e);
      loadingBox.innerHTML = '<p>정보를 불러올 수 없습니다. <a href="index.html">목록으로 이동</a></p>';
    }
  }

  // 탭 클릭 이벤트
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.remove('hidden');
    });
  });

  loadDetail();
})();
