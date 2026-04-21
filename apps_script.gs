/**
 * Google Apps Script — Hoàn thiện Hồ sơ Nhân sự 30Shine 2026
 * Form profile thợ: Stylist/SMST + Skinner (gộp 1 Spreadsheet, 2 tab riêng)
 * -----------------------------------------------------------------------
 * STRUCTURE:
 *   - 1 Google Spreadsheet
 *   - Tab "Stylist": nhận cả Stylist và SMST (theo role chọn ở landing)
 *   - Tab "Skinner": nhận Skinner
 *   - Router: đọc field `role` từ payload → append vào đúng tab
 *
 * SETUP:
 *   1. Tạo Google Sheet mới, đặt tên "Hồ sơ Nhân sự 30Shine — Responses 2026"
 *   2. Trong sheet → Extensions → Apps Script → paste toàn bộ code này
 *   3. Ctrl+S → đặt tên project: "Profile Tho Receiver"
 *   4. Chọn function `setupSheets` → Run → Authorize
 *      → 2 tab "Stylist" + "Skinner" được tạo với header đầy đủ
 *   5. Deploy → New deployment → chọn type Web app
 *      - Execute as: Me (lanthuhr@...)
 *      - Who has access: Anyone
 *      → Copy Web app URL
 *   6. Mở index.html → thay biến GOOGLE_SCRIPT_URL bằng URL vừa copy → commit + push
 *
 * TEST:
 *   - Chạy function testStylist() hoặc testSkinner() để test không cần deploy
 *   - Sau khi deploy, có thể dùng gh api hoặc Postman để gửi POST tới URL
 *
 * NOTE: Script dùng getActiveSpreadsheet() — tự động trỏ vào sheet mà
 * script được tạo trong đó (bound script), không cần paste SHEET_ID.
 */

// ============================================================
// HEADER DEFINITIONS (chung cho Stylist/SMST và Skinner)
// ============================================================
// Cả 2 tab dùng cùng cấu trúc header vì form giống nhau, chỉ khác
// options trong 1 vài câu → dễ phân tích đồng nhất sau này.
const HEADERS = [
  'submission_id', 'timestamp', 'role',
  // A — Thông tin cơ bản (7)
  'A0_ho_ten', 'A1_ma_nv', 'A2_sdt_zalo', 'A3_salon',
  'A4_vi_tri', 'A5_vao_30s_thang', 'A5_vao_30s_nam', 'A6_khu_vuc',
  // B — Hành trình nghề
  'B1_tong_nam_kinh_nghiem',
  'B2_hoc_nghe', 'B2_hoc_nghe_other',
  'B3_wp_chua_tung_lam_o_dau_khac',
  // B3 — 3 nơi làm, mỗi nơi 10 field (30 cột)
  'B3_wp1_ten', 'B3_wp1_dia_chi', 'B3_wp1_con_hoat_dong', 'B3_wp1_vi_tri',
  'B3_wp1_tu_thang', 'B3_wp1_tu_nam', 'B3_wp1_den_thang', 'B3_wp1_den_nam',
  'B3_wp1_thu_nhap', 'B3_wp1_co_che',
  'B3_wp2_ten', 'B3_wp2_dia_chi', 'B3_wp2_con_hoat_dong', 'B3_wp2_vi_tri',
  'B3_wp2_tu_thang', 'B3_wp2_tu_nam', 'B3_wp2_den_thang', 'B3_wp2_den_nam',
  'B3_wp2_thu_nhap', 'B3_wp2_co_che',
  'B3_wp3_ten', 'B3_wp3_dia_chi', 'B3_wp3_con_hoat_dong', 'B3_wp3_vi_tri',
  'B3_wp3_tu_thang', 'B3_wp3_tu_nam', 'B3_wp3_den_thang', 'B3_wp3_den_nam',
  'B3_wp3_thu_nhap', 'B3_wp3_co_che',
  // C — Thế mạnh
  'C1_dich_vu_tu_tin',
  'C2_tep_khach',
  'C3_ngoai_ngu', 'C3_ngoai_ngu_other'
];

// ============================================================
// MAIN HANDLER
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const role = data.role;

    if (role !== 'Skinner' && role !== 'Stylist') {
      throw new Error('Invalid role: ' + role);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(role) || ss.insertSheet(role);

    // Auto-init header nếu sheet rỗng
    if (sheet.getLastRow() === 0) {
      initSheetHeader(sheet, role);
    }

    const submissionId = Utilities.getUuid();
    const timestamp = data.timestamp || new Date().toISOString();

    const row = buildRow(data, submissionId, timestamp, role);
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'ok',
        submission_id: submissionId,
        role: role
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// HELPERS
// ============================================================
function initSheetHeader(sheet, role) {
  // Đảm bảo sheet có đủ cột trước khi setValues — sheet mới default 26 cột,
  // sheet cũ có thể chỉ 46 cột từ lần setup trước. Nếu setValues vượt dimension
  // sẽ throw error và row 1 sẽ không có header.
  const need = HEADERS.length;
  const maxCol = sheet.getMaxColumns();
  if (maxCol < need) {
    sheet.insertColumnsAfter(maxCol, need - maxCol);
  }
  // Ghi header vào row 1
  sheet.getRange(1, 1, 1, need).setValues([HEADERS]);
  const bg = (role === 'Skinner') ? '#8B1538' : '#1B3A6B';
  sheet.getRange(1, 1, 1, need)
    .setFontWeight('bold')
    .setBackground(bg)
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 220); // submission_id
  sheet.setColumnWidth(2, 160); // timestamp
}

function headersNeedUpdate(sheet) {
  if (sheet.getLastRow() === 0) return true;
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  if (current.length !== HEADERS.length) return true;
  for (let i = 0; i < HEADERS.length; i++) {
    if (current[i] !== HEADERS[i]) return true;
  }
  return false;
}

function buildRow(data, submissionId, timestamp, role) {
  // Normalize helpers
  const s = v => (v === undefined || v === null) ? '' : String(v);
  const joinArr = v => Array.isArray(v) ? v.join('; ') : s(v);

  // A5 monthyear: data.A5 = { month, year }
  const A5 = data.A5 || {};
  // B2 radioWithOther: data.B2 = { choice, other }
  const B2 = data.B2 || {};
  // B3 workplaces: data.B3 = { none, list:[{ten, khu_vuc, vi_tri, tu:{month,year}, den:{month,year}, thu_nhap, co_che}] }
  const B3 = data.B3 || { none: false, list: [] };
  const wp = i => (B3.list && B3.list[i]) || {};
  const wpTu = i => (wp(i).tu || {});
  const wpDen = i => (wp(i).den || {});
  // C3 checkboxWithOther: data.C3 = { items:[], other:'' }
  const C3 = data.C3 || { items: [], other: '' };

  return [
    submissionId, timestamp, role,
    // A
    s(data.A0), s(data.A1), s(data.A2), s(data.A3),
    s(data.A4), s(A5.month), s(A5.year), s(data.A6),
    // B1
    s(data.B1),
    // B2
    s(B2.choice), s(B2.other),
    // B3 none flag
    B3.none ? 'Chưa từng làm ở đâu khác' : '',
    // B3 workplaces × 3 (ten, dia_chi, con_hoat_dong, vi_tri, tu, den, thu_nhap, co_che)
    s(wp(0).ten), s(wp(0).khu_vuc), s(wp(0).con_hoat_dong), s(wp(0).vi_tri),
    s(wpTu(0).month), s(wpTu(0).year), s(wpDen(0).month), s(wpDen(0).year),
    s(wp(0).thu_nhap), s(wp(0).co_che),
    s(wp(1).ten), s(wp(1).khu_vuc), s(wp(1).con_hoat_dong), s(wp(1).vi_tri),
    s(wpTu(1).month), s(wpTu(1).year), s(wpDen(1).month), s(wpDen(1).year),
    s(wp(1).thu_nhap), s(wp(1).co_che),
    s(wp(2).ten), s(wp(2).khu_vuc), s(wp(2).con_hoat_dong), s(wp(2).vi_tri),
    s(wpTu(2).month), s(wpTu(2).year), s(wpDen(2).month), s(wpDen(2).year),
    s(wp(2).thu_nhap), s(wp(2).co_che),
    // C
    joinArr(data.C1),
    joinArr(data.C2),
    joinArr(C3.items), s(C3.other)
  ];
}

// ============================================================
// SETUP — Chạy 1 lần để tạo 2 tab với header
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Tab Stylist
  let stylist = ss.getSheetByName('Stylist');
  if (!stylist) stylist = ss.insertSheet('Stylist');
  if (headersNeedUpdate(stylist)) initSheetHeader(stylist, 'Stylist');

  // Tab Skinner
  let skinner = ss.getSheetByName('Skinner');
  if (!skinner) skinner = ss.insertSheet('Skinner');
  if (headersNeedUpdate(skinner)) initSheetHeader(skinner, 'Skinner');

  // Xóa sheet mặc định nếu còn
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  Logger.log('===== SETUP XONG =====');
  Logger.log('Tab "Stylist": ' + HEADERS.length + ' cột');
  Logger.log('Tab "Skinner": ' + HEADERS.length + ' cột');
  Logger.log('Sheet URL: ' + ss.getUrl());
  Logger.log('Bước tiếp: Deploy → New deployment → Web app → copy URL dán vào index.html');
  return 'OK - Setup xong. Kiểm tra Logger để xem chi tiết.';
}

// ============================================================
// TEST — Gửi data mẫu không cần deploy
// ============================================================
function testStylist() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        role: 'Stylist',
        timestamp: new Date().toISOString(),
        A0: 'Nguyễn Văn Test', A1: '30S99999', A2: '0912345678',
        A3: '10 TP', A4: 'Stylist',
        A5: { month: '6', year: '2022' }, A6: 'Cầu Giấy, Hà Nội',
        B1: '3–5 năm',
        B2: { choice: 'Học từ salon/tiệm (học việc)', other: '' },
        B3: {
          none: false,
          list: [
            { ten: 'Salon Anh Tuấn', khu_vuc: '123 Thái Hà, P. Trung Liệt, Q. Đống Đa, Hà Nội',
              con_hoat_dong: 'Còn hoạt động', vi_tri: 'Stylist chính',
              tu: { month:'3', year:'2020' }, den: { month:'5', year:'2022' },
              thu_nhap: '16–20tr', co_che: 'Ăn chia' },
            { ten: 'Salon Kiệt', khu_vuc: '45 Quang Trung, P. Yết Kiêu, Q. Hà Đông, Hà Nội',
              con_hoat_dong: 'Đã đóng cửa', vi_tri: 'Học việc',
              tu: { month:'1', year:'2019' }, den: { month:'2', year:'2020' },
              thu_nhap: '<8tr', co_che: 'Chỉ lương cứng' },
            { ten:'', khu_vuc:'', con_hoat_dong:'', vi_tri:'', tu:{}, den:{}, thu_nhap:'', co_che:'' }
          ]
        },
        C1: ['Cắt nam nghệ thuật/kiểu Hàn/kiểu Âu','Nhuộm','Tạo kiểu (sáp, fume)'],
        C2: ['Khách trẻ (18–34)','Khách doanh nhân/công sở'],
        C3: { items: ['Tiếng Anh cơ bản'], other: '' }
      })
    }
  };
  const result = doPost(fake);
  Logger.log(result.getContent());
}

function testSkinner() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        role: 'Skinner',
        timestamp: new Date().toISOString(),
        A0: 'Trần Thị Test', A1: '30S88888', A2: '0987654321',
        A3: '99 TSN', A4: 'Skinner',
        A5: { month: '10', year: '2023' }, A6: 'Thanh Xuân, Hà Nội',
        B1: '1–3 năm',
        B2: { choice: 'Khác', other: 'Học tại tiệm tóc của dì' },
        B3: {
          none: false,
          list: [
            { ten: 'Spa Hoa Mai', khu_vuc: '88 Nguyễn Trãi, P. Thượng Đình, Q. Thanh Xuân, Hà Nội',
              con_hoat_dong: 'Không rõ', vi_tri: 'Gội cao cấp',
              tu: { month:'6', year:'2022' }, den: { month:'9', year:'2023' },
              thu_nhap: '7–10tr', co_che: 'Lương cứng + ăn chia' },
            { ten:'', khu_vuc:'', con_hoat_dong:'', vi_tri:'', tu:{}, den:{}, thu_nhap:'', co_che:'' },
            { ten:'', khu_vuc:'', con_hoat_dong:'', vi_tri:'', tu:{}, den:{}, thu_nhap:'', co_che:'' }
          ]
        },
        C1: ['Gội massage cao cấp (đầu – vai – gáy)','Đắp mặt nạ / chăm sóc da nam','Ráy tai / lấy ráy tai chuyên sâu'],
        C2: ['Khách yêu cầu cao về chăm sóc/thư giãn','Khách trẻ (18–34)'],
        C3: { items: ['Không'], other: '' }
      })
    }
  };
  const result = doPost(fake);
  Logger.log(result.getContent());
}
