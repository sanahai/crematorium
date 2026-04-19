(function() {
  'use strict';
  const loadingBox = document.getElementById('loadingBox');
  const detailCard = document.getElementById('detailCard');

  async function loadDetail() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { location.href = 'index.html'; return; }
    try {
      const res = await fetch('./js/crematoriums.json');
      const json = await res.json();
      const item = json.data.find(d => String(d.id) === String(id));
      if (!item) throw new Error('Not Found');

      document.getElementById('dName').textContent = item.name;
      document.getElementById('dRegion').textContent = item.region;
      document.getElementById('dAddress').textContent = item.address;
      const pLink = document.getElementById('dPhoneLink');
      pLink.textContent = item.phone;
      pLink.href = `tel:${item.phone.replace(/[^0-9]/g, '')}`;
      
      const sLink = document.getElementById('dSourceLink');
      if (item.source_url) { sLink.href = item.source_url; sLink.style.display = 'inline-block'; }
      else { sLink.style.display = 'none'; }

      document.getElementById('docsChecklist').innerText = item.required_docs || '정보 없음';
      document.getElementById('dScheduleTable').innerText = item.schedule || '정보 없음';
      document.getElementById('dReservation').innerText = item.reservation_info || 'e하늘 예약 필수';
      document.getElementById('dFee').innerText = item.fee_info || '정보 없음';

      loadingBox.classList.add('hidden');
      detailCard.classList.remove('hidden');
    } catch (e) {
      loadingBox.innerHTML = '<p>정보 로드 실패</p>';
    }
  }

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
