function doPost(e) {
  // Set CORS headers
  var headers = {
    'Access-Control-Allow-Origin': '*', // Cho phép tất cả origin trong môi trường development
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };

  // Handle OPTIONS request (preflight)
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
    
    // Thêm dữ liệu vào sheet
    sheet.appendRow([
      new Date(),  // Timestamp
      data.name,   // Tên
      data.email,  // Email
      data.score   // Điểm số
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