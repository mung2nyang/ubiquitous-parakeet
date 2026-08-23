// ============================================================================
// 마이페이지 서브화면 — 정산·계산서 설정 / 공지사항 / 문자 문구 설정 / 개인정보 /
// 고객센터(FAQ·1:1문의) / 회원 탈퇴 (코드 쪼개기 7차: script.js에서 분리)
// ============================================================================
// getSupabaseClient/supabaseSignOutSafely/scheduleSupabaseInquirySync(supabase-sync.js),
// showTaxInvoices(finance.js), applyEmployerAutoFilledInfo(driver-link.js)는 함수 몸통
// 안에서만 참조하므로(런타임 호출) 파일 로드 순서는 상관없다. 반대 방향으로
// supabase-sync.js가 getSupportInquiries()를 부르는 것도(가드 없이 직접 호출) 같은
// 이유로 안전하다 — 실제 호출 시점엔 이미 모든 스크립트가 로드돼 있다.
// ============================================================================

function showMyPage(preserveReturnLog = false) {
    if (!preserveReturnLog) myPageReturnLogId = activeLogId;
    utilityReturnPage = 'main';
    const settings = getUserSettings();
    const isEmployedDriver = settings.accountType === 'employed_driver';

    // 개인정보 카드: [차주/소속 기사] 뱃지 + 이름
    const roleBadge = document.getElementById('myPageRoleBadge');
    const userNameText = document.getElementById('myPageUserNameText');
    if (roleBadge) roleBadge.textContent = isEmployedDriver ? '소속 기사' : '차주';
    if (userNameText) userNameText.textContent = settings.userName || (isEmployedDriver ? '기사' : '대표자');

    renderBackupStatus();

    hideAllPages();
    document.getElementById('myPage').classList.remove('hidden');
    setActiveNav('personal');
}

function goBackFromMyPage() {
    returnToLogHome(myPageReturnLogId);
}

// 예전엔 이 화면에서 "기본 계산서 처리 방식"(defaultDriverSettlementMode)도 같이 정했는데,
// 차량관리 → 각 기사차량의 "계산서 처리 방식" 드롭다운과 사실상 같은 값을 두 군데서 따로
// 관리하는 모양이 되어, 하나만 바꾸면 다른 화면은 그대로인 걸 버그로 오해하는 혼란이
// 반복됐다(실제로 재현·보고됨). 기사차량마다 처리 방식이 다를 수 있다는 게 이 값의 존재
// 이유 자체이므로 두 값을 동기화하는 대신, "어떻게 처리할지"는 차량관리 화면 하나로
// 합치고 이 화면은 "기사 매입 계산서를 어떤 금액 기준으로 준비할지"(driverInvoiceBasis)만
// 남긴다. defaultDriverSettlementMode 자체는 신규 기사차량 등록 시 초깃값으로만 계속
// 쓰인다(car-management.js resetCarForm 참고).
function showBillingSettingsPage() {
    const settings = getUserSettings();
    const basisSelect = document.getElementById('driverInvoiceBasis');
    basisSelect.value = settings.driverInvoiceBasis || 'net';
    basisSelect.parentElement?._dropdownSync?.();
    updateBillingSettingsGuide();
    hideAllPages();
    document.getElementById('billingSettingsPage').classList.remove('hidden');
    setActiveNav('personal');
}

function saveBillingSettings() {
    queueBackgroundSave('billing-settings', commitBillingSettings);
}

function commitBillingSettings() {
    const settings = getUserSettings();
    settings.driverInvoiceBasis = document.getElementById('driverInvoiceBasis').value || 'net';
    setUserSettings(settings);
    showToastMessage('정산·계산서 기본 설정을 저장했습니다.');
}

function updateBillingSettingsGuide() {
    const basis = document.getElementById('driverInvoiceBasis')?.value || 'net';
    const basisText = basis === 'gross' ? '기사 매입 계산서는 공제 전 운송료를 기준으로 준비합니다.' : '기사 매입 계산서는 수수료·산재보험료 공제 후 지급액을 기준으로 준비합니다.';
    const guide = document.getElementById('billingSettingsModeGuide');
    if (guide) guide.innerHTML = basisText;
}

function updateDriverSettlementModeGuide() {
    const select = document.getElementById('newCarSettlementMode');
    const guide = document.getElementById('newCarSettlementModeGuide');
    if (!select || !guide) return;
    const meta = getDriverSettlementModeMeta(select.value);
    guide.textContent = meta.description;
}

function showNoticePage() {
    hideAllPages();
    document.getElementById('noticePage').classList.remove('hidden');
    setActiveNav('personal');
}

function showMessageSettingsPage() {
    const messagePatterns = getMessageTemplatePatterns();
    const unpaidInput = document.getElementById('unpaidMessageTemplateInput');
    const paymentRequestInput = document.getElementById('paymentRequestMessageTemplateInput');
    const tripCompleteInput = document.getElementById('tripCompleteMessageTemplateInput');
    const reportInput = document.getElementById('reportShareMessageInput');

    if (unpaidInput) unpaidInput.value = messagePatterns[0];
    if (paymentRequestInput) paymentRequestInput.value = messagePatterns[1];
    if (tripCompleteInput) tripCompleteInput.value = messagePatterns[2];
    if (reportInput) reportInput.value = getReportShareMessagePattern();

    hideAllPages();
    document.getElementById('messageSettingsPage').classList.remove('hidden');
    setActiveNav('personal');
}

function saveMessageSettings() {
    const unpaidMessage = document.getElementById('unpaidMessageTemplateInput')?.value.trim() || '';
    const paymentRequestMessage = document.getElementById('paymentRequestMessageTemplateInput')?.value.trim() || '';
    const tripCompleteMessage = document.getElementById('tripCompleteMessageTemplateInput')?.value.trim() || '';
    const reportMessage = document.getElementById('reportShareMessageInput')?.value.trim() || '';

    if (!unpaidMessage || !paymentRequestMessage || !tripCompleteMessage || !reportMessage) {
        showToastMessage('모든 문자 문구를 입력해 주세요.');
        return;
    }

    const messagePatterns = [unpaidMessage, paymentRequestMessage, tripCompleteMessage];

    try {
        localStorage.setItem('messageTemplateCustomBodies', JSON.stringify(messagePatterns));
        localStorage.setItem('reportShareMessagePattern', reportMessage);
        showToastMessage('문자 문구를 저장했습니다.');
    } catch (error) {
        console.error('문자 문구 저장 실패:', error);
        showToastMessage('문자 문구를 저장하지 못했습니다.');
    }
}

function resetMessageSettings() {
    const defaultPatterns = getDefaultMessageTemplatePatterns();

    try {
        localStorage.removeItem('messageTemplateCustomBodies');
        localStorage.removeItem('reportShareMessagePattern');
    } catch (error) {
        console.error('기본 문자 문구 복원 실패:', error);
        showToastMessage('기본 문구를 복원하지 못했습니다.');
        return;
    }

    const unpaidInput = document.getElementById('unpaidMessageTemplateInput');
    const paymentRequestInput = document.getElementById('paymentRequestMessageTemplateInput');
    const tripCompleteInput = document.getElementById('tripCompleteMessageTemplateInput');
    const reportInput = document.getElementById('reportShareMessageInput');
    if (unpaidInput) unpaidInput.value = defaultPatterns[0];
    if (paymentRequestInput) paymentRequestInput.value = defaultPatterns[1];
    if (tripCompleteInput) tripCompleteInput.value = defaultPatterns[2];
    if (reportInput) reportInput.value = getDefaultReportShareMessagePattern();
    showToastMessage('기본 문구로 복원했습니다.');
}

function showPersonalInfo(fromPage) {
    if (!fromPage) {
        const taxPage = document.getElementById('taxInvoicePage');
        fromPage = taxPage && !taxPage.classList.contains('hidden') ? 'tax' : 'myPage';
    }
    personalInfoReturnPage = fromPage;
    personalInfoReturnLogId = activeLogId;
    loadSettings();
    updateAccountRoleUI();
    hideAllPages();
    document.getElementById('personalInfoPage').classList.remove('hidden');
    setActiveNav('personal');

    // 소속 기사이고 이미 연동돼 있으면, 연결된 차량의 사업자정보/차량정보가 그 사이 바뀌었을
    // 수 있으니 화면을 열 때마다 최신값으로 다시 채운다(화면을 막지 않게 백그라운드로).
    // 로컬 캐시(employerLink.vehicleId/ownerId)는 차주가 이 기사를 다른 차량으로 재할당했을
    // 때 바로 갱신되지 않으므로, driver_links를 supabaseId 기준으로 서버에서 다시 읽어
    // 지금 실제로 배정된 owner_id/vehicle_id를 확보한 뒤에만 자동반영을 실행한다(요구사항:
    // 차량 재할당 시에도 항상 서버 기준 최신 차량의 사업자정보를 써야 함).
    const settings = getUserSettings();
    const link = settings.employerLink;
    if (link?.status === 'linked' && typeof applyEmployerAutoFilledInfo === 'function') {
        (async () => {
            try {
                let ownerId = link.ownerId || null;
                let vehicleId = link.vehicleId || null;
                if (typeof getSupabaseClient === 'function' && link.supabaseId) {
                    const client = await getSupabaseClient();
                    const { data } = await client.from('driver_links').select('owner_id, vehicle_id').eq('id', link.supabaseId).maybeSingle();
                    if (data?.owner_id) { ownerId = data.owner_id; vehicleId = data.vehicle_id; }
                }
                if (ownerId) await applyEmployerAutoFilledInfo(ownerId, vehicleId);
            } catch (error) {
                console.error('연동된 차주/차량 정보 재조회 실패(로컬 캐시로 계속 진행):', error);
            }
        })();
    }
}

function goBackFromPersonalInfo() {
    if (personalInfoReturnPage === 'tax') {
        showTaxInvoices(utilityReturnPage);
    } else if (personalInfoReturnPage === 'myPage') {
        showMyPage(true);
    } else {
        returnToLogHome(personalInfoReturnLogId);
    }
}

function showCustomerCenter(returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    hideAllPages();
    document.getElementById('customerCenterPage').classList.remove('hidden');
    // 이전 방문에서 "1:1 문의" 탭을 보고 있었더라도, 고객센터에 다시 들어올 때는 항상
    // 첫 번째 탭(FAQ)이 기본으로 보이게 초기화한다.
    const faqTabBtn = document.querySelector('.support-tab:first-child');
    if (faqTabBtn) openSupportTab('faq', faqTabBtn);
}

function openSupportTab(tabName, button) {
    document.querySelectorAll('.support-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.support-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`support-${tabName}`).classList.remove('hidden');
    button.classList.add('active');
    if (tabName === 'myInquiries') renderMyInquiries();
}

function toggleSupportItem(item) {
    item.classList.toggle('open');
    const icon = item.querySelector('i');
    if (icon) icon.textContent = item.classList.contains('open') ? '−' : '+';
}

function getSupportInquiries() {
    try {
        const inquiries = JSON.parse(localStorage.getItem('supportInquiries') || '[]');
        return Array.isArray(inquiries) ? inquiries : [];
    } catch (error) {
        return [];
    }
}

function submitSupportInquiry(event) {
    event.preventDefault();
    const inquiry = {
        id: generateLocalId('inquiry'),
        type: document.getElementById('inquiryType').value,
        title: document.getElementById('inquiryTitle').value.trim(),
        content: document.getElementById('inquiryContent').value.trim(),
        status: 'open',
        answer: '',
        answeredAt: '',
        createdAt: new Date().toISOString()
    };
    const inquiries = getSupportInquiries();
    inquiries.unshift(inquiry);
    localStorage.setItem('supportInquiries', JSON.stringify(inquiries));
    // 예전엔 이 기기 안에만 저장되고 실제로는 아무 데도 전달되지 않았다(§전수 점검에서 발견).
    // 이제 Supabase로도 반영해서 실제로 확인 가능하게 한다.
    if (typeof scheduleSupabaseInquirySync === 'function') scheduleSupabaseInquirySync(inquiry.id);
    event.target.reset();
    showToastMessage('문의가 접수되었습니다.');
    renderMyInquiries();
}

// "나의 문의·건의 확인" 탭 — 본인이 접수한 문의를 최신순으로 보여준다. 아직 사장님이 답변
// 기능을 안 만드셨어도(=support_inquiries.answer가 비어있어도) 목록/상태는 바로 쓸 수 있게
// "답변 대기" 상태로 표시해 둔다.
function renderMyInquiries() {
    const container = document.getElementById('myInquiriesList');
    if (!container) return;
    const inquiries = getSupportInquiries();

    if (!inquiries.length) {
        container.innerHTML = '<div class="support-panel-empty">아직 접수한 문의·건의가 없습니다.</div>';
        return;
    }

    container.innerHTML = inquiries.map(inquiry => {
        const answered = !!inquiry.answer;
        const dateText = inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString('ko-KR') : '';
        return `
            <div class="my-inquiry-card">
                <div class="my-inquiry-head">
                    <span class="my-inquiry-type">${escapeDetailText(inquiry.type || '문의')}</span>
                    <span class="my-inquiry-status ${answered ? 'answered' : 'pending'}">${answered ? '답변 완료' : '답변 대기'}</span>
                </div>
                <strong class="my-inquiry-title">${escapeDetailText(inquiry.title || '')}</strong>
                <p class="my-inquiry-content">${escapeDetailText(inquiry.content || '')}</p>
                <div class="my-inquiry-date">${dateText}</div>
                ${answered ? `<div class="my-inquiry-answer"><span class="my-inquiry-answer-label">운영자 답변</span><p>${escapeDetailText(inquiry.answer)}</p></div>` : ''}
            </div>
        `;
    }).join('');
}

// 회원탈퇴 — 실제로 Supabase 계정과 그 계정에 연결된 모든 데이터(vehicles/clients/
// daily_logs/... 전부, DB의 cascade 설정으로 자동 삭제)를 지우는 되돌릴 수 없는 작업이다.
// 그래서 확인을 두 단계로 나눈다: 1단계 경고 → 2단계 최종 확인 → 그 다음에야 실제 삭제.
// showConfirmModal()의 executeConfirm()은 콜백 실행 직후 곧바로 closeConfirmModal()을
// 호출하므로, 콜백 안에서 바로 showConfirmModal()을 또 열면 그 트레일링 close가 방금 연
// 두 번째 모달까지 닫아버린다. 그래서 두 번째 모달은 setTimeout으로 다음 태스크로 미뤄서 연다.
function requestWithdrawal() {
    showConfirmModal(
        '정말 탈퇴하시겠습니까?\n모든 운행 기록, 거래처, 정산 데이터가 영구적으로 삭제되며 복구할 수 없습니다.',
        () => {
            setTimeout(() => {
                showConfirmModal(
                    '이 작업은 취소할 수 없습니다.\n한 번 더 확인해 주세요 — 정말로 계정과 모든 데이터를 영구 삭제할까요?',
                    executeAccountWithdrawal,
                    { title: '마지막 확인', confirmLabel: '영구 삭제', cancelLabel: '취소', tone: 'danger' }
                );
            }, 0);
        },
        { title: '회원 탈퇴', confirmLabel: '탈퇴하기', cancelLabel: '취소', tone: 'danger' }
    );
}

async function executeAccountWithdrawal() {
    if (typeof getSupabaseClient !== 'function') {
        showToastMessage('탈퇴 처리에 필요한 기능을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', { duration: 5000 });
        return;
    }

    try {
        const client = await getSupabaseClient();
        const { error } = await client.rpc('delete_own_account');
        if (error) throw error;
    } catch (error) {
        // 서버 삭제가 실패했다면 로컬 데이터는 절대 건드리지 않는다 — 서버는 안 지워졌는데
        // 로컬만 지우면 사용자가 자기 데이터를 그냥 잃어버리는 최악의 상황이 된다.
        console.error('회원 탈퇴 실패:', error);
        showToastMessage(getSaveErrorMessage(error) || '탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', { duration: 5000 });
        return;
    }

    // 서버 삭제 성공을 확인한 뒤에만 로컬을 정리한다.
    try {
        if (typeof supabaseSignOutSafely === 'function') await supabaseSignOutSafely();
    } catch (error) {
        console.error('탈퇴 후 로그아웃 처리 실패(로컬 정리는 계속 진행):', error);
    }
    localStorage.clear();
    showToastMessage('탈퇴가 완료되었습니다.', { duration: 1500 });
    // 메모리에 남아있는 이전 계정의 상태(workData 등)까지 완전히 비우고 첫 화면(계정 유형
    // 선택)부터 다시 시작하도록, 토스트를 보여줄 시간만 두고 전체 새로고침한다.
    setTimeout(() => location.reload(), 1200);
}
