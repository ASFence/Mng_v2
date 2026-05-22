// =============================================
// 복무관리 웹앱 - Code.gs
// =============================================
// [환경변수 관리]
// 모든 민감 정보는 Apps Script PropertiesService에 저장합니다.
// 하드코딩된 시크릿 값이 없습니다.
//
// ★ 초기 설정 방법:
//   Apps Script 편집기에서 initProperties() 함수를 1회 실행하세요.
//   이후 값 변경은 updateProperty() 또는 스크립트 속성 UI에서 가능합니다.
//
// ★ 스크립트 속성 확인/수정 UI:
//   편집기 → 프로젝트 설정 → 스크립트 속성
// =============================================

// ── 환경변수 로더 ────────────────────────────
// PropertiesService = Apps Script의 .env
function getConfig() {
  const props = PropertiesService.getScriptProperties().getProperties();

  // 필수 속성 누락 검사
  const required = ['SPREADSHEET_ID','API_TOKEN','ALLOWED_ORIGINS'];
  const missing  = required.filter(k => !props[k]);
  if (missing.length > 0) {
    throw new Error(
      '환경변수 미설정: ' + missing.join(', ') +
      '\nApps Script 편집기에서 initProperties()를 실행하세요.'
    );
  }

  return {
    SPREADSHEET_ID  : props.SPREADSHEET_ID,
    SHEET_RECORD    : props.SHEET_RECORD    || '기록DB',
    SHEET_DOOR      : props.SHEET_DOOR      || '출입문DB',
    SHEET_USERS     : props.SHEET_USERS     || '사용자DB',
    SHEET_AUDIT     : props.SHEET_AUDIT     || '감사로그',
    API_TOKEN       : props.API_TOKEN,
    ALLOWED_ORIGINS : props.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
    MAX_USERNAME_LEN: parseInt(props.MAX_USERNAME_LEN) || 20,
    MAX_MEMO_LEN    : parseInt(props.MAX_MEMO_LEN)     || 200,
    MAX_NUM_LEN     : parseInt(props.MAX_NUM_LEN)      || 10,
  };
}

// ── ★ 초기 환경변수 설정 함수 ────────────────
// Apps Script 편집기에서 1회만 실행하세요.
// 이후 값은 스크립트 속성 UI에서 직접 수정 가능합니다.
function initProperties() {
  const props = PropertiesService.getScriptProperties();

  // ★ 아래 값들을 실제 값으로 수정 후 실행하세요
  // ★ SPREADSHEET_ID, API_TOKEN은 반드시 실제 값으로 교체 후 실행하세요.
  //    이 파일에 실제 값을 입력한 채로 버전 관리(Git 등)에 커밋하지 마세요.
  const SPREADSHEET_ID_VALUE  = 'YOUR_SPREADSHEET_ID_HERE';          // 필수 교체
  const API_TOKEN_VALUE       = 'YOUR_RANDOM_SECRET_KEY_MIN_32CHARS'; // 필수 교체
  const ALLOWED_ORIGINS_VALUE = 'https://yourusername.github.io,http://localhost:3000'; // 필수 교체

  // 필수 값 미교체 방어
  if (SPREADSHEET_ID_VALUE === 'YOUR_SPREADSHEET_ID_HERE') {
    Logger.log('❌ SPREADSHEET_ID를 실제 값으로 교체하세요. 설정을 중단합니다.');
    return;
  }
  if (API_TOKEN_VALUE.length < 32 || API_TOKEN_VALUE === 'YOUR_RANDOM_SECRET_KEY_MIN_32CHARS') {
    Logger.log('❌ API_TOKEN을 32자 이상의 랜덤 문자열로 교체하세요. 설정을 중단합니다.');
    return;
  }

  props.setProperties({
    // 구글 시트 ID (URL에서 /d/ 뒤 부분)
    'SPREADSHEET_ID'  : SPREADSHEET_ID_VALUE,

    // ★ API 인증 토큰 — 반드시 복잡한 랜덤 문자열로 변경
    // 생성: https://randomkeygen.com → 504-bit WEP Key
    'API_TOKEN'       : API_TOKEN_VALUE,

    // ★ 허용할 프론트엔드 도메인 (쉼표로 구분)
    'ALLOWED_ORIGINS' : ALLOWED_ORIGINS_VALUE,

    // 시트명 (기본값 사용 시 생략 가능)
    'SHEET_RECORD'    : '기록DB',
    'SHEET_DOOR'      : '출입문DB',
    'SHEET_USERS'     : '사용자DB',
    'SHEET_AUDIT'     : '감사로그',

    // 입력 제한
    'MAX_USERNAME_LEN': '20',
    'MAX_MEMO_LEN'    : '200',
    'MAX_NUM_LEN'     : '10',
  });

  Logger.log('✅ 환경변수 설정 완료');
  Logger.log('설정된 속성: ' + JSON.stringify(
    PropertiesService.getScriptProperties().getProperties()
  ));
}

// ── 특정 속성 값 업데이트 ─────────────────────
// 예: updateProperty('API_TOKEN', '새로운토큰값')
function updateProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
  Logger.log('✅ 업데이트 완료: ' + key);
}

// ── 현재 설정 확인 (토큰 값은 마스킹) ──────────
function checkProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const masked = Object.fromEntries(
    Object.entries(props).map(([k,v]) =>
      k === 'API_TOKEN'
        ? [k, v.substring(0,6) + '***' + v.substring(v.length-4)]
        : [k, v]
    )
  );
  Logger.log('현재 환경변수:\n' + JSON.stringify(masked, null, 2));
}

// ── 모든 속성 초기화 (주의: 되돌릴 수 없음) ────
function clearProperties() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('⚠️ 모든 환경변수가 삭제되었습니다.');
}

// =============================================
//  이하 API 로직 (환경변수 외 수정 불필요)
// =============================================

// ── 웹앱 진입점 ──────────────────────────────
function doGet(e) {
  if (e && e.parameter && e.parameter.api) {
    return handleAPI(e);
  }
  return HtmlService.createHtmlOutput(
    '<h3 style="font-family:sans-serif;color:#1A56DB;">✅ Service Running</h3>'
  ).setTitle('API');
}

function doPost(e) {
  if (e && (e.postData || e.parameter)) {
    return handleAPI(e);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ success:false, message:'잘못된 요청' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── JSON 응답 (CORS 헤더) ─────────────────────
function jsonResponse(data, origin, cfg) {
  // Apps Script redirect changes Origin to null; '*' is the only reliable CORS value.
  // Security is handled by API token, not CORS origin restriction.
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Token');
}

// ── 보안: 토큰 인증 ───────────────────────────
// 토큰이 비어있거나 불일치하면 항상 거부합니다.
// 개발 환경에서도 반드시 유효한 토큰이 필요합니다.
function verifyToken(token, cfg) {
  if (!token || token.trim() === '') return false;
  return token === cfg.API_TOKEN;
}

// ── 보안: 입력값 무해화 ───────────────────────
function sanitize(value, maxLen) {
  if (value === null || value === undefined) return '';
  let v = String(value).trim().substring(0, maxLen);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  v = v.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return v;
}

// ── 보안: 사용자 인가 ─────────────────────────
// ★ 주의(Fail-Closed): 사용자DB 시트가 비어 있거나 존재하지 않으면
//   모든 사용자 요청이 거부됩니다.
//   배포 전 반드시 사용자DB 시트 2행부터 허가된 사용자명을 입력하세요.
function isAuthorizedUser(userName, cfg) {
  if (!userName) return false;
  try {
    const ss    = SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(cfg.SHEET_USERS);
    if (!sheet || sheet.getLastRow() <= 1) return false;
    const users = sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().flat();
    return users.map(u => String(u).trim()).includes(userName.trim());
  } catch(e) { console.error('isAuthorizedUser 오류:', e); return false; }
}

// ── 감사 로그 ────────────────────────────────
function writeAuditLog(level, userName, message, detail, cfg) {
  try {
    const ss    = SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
    let sheet   = ss.getSheetByName(cfg.SHEET_AUDIT);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.SHEET_AUDIT);
      sheet.appendRow(['타임스탬프','레벨','사용자','메시지','상세']);
      sheet.getRange(1,1,1,5).setFontWeight('bold').setBackground('#374151').setFontColor('#fff');
      sheet.setFrozenRows(1);
    }
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([ts, level||'INFO', userName||'-', message||'', detail||'']);
  } catch(e) { console.error('감사로그 오류:', e); }
}

// ── API 라우터 ───────────────────────────────
function handleAPI(e) {
  let cfg;
  const origin = e.parameter.origin || '';

  try {
    cfg = getConfig(); // 환경변수 로드
  } catch(err) {
    // 환경변수 미설정 시 — 내부 오류 상세는 외부에 노출하지 않음
    console.error('getConfig 오류:', err);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: '서버 설정 오류가 발생했습니다. 관리자에게 문의하세요.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const token    = e.parameter.token  || '';
  const action   = e.parameter.action || '';
  const userName = sanitize(e.parameter.userName || '', cfg.MAX_USERNAME_LEN);

  // 미등록 Origin 감사 로그
  if (origin && !cfg.ALLOWED_ORIGINS.includes(origin)) {
    writeAuditLog('WARN', '-', '미등록 Origin 접근', origin, cfg);
  }

  // 토큰 인증
  if (!verifyToken(token, cfg)) {
    writeAuditLog('WARN', userName, '인증 실패', action, cfg);
    return jsonResponse({ success:false, message:'인증 실패' }, origin, cfg);
  }

  // 허용된 action 화이트리스트
  const ALLOWED = ['scanAndSave','saveRecord','getRecentRecords','recordConsent'];
  if (!ALLOWED.includes(action)) {
    writeAuditLog('WARN', userName, '허용되지 않은 action', action, cfg);
    return jsonResponse({ success:false, message:'허용되지 않은 요청' }, origin, cfg);
  }

  try {
    let result;
    switch (action) {

      case 'scanAndSave': {
        let raw;
        try { raw = JSON.parse(e.parameter.data || '{}'); }
        catch { return jsonResponse({ success:false, message:'잘못된 요청 형식입니다' }, origin, cfg); }
        const data = {
          userName : sanitize(raw.userName, cfg.MAX_USERNAME_LEN),
          num      : sanitize(raw.num,      cfg.MAX_NUM_LEN),
          rawData  : sanitize(raw.rawData,  500)
        };
        if (!isAuthorizedUser(data.userName, cfg)) {
          writeAuditLog('WARN', data.userName, '미등록 사용자', action, cfg);
          return jsonResponse({ success:false, message:'등록되지 않은 사용자입니다' }, origin, cfg);
        }
        writeAuditLog('INFO', data.userName, 'QR스캔', 'num='+data.num, cfg);
        result = scanAndSave(data, cfg);
        break;
      }

      case 'saveRecord': {
        let raw;
        try { raw = JSON.parse(e.parameter.data || '{}'); }
        catch { return jsonResponse({ success:false, message:'잘못된 요청 형식입니다' }, origin, cfg); }
        const data = {
          userName    : sanitize(raw.userName,     cfg.MAX_USERNAME_LEN),
          recordType  : sanitize(raw.recordType,   20),
          cnum        : sanitize(raw.cnum,         50),
          locationName: sanitize(raw.locationName, 100),
          address     : sanitize(raw.address,      200),
          lat         : sanitize(raw.lat,          20),
          lng         : sanitize(raw.lng,          20),
          memo        : sanitize(raw.memo,         cfg.MAX_MEMO_LEN)
        };
        if (!isAuthorizedUser(data.userName, cfg)) {
          writeAuditLog('WARN', data.userName, '미등록 사용자', action, cfg);
          return jsonResponse({ success:false, message:'등록되지 않은 사용자입니다' }, origin, cfg);
        }
        writeAuditLog('INFO', data.userName, 'GPS기록', `lat=${data.lat},lng=${data.lng}`, cfg);
        result = saveRecord(data, cfg);
        break;
      }

      case 'getRecentRecords': {
        if (!userName) {
          return jsonResponse({ success:false, message:'사용자명이 필요합니다' }, origin, cfg);
        }
        if (!isAuthorizedUser(userName, cfg)) {
          writeAuditLog('WARN', userName, '미등록 사용자', action, cfg);
          return jsonResponse({ success:false, message:'등록되지 않은 사용자입니다' }, origin, cfg);
        }
        const limit = Math.min(parseInt(e.parameter.limit)||3, 10);
        result = getRecentRecords(userName, limit, cfg);
        break;
      }

      case 'recordConsent': {
        if (!userName) {
          return jsonResponse({ success:false, message:'사용자명이 필요합니다' }, origin, cfg);
        }
        const consentAction = sanitize(e.parameter.consentAction || 'accept', 10);
        const label = consentAction === 'revoke' ? '위치정보동의철회' : '위치정보동의수락';
        writeAuditLog('INFO', userName, label, `consentAt=${new Date().toISOString()}`, cfg);
        result = { success: true };
        break;
      }
    }
    return jsonResponse(result, origin, cfg);

  } catch(err) {
    console.error('API 오류:', err);
    writeAuditLog('ERROR', userName, 'API 오류', err.toString(), cfg);
    return jsonResponse({ success:false, message:'서버 오류가 발생했습니다' }, origin, cfg);
  }
}

// ── QR 스캔 통합 처리 ────────────────────────
function scanAndSave(data, cfg) {
  const ss = SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
  let cnum='', address='', lat='', lng='';
  let doorFound=false;

  if (data.num) {
    const doorSheet = ss.getSheetByName(cfg.SHEET_DOOR);
    if (doorSheet && doorSheet.getLastRow() > 1) {
      const rows = doorSheet.getRange(2,1,doorSheet.getLastRow()-1,5).getValues();
      const row  = rows.find(r => String(r[0]).trim() === String(data.num).trim());
      if (row) {
        doorFound = true;
        cnum    = sanitize(String(row[1]), 50);
        address = sanitize(String(row[2]), 200);
        lng     = sanitize(String(row[3]), 20); // x = 경도
        lat     = sanitize(String(row[4]), 20); // y = 위도
      }
    }
  }

  if (!doorFound) cnum = data.num ? 'num:'+data.num : '미등록QR';

  const saved = saveRecord({
    userName:data.userName, recordType:'QR스캔',
    cnum, locationName:cnum, address, lat, lng, memo:''
  }, cfg);

  return Object.assign(saved, { doorFound, cnum, address, lat, lng });
}

// ── 기록DB 저장 ──────────────────────────────
function saveRecord(data, cfg) {
  const ss    = SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(cfg.SHEET_RECORD);
  if (!sheet) return { success:false, message:'시트 없음: '+cfg.SHEET_RECORD };

  if (sheet.getLastRow() === 0) {
    const h = ['연번','타임스탬프','사용자명','기록유형','관리번호','위치명','주소','위도','경도','비고'];
    sheet.appendRow(h);
    sheet.getRange(1,1,1,h.length).setFontWeight('bold').setBackground('#1A56DB').setFontColor('#fff');
    sheet.setFrozenRows(1);
  }

  const ts     = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  // appendRow 이전 getLastRow()는 현재 마지막 행 번호(헤더 포함).
  // 새 행은 그 다음에 삽입되므로 연번 = getLastRow() + 1.
  const nextNo = sheet.getLastRow() + 1;

  if (!data.userName || data.userName === '(미입력)') {
    writeAuditLog('WARN', '-', '사용자명 없이 저장', JSON.stringify({cnum:data.cnum}), cfg);
  }

  sheet.appendRow([
    nextNo, ts,
    data.userName     || '(미입력)',
    data.recordType   || 'QR스캔',
    data.cnum         || '',
    data.locationName || '',
    data.address      || '',
    data.lat          || '',
    data.lng          || '',
    data.memo         || ''
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow,1,1,10).setBackground(lastRow%2===0?'#EFF6FF':'#FFFFFF');

  return { success:true, rowNo:nextNo, timestamp:ts };
}

// ── 최근 기록 조회 ───────────────────────────
function getRecentRecords(userName, limit, cfg) {
  if (!userName) return { success: true, data: [] };
  const ss    = SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(cfg.SHEET_RECORD);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const records = sheet.getRange(2,1,sheet.getLastRow()-1,10).getValues()
    .filter(r => r[2] === userName)
    .reverse().slice(0, limit)
    .map(r => {
      // r[1]은 시트에서 Date 객체 또는 문자열로 읽힐 수 있음
      let ts = '';
      if (r[1]) {
        const d = r[1] instanceof Date ? r[1] : new Date(r[1]);
        ts = isNaN(d.getTime()) ? String(r[1]) : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      }
      return {
        rowNo: r[0], timestamp: ts,
        userName: r[2], recordType: r[3], cnum: r[4],
        locationName: r[5], address: r[6], lat: r[7], lng: r[8], memo: r[9]
      };
    });

  return { success: true, data: records };
}

// ── 디버그 ───────────────────────────────────
function debugSheets() {
  const cfg = getConfig();
  const ss  = SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
  Logger.log('시트 목록: ' + JSON.stringify(ss.getSheets().map(s => s.getName())));
}
