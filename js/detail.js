/* =========================================
   detail.js – 화장장 상세 + 카카오톡 공유
   ========================================= */
(function() {
  'use strict';

  const TABLE = 'crematoriums';
  const DEATH_TYPES = ['병사', '외인사', '개장유골', '외국인'];
  const TYPE_ALIASES = {
    '병사': ['병사', '자연사', '일반사망'],
    '외인사': ['외인사', '사고사', '변사', '기타 및 불상', '기타', '불상'],
    '개장유골': ['개장유골', '개장', '유골'],
    '외국인': ['외국인', '외국인 국내사망', '외국인이 국내', '국내거소']
  };

  const DEFAULT_DOC_GUIDE = {
    '병사': {
      summary: '일반적인 병사 기준 서류입니다. 시설별로 원본 여부와 추가 확인 서류가 달라질 수 있습니다.',
      items: [
        { kind: '필수', text: '사망진단서 또는 시체검안서 원본 1부' },
        { kind: '공통', text: '신청인(유족) 신분증' },
        { kind: '공통', text: 'e하늘 화장예약 정보 또는 예약번호' },
        { kind: '추가', text: '고인과 신청인의 관계 확인서류(시설 요청 시)' }
      ],
      notes: [
        '원본 제출 여부, 사본 허용 여부는 해당 화장장에 사전 확인하세요.',
        '시설 사정에 따라 추가 서류 제출을 요구할 수 있습니다.'
      ],
      steps: ['e하늘 예약 확인', '접수 창구에서 서류 제출', '사용료 납부 후 화장 진행']
    },
    '외인사': {
      summary: '사고사·변사 등 외인사 유형은 수사기관 또는 검찰 관련 서류가 추가될 수 있습니다.',
      items: [
        { kind: '필수', text: '사망진단서 또는 시체검안서 원본 1부' },
        { kind: '필수', text: '검사지휘서 또는 화장허가 관련 수사서류' },
        { kind: '공통', text: '신청인(유족) 신분증' },
        { kind: '공통', text: 'e하늘 화장예약 정보 또는 예약번호' }
      ],
      notes: [
        '경찰서·검찰청 발급 서류가 필요한 경우가 많으므로 방문 전 반드시 확인하세요.',
        '서류 미비 시 당일 화장이 지연될 수 있습니다.'
      ],
      steps: ['수사기관 서류 확보', 'e하늘 예약 진행', '현장 접수 시 원본 제출']
    },
    '개장유골': {
      summary: '개장유골은 일반 사망과 다른 개장 관련 신고 서류가 필요합니다.',
      items: [
        { kind: '필수', text: '개장신고필증 또는 개장허가 관련 서류' },
        { kind: '공통', text: '신청인 신분증' },
        { kind: '공통', text: 'e하늘 화장예약 정보 또는 예약번호' },
        { kind: '추가', text: '봉안·묘지 반출 확인자료(시설 요청 시)' }
      ],
      notes: ['유골 상태나 반입 방식에 따라 접수 기준이 달라질 수 있습니다.'],
      steps: ['개장신고 완료', '유골 반입 가능 여부 확인', '예약 후 현장 접수']
    },
    '외국인': {
      summary: '외국인 국내사망의 경우 신분 확인 서류와 번역 또는 동의 서류가 추가될 수 있습니다.',
      items: [
        { kind: '필수', text: '사망진단서 또는 시체검안서 원본 1부' },
        { kind: '필수', text: '여권 또는 외국인등록증 등 고인 신분 확인 서류' },
        { kind: '공통', text: '신청인 신분증' },
        { kind: '추가', text: '가족 동의서·재외공관 확인서류 등 시설 요청 서류' },
        { kind: '공통', text: 'e하늘 화장예약 정보 또는 예약번호' }
      ],
      notes: [
        '국적·체류 자격에 따라 제출 서류가 달라질 수 있습니다.',
        '외국어 서류는 번역 공증 또는 추가 확인을 요청받을 수 있습니다.'
      ],
      steps: ['고인 신분 확인 서류 준비', '필요 시 대사관·영사관 문의', '예약 후 현장 접수']
    }
  };

  // DOM refs
  const loadingBox       = document.getElementById('loadingBox');
  const detailCard       = document.getElementById('detailCard');
  const toastMsg         = document.getElementById('toastMsg');
  const docsChecklist    = document.getElementById('docsChecklist');
  const docsMeta         = document.getElementById('docsMeta');
  const kakaoModal       = document.getElementById('kakaoModal');
  const modalClose       = document.getElementById('modalClose');
  const modalCancelBtn   = document.getElementById('modalCancelBtn');
  const modalKakaoSend   = document.getElementById('modalKakaoSend');
  const modalCopyText    = document.getElementById('modalCopyText');
  const modalCopyLink    = document.getElementById('modalCopyLink');
  const modalFacilityInfo= document.getElementById('modalFacilityInfo');
  const modalDocsList    = document.getElementById('modalDocsList');
  const kakaoShareBtn    = document.getElementById('kakaoShareBtn');

  let currentItem = null;
  let currentDeathType = '병사';
  const checkedDocsByType = Object.fromEntries(DEATH_TYPES.map(type => [type, new Set()]));

  /* ── URL에서 id 파싱 ── */
  function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  /* ── 데이터 로드 ── */
async function loadDetail(id) {
  try {
    const API_KEY = 'a4bea687508507ebfe11d5215e2467d19b58c78e2a50667f9a4b19fb3e7de0c8';
    const API_URL = `https://apis.data.go.kr/1352000/ODMS_DATA_05_1/call73756f70?serviceKey=${API_KEY}&type=json&numOfRows=100`;

    const res = await fetch(API_URL);
    const json = await res.json();
    const rawItems = json.response?.body?.items || [];
    
    // ID(시설명 등)가 일치하는 데이터 찾기
    const item = rawItems.find(d => d.facltNm === id);
    
    if (!item) throw new Error('데이터 없음');

    // 기존 UI 구조에 맞게 매핑
    currentItem = {
      name: item.facltNm,
      address: item.roadNmAddr,
      phone: item.telno,
      region: item.ctprvnNm,
      // ... 기타 필드 매핑
    };

    renderDetail(currentItem);
  } catch(e) {
    console.error(e);
  }
}

  /* ── 상세 렌더링 ── */
  function renderDetail(item) {
    document.title = `${item.name} – 전국 화장장 안내`;

    document.getElementById('dRegion').textContent = item.region || '';
    document.getElementById('dName').textContent = item.name || '';
    document.getElementById('dAddress').textContent = item.address || '주소 정보 없음';

    const phoneEl = document.getElementById('dPhoneLink');
    phoneEl.textContent = item.phone || '-';
    phoneEl.href = item.phone ? `tel:${item.phone.replace(/[^0-9]/g, '')}` : '#';

    const mapEl = document.getElementById('dMapLink');
    mapEl.href = item.map_link || `https://map.kakao.com/link/search/${encodeURIComponent(item.name || '')}`;

    const srcEl = document.getElementById('dSourceLink');
    if (item.source_url) srcEl.href = item.source_url;
    else srcEl.style.display = 'none';

    const noticeWrap = document.getElementById('dNoticeWrap');
    if (item.notice) {
      noticeWrap.classList.remove('hidden');
      document.getElementById('dNotice').textContent = item.notice;
    }

    document.getElementById('dHours').textContent = item.operating_hours || '-';
    renderScheduleTable(item.schedule || '');
    document.getElementById('dReservation').textContent = item.reservation_info || '예약 안내 정보 없음';
    document.getElementById('dFee').textContent = item.fee_info || '사용료 정보 없음';

    renderChecklist(currentDeathType);

    loadingBox.classList.add('hidden');
    detailCard.classList.remove('hidden');
  }

  /* ── 시간표 렌더링 ── */
  function renderScheduleTable(scheduleStr) {
    const container = document.getElementById('dScheduleTable');
    if (!String(scheduleStr || '').trim()) {
      container.innerHTML = '<p class="info-text">시간표 정보 없음</p>';
      return;
    }
    const rows = scheduleStr.split('|').map(s => s.trim()).filter(Boolean);
    let html = `<table class="schedule-table"><thead><tr><th>회차</th><th>화장 시작 시각</th></tr></thead><tbody>`;
    rows.forEach(row => {
      const match = row.match(/^(.+?)\s+(\d{2}:\d{2}.*)$/);
      if (match) html += `<tr><td>${escHtml(match[1].trim())}</td><td>${escHtml(match[2].trim())}</td></tr>`;
      else html += `<tr><td colspan="2">${escHtml(row)}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /* ── 서류 체크리스트 렌더링 ── */
  function renderChecklist(deathType) {
    if (!currentItem) return;
    currentDeathType = deathType;

    const docState = parseDocsByType(currentItem.required_docs || '', deathType);
    const checkedSet = checkedDocsByType[deathType] || new Set();
    const checkedCount = docState.items.filter(item => checkedSet.has(item.id)).length;
    const grouped = groupByKind(docState.items);

    docsMeta.innerHTML = buildDocsMetaHtml(docState, checkedCount);

    const groupOrder = ['필수', '공통', '추가'];
    const groupHtml = groupOrder
      .filter(kind => grouped[kind] && grouped[kind].length)
      .map(kind => renderDocGroup(kind, grouped[kind], checkedSet))
      .join('');

    const extras = [];
    if (docState.notes.length) {
      extras.push(renderInfoPanel('유의사항', 'fa-circle-info', docState.notes, 'warn'));
    }
    if (docState.steps.length) {
      extras.push(renderInfoPanel('진행 순서', 'fa-list-ol', docState.steps, 'step', true));
    }
    if (docState.contacts.length) {
      extras.push(renderInfoPanel('추가 문의', 'fa-phone-volume', docState.contacts, 'contact'));
    }

    docsChecklist.innerHTML = `
      ${groupHtml || '<div class="info-text">등록된 필요 서류 정보가 없습니다.</div>'}
      ${extras.length ? `<div class="docs-extra-grid">${extras.join('')}</div>` : ''}
    `;
  }

  function buildDocsMetaHtml(docState, checkedCount) {
    const chips = [
      `<span class="docs-meta-chip"><i class="fa-solid fa-file-lines"></i> 총 서류 ${docState.items.length}건</span>`,
      `<span class="docs-meta-chip ${checkedCount ? 'is-checked' : ''}"><i class="fa-solid fa-check"></i> 체크 완료 ${checkedCount}건</span>`
    ];
    if (docState.summary) {
      chips.push(`<span class="docs-meta-summary">${escHtml(docState.summary)}</span>`);
    }
    return chips.join('');
  }

  function renderDocGroup(kind, items, checkedSet) {
    const badgeClass = kind === '필수' ? 'kind-required' : (kind === '공통' ? 'kind-common' : 'kind-extra');
    const title = kind === '필수' ? '반드시 준비할 서류' : (kind === '공통' ? '공통 확인 서류' : '상황별 추가 서류');

    return `
      <section class="docs-group">
        <div class="docs-group-head">
          <div>
            <span class="docs-group-pill ${badgeClass}">${kind}</span>
            <h3>${title}</h3>
          </div>
          <strong>${items.length}건</strong>
        </div>
        <div class="docs-group-list">
          ${items.map(item => `
            <div class="checklist-item ${checkedSet.has(item.id) ? 'checked' : ''}" data-doc-id="${escHtml(item.id)}" role="button" tabindex="0">
              <div class="checklist-checkbox"></div>
              <div class="checklist-text">
                <span class="checklist-kind ${badgeClass}">${kind}</span>
                <div class="checklist-main-text">${escHtml(item.text)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderInfoPanel(title, icon, lines, variant, ordered) {
    if (!lines.length) return '';
    const listTag = ordered ? 'ol' : 'ul';
    return `
      <section class="docs-info-panel ${variant}">
        <h3><i class="fa-solid ${icon}"></i> ${title}</h3>
        <${listTag}>
          ${lines.map(line => `<li>${escHtml(line)}</li>`).join('')}
        </${listTag}>
      </section>
    `;
  }

  /* ── 체크 토글 ── */
  docsChecklist.addEventListener('click', e => {
    const itemEl = e.target.closest('.checklist-item');
    if (!itemEl) return;
    toggleChecklistItem(itemEl);
  });

  docsChecklist.addEventListener('keydown', e => {
    const itemEl = e.target.closest('.checklist-item');
    if (!itemEl) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleChecklistItem(itemEl);
    }
  });

  function toggleChecklistItem(itemEl) {
    const docId = itemEl.dataset.docId;
    const checkedSet = checkedDocsByType[currentDeathType] || (checkedDocsByType[currentDeathType] = new Set());
    if (checkedSet.has(docId)) {
      checkedSet.delete(docId);
      itemEl.classList.remove('checked');
    } else {
      checkedSet.add(docId);
      itemEl.classList.add('checked');
    }
    const docState = parseDocsByType(currentItem.required_docs || '', currentDeathType);
    docsMeta.innerHTML = buildDocsMetaHtml(docState, checkedSet.size);
  }

  /* ── 서류 파싱 ── */
  function parseDocsByType(raw, type) {
    const cleanRaw = String(raw || '').replace(/\r/g, '').trim();
    if (!cleanRaw) return buildDefaultDocSet(type);
    if (looksStructuredDocText(cleanRaw)) return parseStructuredDocSet(cleanRaw, type);
    return parseLegacyDocSet(cleanRaw, type);
  }

  function looksStructuredDocText(raw) {
    return /^\[(병사|외인사|개장유골|외국인|공통)\]\s*$/m.test(raw);
  }

  function parseStructuredDocSet(raw, type) {
    const sections = {
      병사: createEmptySection(),
      외인사: createEmptySection(),
      개장유골: createEmptySection(),
      외국인: createEmptySection(),
      공통: createEmptySection()
    };

    let currentSection = '공통';
    raw.split('\n').forEach(originalLine => {
      const line = normalizeLine(originalLine);
      if (!line) return;

      const headerType = detectSectionHeader(line);
      if (headerType) {
        currentSection = headerType;
        return;
      }

      const parsed = parseLabeledLine(line);
      if (!parsed) {
        pushDocItem(sections[currentSection].items, currentSection === '공통' ? '공통' : '필수', line);
        return;
      }

      const bucket = normalizeBucket(parsed.label, currentSection);
      const value = parsed.value;
      if (!value) return;

      if (bucket === 'summary') {
        sections[currentSection].summary = value;
      } else if (bucket === 'note') {
        pushUniqueText(sections[currentSection].notes, value);
      } else if (bucket === 'step') {
        pushUniqueText(sections[currentSection].steps, value);
      } else if (bucket === 'contact') {
        pushUniqueText(sections[currentSection].contacts, value);
      } else {
        pushDocItem(sections[currentSection].items, bucket, value);
      }
    });

    const merged = mergeSections(sections[type], sections.공통);
    if (!merged.items.length) return buildDefaultDocSet(type);
    if (!merged.notes.length) {
      pushUniqueText(merged.notes, '시설별 접수 기준이 다를 수 있으므로 방문 전 전화로 한 번 더 확인하세요.');
    }
    return merged;
  }

  function parseLegacyDocSet(raw, type) {
    const lines = raw.split('\n').map(normalizeLine).filter(Boolean);
    const result = createEmptySection();
    const commonKeywords = ['신청인', '유족', '보호자', '신분증', '예약', 'e하늘', '접수', '관계증명', '가족관계'];

    lines.forEach(line => {
      const parsed = parseLabeledLine(line);
      const label = parsed ? parsed.label : '';
      const value = parsed ? parsed.value : line;

      if (label && isDeathTypeLabel(label) && !matchesDeathType(label, type)) return;
      if (!label && includesOtherTypeKeyword(line, type)) return;

      if (isContactLabel(label)) {
        pushUniqueText(result.contacts, value);
        return;
      }
      if (isNoteLabel(label) || /주의|유의|참고|확인/.test(line)) {
        pushUniqueText(result.notes, value);
        return;
      }
      if (isStepLabel(label)) {
        pushUniqueText(result.steps, value);
        return;
      }

      let kind = '필수';
      if (label && /공통|신청인|유족|예약/.test(label)) kind = '공통';
      else if (label && /추가|선택/.test(label)) kind = '추가';
      else if (!label && commonKeywords.some(keyword => line.includes(keyword))) kind = '공통';

      if (matchesDeathType(label || line, type) || kind !== '필수' || likelyDocumentLine(line)) {
        pushDocItem(result.items, kind, value);
      }
    });

    if (!result.items.length) return buildDefaultDocSet(type);
    if (!result.summary) {
      result.summary = '상세 서류 포맷이 아니어서 기존 입력값을 기준으로 정리해 보여줍니다.';
    }
    if (!result.notes.length) {
      pushUniqueText(result.notes, '시설별 요구 서류가 달라질 수 있으므로 반드시 해당 화장장 또는 e하늘에서 재확인하세요.');
    }

    const merged = mergeSections(result, { items: [], notes: [], steps: [], contacts: [] });
    return merged;
  }

  function buildDefaultDocSet(type) {
    const base = DEFAULT_DOC_GUIDE[type] || DEFAULT_DOC_GUIDE['병사'];
    const section = createEmptySection();
    section.summary = base.summary;
    base.items.forEach(item => pushDocItem(section.items, item.kind, item.text));
    base.notes.forEach(line => pushUniqueText(section.notes, line));
    base.steps.forEach(line => pushUniqueText(section.steps, line));
    return section;
  }

  function createEmptySection() {
    return { summary: '', items: [], notes: [], steps: [], contacts: [] };
  }

  function mergeSections(primary, common) {
    const merged = createEmptySection();
    merged.summary = [primary.summary, common.summary].filter(Boolean).join(' ');
    [...(primary.items || []), ...(common.items || [])].forEach(item => pushDocItem(merged.items, item.kind, item.text));
    [...(primary.notes || []), ...(common.notes || [])].forEach(text => pushUniqueText(merged.notes, text));
    [...(primary.steps || []), ...(common.steps || [])].forEach(text => pushUniqueText(merged.steps, text));
    [...(primary.contacts || []), ...(common.contacts || [])].forEach(text => pushUniqueText(merged.contacts, text));
    merged.items.sort((a, b) => itemRank(a.kind) - itemRank(b.kind));
    return merged;
  }

  function itemRank(kind) {
    return ({ 필수: 1, 공통: 2, 추가: 3 }[kind] || 9);
  }

  function pushDocItem(list, kind, text) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) return;
    const normalizedKind = ['필수', '공통', '추가'].includes(kind) ? kind : '필수';
    const id = `${normalizedKind}__${normalizedText}`;
    if (list.some(item => item.id === id)) return;
    list.push({ id, kind: normalizedKind, text: normalizedText });
  }

  function pushUniqueText(list, text) {
    const normalized = String(text || '').trim();
    if (!normalized) return;
    if (!list.includes(normalized)) list.push(normalized);
  }

  function normalizeLine(line) {
    return String(line || '').replace(/^\s*[-•●▪◦]\s*/, '').trim();
  }

  function detectSectionHeader(line) {
    const match = line.match(/^\[(.+?)\]$/);
    if (!match) return '';
    const label = match[1].trim();
    if (label === '공통') return '공통';
    return DEATH_TYPES.find(type => matchesDeathType(label, type)) || '';
  }

  function parseLabeledLine(line) {
    const match = line.match(/^([^:：]{1,20})\s*[:：]\s*(.+)$/);
    if (!match) return null;
    return { label: match[1].trim(), value: match[2].trim() };
  }

  function normalizeBucket(label, currentSection) {
    const token = String(label || '').trim();
    if (!token) return currentSection === '공통' ? '공통' : '필수';
    if (/요약|설명|안내/.test(token)) return 'summary';
    if (/유의|주의|참고|확인|비고|기타/.test(token)) return 'note';
    if (/절차|순서|진행|예약/.test(token)) return 'step';
    if (/문의|연락|상담/.test(token)) return 'contact';
    if (/공통/.test(token)) return '공통';
    if (/추가|선택/.test(token)) return '추가';
    return '필수';
  }

  function matchesDeathType(text, type) {
    const targetAliases = TYPE_ALIASES[type] || [type];
    return targetAliases.some(alias => String(text || '').includes(alias));
  }

  function isDeathTypeLabel(label) {
    return DEATH_TYPES.some(type => matchesDeathType(label, type));
  }

  function includesOtherTypeKeyword(text, currentType) {
    return DEATH_TYPES.some(type => type !== currentType && matchesDeathType(text, type));
  }

  function isNoteLabel(label) {
    return /유의|주의|참고|확인|비고|기타/.test(String(label || ''));
  }

  function isStepLabel(label) {
    return /절차|순서|진행|예약/.test(String(label || ''));
  }

  function isContactLabel(label) {
    return /문의|연락|상담/.test(String(label || ''));
  }

  function likelyDocumentLine(text) {
    return /증|서|필증|허가|확인|신고|예약|지휘|여권|등록증|동의서/.test(String(text || ''));
  }

  function groupByKind(items) {
    return items.reduce((acc, item) => {
      (acc[item.kind] = acc[item.kind] || []).push(item);
      return acc;
    }, {});
  }

  /* ── 탭 전환 ── */
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (panel) panel.classList.remove('hidden');
    });
  });

  /* ── 사망 유형 버튼 ── */
  document.querySelectorAll('.dtype-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dtype-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderChecklist(btn.dataset.type);
    });
  });

  /* ── 카카오 공유 모달 ── */
  kakaoShareBtn.addEventListener('click', openKakaoModal);

  function openKakaoModal() {
    if (!currentItem) return;
    modalFacilityInfo.innerHTML = `
      <strong>${escHtml(currentItem.name || '')}</strong><br>
      📌 주소: ${escHtml(currentItem.address || '-')}<br>
      📞 전화: ${escHtml(currentItem.phone || '-')}<br>
      ⏰ 운영: ${escHtml(currentItem.operating_hours || '-')}<br>
      📅 예약: e하늘 장사정보시스템 (www.15774129.go.kr)
    `;

    const checkedCount = (checkedDocsByType[currentDeathType] || new Set()).size;
    const checkedRadio = document.querySelector('input[name="shareScope"][value="checked"]');
    const allRadio = document.querySelector('input[name="shareScope"][value="all"]');
    if (checkedRadio && allRadio) {
      checkedRadio.disabled = checkedCount === 0;
      checkedRadio.checked = checkedCount > 0;
      allRadio.checked = checkedCount === 0;
    }

    refreshModalPreview();
    kakaoModal.classList.remove('hidden');
  }

  function refreshModalPreview() {
    if (!currentItem) return;
    const { docState, selectedItems, shareScopeLabel, audienceLabel } = getShareContext();
    const grouped = groupByKind(selectedItems);
    const parts = [];
    ['필수', '공통', '추가'].forEach(kind => {
      const items = grouped[kind] || [];
      if (!items.length) return;
      parts.push(`
        <div class="modal-doc-group">
          <div class="modal-doc-group-head">${kind} 서류 <span>${items.length}건</span></div>
          <ul>
            ${items.map(item => `<li>${escHtml(item.text)}</li>`).join('')}
          </ul>
        </div>
      `);
    });

    if (docState.notes.length) {
      parts.push(`
        <div class="modal-inline-note">
          <strong>유의사항</strong>
          <ul>${docState.notes.map(note => `<li>${escHtml(note)}</li>`).join('')}</ul>
        </div>
      `);
    }

    modalDocsList.innerHTML = `
      <div class="modal-share-badge-row">
        <span class="docs-meta-chip"><i class="fa-solid fa-user"></i> ${escHtml(audienceLabel)}</span>
        <span class="docs-meta-chip"><i class="fa-solid fa-paper-plane"></i> ${escHtml(shareScopeLabel)}</span>
      </div>
      ${parts.join('')}
    `;
  }

  document.querySelectorAll('input[name="shareAudience"], input[name="shareScope"]').forEach(input => {
    input.addEventListener('change', refreshModalPreview);
  });

  /* ── 모달 닫기 ── */
  [modalClose, modalCancelBtn].forEach(el => {
    el.addEventListener('click', () => kakaoModal.classList.add('hidden'));
  });
  kakaoModal.addEventListener('click', e => {
    if (e.target === kakaoModal) kakaoModal.classList.add('hidden');
  });

  /* ── 공유 텍스트 생성 ── */
  function getShareContext() {
    const docState = parseDocsByType(currentItem.required_docs || '', currentDeathType);
    const checkedSet = checkedDocsByType[currentDeathType] || new Set();
    const requestedScope = document.querySelector('input[name="shareScope"]:checked')?.value || 'all';
    const audience = document.querySelector('input[name="shareAudience"]:checked')?.value || 'friend';

    let selectedItems = requestedScope === 'checked'
      ? docState.items.filter(item => checkedSet.has(item.id))
      : [...docState.items];

    let shareScopeLabel = requestedScope === 'checked' ? '체크한 서류만 전송' : '전체 서류 전송';
    if (!selectedItems.length) {
      selectedItems = [...docState.items];
      shareScopeLabel = '체크된 항목이 없어 전체 서류 전송';
    }

    const audienceLabel = audience === 'self' ? '내 카톡 보관용' : '지인 전달용';

    return { docState, selectedItems, shareScopeLabel, audienceLabel };
  }

  function buildShareText() {
    const { docState, selectedItems, shareScopeLabel, audienceLabel } = getShareContext();
    const grouped = groupByKind(selectedItems);
    const lines = [];

    lines.push(`📍 화장장 안내: ${currentItem.name || ''}`);
    lines.push(`공유 용도: ${audienceLabel}`);
    lines.push(`사망 유형: ${currentDeathType}`);
    lines.push(`공유 범위: ${shareScopeLabel}`);
    lines.push('');
    lines.push(`📌 주소: ${currentItem.address || '-'}`);
    lines.push(`📞 전화: ${currentItem.phone || '-'}`);
    lines.push(`⏰ 운영: ${currentItem.operating_hours || '-'}`);
    lines.push('');

    if (docState.summary) {
      lines.push(`안내: ${docState.summary}`);
      lines.push('');
    }

    ['필수', '공통', '추가'].forEach(kind => {
      const items = grouped[kind] || [];
      if (!items.length) return;
      lines.push(`【${kind} 서류】`);
      items.forEach((item, index) => lines.push(`${index + 1}. ${item.text}`));
      lines.push('');
    });

    if (docState.notes.length) {
      lines.push('【유의사항】');
      docState.notes.forEach((line, index) => lines.push(`- ${line}`));
      lines.push('');
    }

    if (docState.steps.length) {
      lines.push('【진행 순서】');
      docState.steps.forEach((line, index) => lines.push(`${index + 1}) ${line}`));
      lines.push('');
    }

    lines.push('📋 예약 확인: e하늘 장사정보시스템 (www.15774129.go.kr)');
    lines.push(`🔗 상세 페이지: ${window.location.href}`);

    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /* ── 카카오 SDK 공유 ── */
  modalKakaoSend.addEventListener('click', async () => {
    if (!currentItem) return;
    const fullText = buildShareText();
    const pageUrl = window.location.href;

    if (window.Kakao && Kakao.isInitialized()) {
      try {
        Kakao.Share.sendDefault({
          objectType: 'text',
          text: fullText,
          link: { mobileWebUrl: pageUrl, webUrl: pageUrl }
        });
        kakaoModal.classList.add('hidden');
        showToast('카카오톡 공유창이 열렸습니다. 나와의 채팅 또는 지인 대화방을 선택하세요.', 'success');
        return;
      } catch(err) {
        console.warn('[Kakao Share fallback]', err);
      }
    }

    try {
      await navigator.clipboard.writeText(fullText);
      kakaoModal.classList.add('hidden');
      showToast('카카오 SDK가 준비되지 않아 문구를 복사했습니다. 카카오톡에 붙여넣어 보내세요.', 'success');
    } catch(err) {
      alert('공유할 내용:\n\n' + fullText);
    }
  });

  /* ── 텍스트 복사 ── */
  modalCopyText.addEventListener('click', async () => {
    if (!currentItem) return;
    const fullText = buildShareText();
    try {
      await navigator.clipboard.writeText(fullText);
      showToast('카카오톡 전달용 문구가 복사되었습니다.', 'success');
    } catch(err) {
      alert(fullText);
    }
  });

  /* ── 링크 복사 ── */
  modalCopyLink.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('상세 페이지 링크가 복사되었습니다.', 'success');
    } catch(err) {
      alert(window.location.href);
    }
  });

  /* ── 토스트 ── */
  function showToast(msg, type='') {
    toastMsg.textContent = msg;
    toastMsg.className = 'toast-msg' + (type ? ` ${type}` : '');
    toastMsg.classList.remove('hidden');
    setTimeout(() => toastMsg.classList.add('hidden'), 3200);
  }

  /* ── HTML 이스케이프 ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── 카카오 SDK 초기화 ── */
  if (window.Kakao && !Kakao.isInitialized()) {
    // Kakao.init('YOUR_KAKAO_JS_APP_KEY');
    console.info('[Kakao] SDK not initialized. Clipboard fallback active.');
  }

  /* ── 초기화 ── */
  const id = getIdFromUrl();
  if (id) {
    loadDetail(id);
  } else {
    loadingBox.innerHTML = `
      <i class="fa-solid fa-circle-exclamation"></i>
      <p>잘못된 접근입니다. <a href="index.html">목록으로 돌아가기</a></p>`;
  }

})();
