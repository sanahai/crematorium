(function() {
  'use strict';

  const STORAGE_KEY = 'crematoriumData';
  const KAKAO_JAVASCRIPT_KEY = '';

  const loadingBox = document.getElementById('loadingBox');
  const detailCard = document.getElementById('detailCard');
  const docsChecklist = document.getElementById('docsChecklist');
  const deathTypeSelector = document.getElementById('deathTypeSelector');
  const docsMeta = document.getElementById('docsMeta');
  const sharePreview = document.getElementById('sharePreview');
  const toastMsg = document.getElementById('toastMsg');

  let currentItem = null;
  let currentType = '병사';
  let parsedDocs = {};

  async function loadDetail() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      location.href = 'index.html';
      return;
    }

    try {
      const local = localStorage.getItem(STORAGE_KEY);
      const dataset = local ? JSON.parse(local) : (await (await fetch('./js/crematoriums.json')).json()).data;
      currentItem = dataset.find(item => String(item.id) === String(id));
      if (!currentItem) throw new Error('not found');
      renderDetail(currentItem);
      loadingBox.classList.add('hidden');
      detailCard.classList.remove('hidden');
    } catch (error) {
      loadingBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><p>상세 정보를 불러오지 못했습니다.</p>';
    }
  }

  function renderDetail(item) {
    setText('dRegion', shortRegion(item.region));
    setText('dName', item.name);
    setText('dAddress', item.address);
    setLink('dPhoneLink', item.phone, `tel:${String(item.phone || '').replace(/[^0-9]/g, '')}`);
    setLink('dMapLink', '지도 보기', item.map_link || `https://map.kakao.com/link/search/${encodeURIComponent(item.name)}`);
    setLink('dSourceLink', '공식 정보', item.source_url || '#');
    setText('dHours', item.operating_hours || '시설 문의');
    setText('dDuration', item.duration || '시설 문의');

    const quickStats = document.getElementById('dQuickStats');
    quickStats.innerHTML = `
      <span class="quick-chip"><i class="fa-regular fa-clock"></i> ${escapeHtml(item.operating_hours || '운영시간 문의')}</span>
      <span class="quick-chip"><i class="fa-solid fa-hourglass-half"></i> ${escapeHtml(item.duration || '소요시간 문의')}</span>
      <span class="quick-chip"><i class="fa-solid fa-phone"></i> ${escapeHtml(item.phone || '-')}</span>
    `;

    renderInfoText('dReservation', item.reservation_info);
    renderInfoText('dFee', item.fee_info);
    renderSchedule(item.schedule);

    if (item.notice) {
      document.getElementById('dNoticeWrap').classList.remove('hidden');
      renderInfoText('dNotice', item.notice);
    }

    parsedDocs = normalizeDocs(item.required_docs);
    renderDeathTypeButtons(parsedDocs);
    renderDocsByType(currentType);
    renderSharePreview();
    initKakao();
  }

  function renderDeathTypeButtons(docs) {
    const preferredOrder = ['병사', '외인사', '개장유골', '외국인'];
    const types = preferredOrder.filter(type => docs[type]);
    if (!types.length) types.push('병사');
    currentType = types[0];

    deathTypeSelector.innerHTML = types.map(type => `
      <button class="dtype-btn ${type === currentType ? 'active' : ''}" data-type="${type}">${type}</button>
    `).join('');

    deathTypeSelector.addEventListener('click', (event) => {
      const btn = event.target.closest('.dtype-btn');
      if (!btn) return;
      currentType = btn.dataset.type;
      deathTypeSelector.querySelectorAll('.dtype-btn').forEach(node => node.classList.remove('active'));
      btn.classList.add('active');
      renderDocsByType(currentType);
      renderSharePreview();
    });
  }

  function renderDocsByType(type) {
    const selectedDocs = parsedDocs[type] || [];
    const commonDocs = parsedDocs['공통'] || [];
    docsMeta.innerHTML = `<span class="meta-chip">선택 유형: ${escapeHtml(type)}</span><span class="meta-chip">공통 서류 포함</span>`;

    docsChecklist.innerHTML = `
      <div class="doc-section">
        <h3>${escapeHtml(type)} 준비 서류</h3>
        <ul class="doc-list">${selectedDocs.map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>등록된 서류가 없습니다.</li>'}</ul>
      </div>
      <div class="doc-section ${commonDocs.length ? '' : 'hidden'}">
        <h3>공통 확인 사항</h3>
        <ul class="doc-list">${commonDocs.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    `;
  }

  function renderSchedule(schedule) {
    const wrap = document.getElementById('dScheduleTable');
    const rows = Array.isArray(schedule) ? schedule : toArray(schedule);
    wrap.innerHTML = `<div class="timeline-list">${rows.map(row => `<div class="timeline-row"><i class="fa-regular fa-clock"></i><span>${escapeHtml(row)}</span></div>`).join('')}</div>`;
  }

  function renderInfoText(id, value) {
    const el = document.getElementById(id);
    const items = Array.isArray(value) ? value : toArray(value);
    el.innerHTML = `<ul class="bullet-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function renderSharePreview() {
    sharePreview.innerHTML = `
      <div class="share-preview-title">${escapeHtml(currentItem.name)} · ${escapeHtml(currentType)}</div>
      <ul class="share-preview-list">
        ${buildShareLines().slice(0, 4).map(line => `<li>${escapeHtml(line)}</li>`).join('')}
      </ul>
    `;
  }

  function buildShareText() {
    const lines = buildShareLines();
    return lines.join('\n');
  }

  function buildShareLines() {
    const lines = [];
    lines.push(`[${currentItem.name}] ${currentType} 준비 서류 안내`);
    lines.push(`주소: ${currentItem.address || '-'}`);
    lines.push(`연락처: ${currentItem.phone || '-'}`);
    lines.push(`운영시간: ${currentItem.operating_hours || '시설 문의'}`);
    lines.push(`화장 소요시간: ${currentItem.duration || '시설 문의'}`);
    lines.push('');
    lines.push(`[${currentType} 서류]`);
    (parsedDocs[currentType] || []).forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    if ((parsedDocs['공통'] || []).length) {
      lines.push('');
      lines.push('[공통 확인 사항]');
      parsedDocs['공통'].forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    }
    lines.push('');
    lines.push('최종 기준은 e하늘 또는 시설 공식 안내에서 다시 확인해 주세요.');
    lines.push(window.location.href);
    return lines;
  }

  function initKakao() {
    if (!window.Kakao || !KAKAO_JAVASCRIPT_KEY) return;
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JAVASCRIPT_KEY);
    }
  }

  async function shareViaKakao() {
    const text = buildShareText();
    if (window.Kakao && KAKAO_JAVASCRIPT_KEY && window.Kakao.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `${currentItem.name} · ${currentType} 준비 서류`,
          description: text.slice(0, 180),
          imageUrl: 'https://developers.kakao.com/tool/resource/static/img/button/kakaolink/btn_story.png',
          link: { mobileWebUrl: window.location.href, webUrl: window.location.href }
        },
        buttons: [{ title: '상세 보기', link: { mobileWebUrl: window.location.href, webUrl: window.location.href } }]
      });
      return;
    }
    await copyText(text);
    showToast('카카오 키가 없어 텍스트를 먼저 복사했습니다. 카카오톡에 붙여넣어 보내세요.');
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

  function copyLink() {
    return navigator.clipboard.writeText(window.location.href);
  }

  function normalizeDocs(raw) {
    if (!raw) return { 병사: [], 공통: [] };
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;

    const text = String(raw);
    const sections = {};
    const regex = /\[(병사|외인사|개장유골|외국인|공통)\]([\s\S]*?)(?=\[(병사|외인사|개장유골|외국인|공통)\]|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      sections[match[1]] = toArray(match[2]);
    }
    if (!Object.keys(sections).length) sections['병사'] = toArray(text);
    return sections;
  }

  function toArray(value) {
    return String(value || '')
      .split(/\n|\|/)
      .map(item => item.replace(/^[-•\s]+/, '').trim())
      .filter(Boolean);
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value || '';
  }

  function setLink(id, text, href) {
    const el = document.getElementById(id);
    el.textContent = text || '';
    el.href = href || '#';
  }

  function shortRegion(region) {
    return String(region || '').replace('특별시','').replace('광역시','').replace('특별자치시','').replace('도','');
  }

  function showToast(message) {
    toastMsg.textContent = message;
    toastMsg.classList.remove('hidden');
    setTimeout(() => toastMsg.classList.add('hidden'), 2600);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.getElementById('kakaoShareBtn').addEventListener('click', shareViaKakao);
  document.getElementById('copyTextBtn').addEventListener('click', async () => {
    await copyText(buildShareText());
    showToast('서류 안내 문구를 복사했습니다.');
  });
  document.getElementById('copyLinkBtn').addEventListener('click', async () => {
    await copyLink();
    showToast('상세 페이지 링크를 복사했습니다.');
  });

  loadDetail();
})();
