// ============================================================================
// 세금계산서 Supabase 동기화 (supabase-sync.js에서 분리 — §코드 쪼개기 1차, 테스트 저장소 한정)
// ============================================================================
// finance.js(getTaxInvoiceRecords 등)와 supabase-sync.js(getSupabaseUser,
// getSupabaseClient, queueBackgroundSave, getUserSettings, parseEntityNumber)에
// 의존한다. 전부 전역 함수이므로 로드 순서(finance.js → finance-sync.js →
// supabase-sync.js → script.js, index.html 참고)만 지키면 문제없다.
//
// 전수 점검 중 발견: 세금계산서는 작성(persistTaxInvoice)/발급완료 처리(changeTaxInvoiceStatus)
// 모두 localStorage(taxInvoiceRecords)에만 저장되고 있었다 — Supabase로는 계정 최초 생성 시
// 1회 마이그레이션(migrateLocalDataToSupabase)에서만 올라갔을 뿐, 그 이후의 신규 작성/상태
// 변경은 전혀 서버에 반영되지 않았다. 즉 기기를 바꾸거나 저장공간이 지워지면 세금계산서
// 작성/발급 이력이 통째로 사라지는 상태였다(실제로 코드 추적으로 확인됨). 이 앱에서 금액·
// 법적으로 가장 민감한 기록이라 최우선으로 고친다.

// item.carNumber(기사 매입/수수료 발행) 또는 item.vehicleNumbers[0](매출 발행, §오늘 차량별
// 분리 수정 이후 항상 차량 1대분) 순으로 차량번호를 찾고, 둘 다 없으면(매출 발행이 메인
// 차량 몫이면 vehicleNumbers 자체가 비어있다 — getVehicleSupplierIdentity가 메인 차량엔
// carNumber를 안 붙이기 때문) 메인 차량으로 간주한다.
function resolveTaxInvoiceVehicleId(item, settings) {
    const cars = Array.isArray(settings.cars) ? settings.cars : [];
    const carNumber = item.carNumber || (Array.isArray(item.vehicleNumbers) ? item.vehicleNumbers[0] : null);
    if (carNumber) {
        const car = cars.find(c => c.number === carNumber);
        return car?.supabaseId || null;
    }
    const mainCar = cars.find(c => c.type === 'main');
    return mainCar?.supabaseId || null;
}

// persistTaxInvoice()가 호출한다(작성/상태변경 둘 다 이 함수를 거친다). id는
// getTaxInvoiceRecordId()가 "flow|월|partyKey" 형태로 결정론적으로 만들어주므로, 같은
// 거래처·같은 달·같은 발행유형이면 항상 같은 id가 나온다 — 여러 기기에서 독립적으로 같은
// 항목을 먼저 만들어도 서버에 중복 행이 생기지 않고 자연스럽게 같은 레코드로 수렴한다.
function scheduleSupabaseTaxInvoiceSync(localId) {
    if (typeof queueBackgroundSave !== 'function' || !localId) return;
    queueBackgroundSave('supabase-tax-invoice-sync-' + localId, () => syncTaxInvoiceToSupabase(localId), 600);
}

async function syncTaxInvoiceToSupabase(localId) {
    const user = await getSupabaseUser();
    if (!user) return;

    // flush 시점의 최신 로컬 상태를 다시 읽는다(디바운스 구간에 여러 번 바뀌었어도 마지막
    // 상태만 반영하기 위함 — 다른 큐잉 저장들과 동일한 관례).
    const records = getTaxInvoiceRecords();
    const item = records.find(record => record.id === localId);
    if (!item) return;

    // 차량을 막 추가하자마자 그 차량 몫 계산서를 작성하면, 그 차량의 vehicles 행이 아직
    // Supabase에 안 만들어져 resolveTaxInvoiceVehicleId가 null을 반환할 수 있다. null은
    // 에러가 아니라서 그대로 두면 vehicle_id: null인 채로 조용히 저장되고, queueBackgroundSave는
    // 이걸 "성공"으로 간주해 재시도도 안 건다 — 운행기록 저장에서 이미 고친 것과 같은
    // 패턴이다(실제로 재현해서 확인). 최대 2.5초 재시도 후에도 안 되면 예외를 던져서
    // 실패 토스트/재시도 경로를 타게 한다.
    let vehicleId = resolveTaxInvoiceVehicleId(item, getUserSettings());
    for (let attempt = 0; !vehicleId && attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        vehicleId = resolveTaxInvoiceVehicleId(item, getUserSettings());
    }
    if (!vehicleId) {
        throw new Error('차량 정보가 아직 서버에 등록되지 않았습니다. 잠시 후 다시 시도해 주세요.');
    }

    const settings = getUserSettings();
    const matchedClient = (settings.clients || []).find(c => c.companyName === item.clientName);
    const row = {
        user_id: user.id,
        vehicle_id: vehicleId,
        client_id: matchedClient?.supabaseId || null,
        flow: item.flow || null,
        month_key: item.monthKey || null,
        supply_amount: parseEntityNumber(item.supplyAmount),
        tax_amount: parseEntityNumber(item.taxAmount),
        total_amount: parseEntityNumber(item.totalAmount),
        status: item.status || 'draft',
        raw: item
    };

    try {
        const client = await getSupabaseClient();
        if (item.supabaseId) {
            const { error } = await client.from('tax_invoices').update(row).eq('id', item.supabaseId);
            if (error) throw error;
        } else {
            const { data, error } = await client.from('tax_invoices').insert(row).select('id').single();
            if (error) throw error;
            // 방금 발급받은 supabaseId를 로컬에도 즉시 반영해서, 다음 저장부터는 update로
            // 가게 한다(안 그러면 저장할 때마다 새 행이 계속 insert된다).
            const freshRecords = getTaxInvoiceRecords();
            const idx = freshRecords.findIndex(record => record.id === localId);
            if (idx >= 0) {
                freshRecords[idx].supabaseId = data.id;
                localStorage.setItem('taxInvoiceRecords', JSON.stringify(freshRecords));
            }
        }
    } catch (error) {
        console.error('세금계산서 Supabase 저장 실패:', localId, error);
        throw error; // queueBackgroundSave가 실패 토스트/재시도를 처리하도록 그대로 던진다.
    }
}

// 로그인 시 서버의 tax_invoices를 로컬 taxInvoiceRecords와 합친다. 날짜 단위 병합(로컬에
// 있는데 서버 응답에 없으면 로컬 보존)과 같은 이유로, 여기서도 "로컬에서 지우고 서버 것으로
// 덮어쓰기"가 아니라 "id 기준으로 합치기"를 쓴다 — 다른 기기에서 아직 이 기기로 안 내려온
// 로컬 전용 초안까지 지워버리면 안 되기 때문이다.
async function initTaxInvoicesFromSupabase() {
    const user = await getSupabaseUser();
    if (!user) return;
    try {
        const client = await getSupabaseClient();
        const { data, error } = await client.from('tax_invoices').select('*').eq('user_id', user.id);
        if (error) throw error;

        const localRecords = getTaxInvoiceRecords();
        const merged = [...localRecords];
        (data || []).forEach(row => {
            const raw = (row.raw && typeof row.raw === 'object') ? row.raw : {};
            if (!raw.id) return; // raw가 비어있는(예전 마이그레이션 등) 행은 매칭할 로컬 id가 없어 건너뜀
            const record = { ...raw, supabaseId: row.id };
            const idx = merged.findIndex(item => item.id === record.id);
            if (idx >= 0) merged[idx] = record;
            else merged.push(record);
        });

        localStorage.setItem('taxInvoiceRecords', JSON.stringify(merged));
    } catch (error) {
        console.error('세금계산서 내역 Supabase 로드 실패(기존 로컬 데이터 보존):', error);
    }
}
