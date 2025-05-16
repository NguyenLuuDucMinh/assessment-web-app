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
    const SHEET_ID = '1BN0FJU1nfuvK5Jze0g9f8ycwAi31c4Uls2KJfYe2aHY';  // Thay thế bằng ID sheet của bạn
    const SHEET_NAME = 'Submissions';  // Thay thế bằng tên sheet của bạn
    
    // Mở spreadsheet theo ID
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Không tìm thấy sheet');
    }
    
    // Thêm dữ liệu vào sheet theo cấu trúc mới
    sheet.appendRow([
      new Date(),                              // Timestamp
      data.studentInfo.name,                   // Tên sinh viên
      data.studentInfo.school,                 // Trường
      data.studentInfo.course,                 // Khóa/Ngành
      data.studentInfo.submissionTime,         // Thời gian nộp bài
      data.aiEvaluation.score,                 // Điểm số
      data.aiEvaluation.grade,                 // Xếp loại
      data.aiEvaluation.generalFeedback,       // Đánh giá chung
      JSON.stringify(data.studentAnswers),     // Chi tiết câu trả lời
      JSON.stringify(data.aiEvaluation.detailedFeedback)  // Chi tiết đánh giá
    ]);

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