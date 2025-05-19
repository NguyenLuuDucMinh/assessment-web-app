function doPost(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*',  // Cho phép tất cả các domain
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };

  if (e.parameter.method == 'OPTIONS') {
    return ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeaders(headers);
  }

  try {
    // Lấy dữ liệu từ request
    const data = JSON.parse(e.postData.contents);
    
    // Định nghĩa ID của Google Sheet và tên sheet
    const SHEET_ID = '1_YsKUUuEPBrFk8sswmBkPHbw-S3ySShhz11toEZoZwU';  // Thay thế bằng ID sheet của bạn
    const SHEET_NAME = 'De2';  // Thay thế bằng tên sheet của bạn
    
    // Mở spreadsheet theo ID
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Không tìm thấy sheet');
    }
    
    // Thêm dữ liệu vào sheet với nhiều thông tin hơn
    const basicInfo = [
        new Date(),                    // Timestamp
        data.studentInfo.name,         // Tên sinh viên
        data.studentInfo.school,       // Trường
        data.studentInfo.course,       // Ngành
        data.studentInfo.year,         // Năm học
        data.studentInfo.class,        // Khóa
        data.studentInfo.phone,        // Số điện thoại
        data.studentInfo.email,        // Email
        data.aiEvaluation.score,       // Điểm số
        data.aiEvaluation.grade,       // Xếp loại
        data.aiEvaluation.generalFeedback  // Đánh giá chung
    ];

    // Xử lý câu trả lời của sinh viên
    const answers = data.studentAnswers.reduce((acc, ans) => {
        acc[ans.id] = ans.answer;
        return acc;
    }, {});

    // Tạo mảng chứa câu trả lời cho 20 câu hỏi
    const answersArray = Array.from({ length: 20 }, (_, i) => {
        const qId = `q${i + 1}`;
        return answers[qId] || ''; // Nếu không có câu trả lời thì để trống
    });

    // Gộp thông tin cơ bản và câu trả lời
    const rowData = [...basicInfo, ...answersArray];
    
    // Thêm dữ liệu vào sheet
    sheet.appendRow(rowData);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': error }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  }
}

function doGet(e) {
  return doPost(e);
}