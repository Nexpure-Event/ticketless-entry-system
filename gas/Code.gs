/**
 * Ticketless Entry System - GAS Backend
 * 
 * This script handles:
 * - QR code generation and email distribution
 * - Check-in validation and recording
 * - Dashboard statistics
 * 
 * Database: Google Sheets "Attendees" sheet
 * Columns: ID | Name | Email | Token | CheckInTime | EmailSent | TicketType | StartTime | ReEntryHistory
 */

// ==================== CONFIGURATION ====================

const SHEET_NAME = 'Attendees';
const QR_CODE_SIZE = 300;
const QR_API_BASE = 'https://chart.googleapis.com/chart';

// Ticket Configuration: Map TicketType to StartTime
const TICKET_CONFIG = {
  'VIP': '18:30-19:00',
  'General': '11:00-12:00',
  '15400': '18:30-19:00', // Reception time for 15,400 yen
  '13200': '11:00-12:00'  // Reception time for 13,200 yen
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get the Attendees sheet
 */
function getAttendeesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    // Create sheet if it doesn't exist
    sheet = ss.insertSheet(SHEET_NAME);
    // Updated columns: Added ReEntryHistory (I)
    sheet.appendRow(['ID', 'Name', 'Email', 'Token', 'CheckInTime', 'EmailSent', 'TicketType', 'StartTime', 'ReEntryHistory']);
    sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  } else {
    // Check if new columns exist, if not add them (migration)
    const lastCol = sheet.getLastColumn();
    if (lastCol < 9) {
      if (lastCol < 7) {
        sheet.getRange(1, 7).setValue('TicketType');
        sheet.getRange(1, 8).setValue('StartTime');
      }
      sheet.getRange(1, 9).setValue('ReEntryHistory');
      sheet.getRange('G1:I1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    }
  }
  
  return sheet;
}

/**
 * Generate SHA-256 hash
 */
function generateHash(input) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  
  return rawHash.map(byte => {
    const v = (byte < 0) ? 256 + byte : byte;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

/**
 * Generate unique token for an attendee
 */
function generateToken(id, rowNumber) {
  const timestamp = new Date().getTime();
  const input = `${id}_${rowNumber}_${timestamp}`;
  return generateHash(input);
}

/**
 * Generate QR code URL
 */
function getQRCodeUrl(token) {
  return `${QR_API_BASE}?cht=qr&chs=${QR_CODE_SIZE}x${QR_CODE_SIZE}&chl=${encodeURIComponent(token)}`;
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Send tickets to all attendees who haven't received them yet
 * Run this manually from the Apps Script editor
 */
function sendTickets() {
  const sheet = getAttendeesSheet();
  const data = sheet.getDataRange().getValues();
  
  let sentCount = 0;
  let errorCount = 0;
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[0];
    const name = row[1];
    const email = row[2];
    let token = row[3];
    const emailSent = row[5];
    const ticketType = row[6] || 'General'; // Default to General
    const startTime = row[7] || '19:00';    // Default time
    
    // Skip if already sent
    if (emailSent === true || emailSent === 'TRUE') {
      continue;
    }
    
    // Skip if missing required data
    if (!id || !name || !email) {
      Logger.log(`Row ${i + 1}: Missing required data`);
      errorCount++;
      continue;
    }
    
    try {
      // Generate token if not exists
      if (!token) {
        token = generateToken(id, i + 1);
        sheet.getRange(i + 1, 4).setValue(token);
      }
      
      // Generate QR code URL (using api.qrserver.com as it's more reliable)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${QR_CODE_SIZE}x${QR_CODE_SIZE}&data=${encodeURIComponent(token)}`;
      
      // Fetch the QR code image as a blob
      let qrBlob;
      try {
        const response = UrlFetchApp.fetch(qrUrl);
        qrBlob = response.getBlob().setName("qrcode.png");
      } catch (e) {
        Logger.log(`Error fetching QR code for ${email}: ${e.message}`);
        errorCount++;
        continue;
      }
      
      // Send email with inline image
      const subject = 'イベント入場チケット / Event Entry Ticket';
      const htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4285f4;">イベント入場チケット</h2>
            <p>こんにちは、${name}様</p>
            <p>イベントへのご参加ありがとうございます。以下のQRコードが入場チケットとなります。</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>券種 / Ticket Type:</strong> ${ticketType}</p>
              <p style="margin: 5px 0;"><strong>受付時間 / Reception Time:</strong> ${startTime}</p>
            </div>

            <p>当日、受付でこのQRコードをご提示ください。</p>
            <div style="text-align: center; margin: 30px 0;">
              <img src="cid:qrcode" alt="QR Code" style="border: 2px solid #ddd; padding: 10px; width: 200px; height: 200px;" />
            </div>
            <p style="color: #666; font-size: 12px;">
              会員ID: ${id}<br>
              このメールは大切に保管してください。
            </p>
            <div style="margin-top: 20px; font-size: 11px; color: #999;">
              <p>※画像が表示されない場合は、以下のリンクから確認してください:<br>
              <a href="${qrUrl}">${qrUrl}</a></p>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <h3 style="color: #4285f4;">Event Entry Ticket</h3>
            <p>Hello ${name},</p>
            <p>Thank you for registering. Please present this QR code at the reception desk.</p>
            <p style="color: #666; font-size: 12px;">
              Member ID: ${id}<br>
              Please keep this email safe.
            </p>
          </body>
        </html>
      `;
      
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
        inlineImages: {
          qrcode: qrBlob
        }
      });
      
      // Mark as sent
      sheet.getRange(i + 1, 6).setValue(true);
      sentCount++;
      
      Logger.log(`Sent ticket to ${email}`);
      
      // Avoid hitting quotas
      Utilities.sleep(500);
      
    } catch (error) {
      Logger.log(`Error sending to ${email}: ${error.message}`);
      errorCount++;
    }
  }
  
  Logger.log(`\n=== SUMMARY ===`);
  Logger.log(`Sent: ${sentCount}`);
  Logger.log(`Errors: ${errorCount}`);
  
  return {
    sent: sentCount,
    errors: errorCount
  };
}

/**
 * Check in a user by token
 */
function checkInUser(token) {
  if (!token) {
    return {
      success: false,
      message: 'トークンが指定されていません / Token not provided'
    };
  }
  
  const sheet = getAttendeesSheet();
  const data = sheet.getDataRange().getValues();
  
  // Find the attendee by token
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const storedToken = row[3];
    const checkInTime = row[4];
    const name = row[1];
    const id = row[0];
    const ticketType = row[6] || 'General';
    const startTime = row[7] || '';
    const reEntryHistory = row[8] || ''; // Col I: ReEntryHistory
    
    if (storedToken === token) {
      const now = new Date();
      const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

      // Check if already checked in
      if (checkInTime) {
        // Log re-entry
        const newHistory = reEntryHistory ? `${reEntryHistory}\n${nowStr}` : nowStr;
        sheet.getRange(i + 1, 9).setValue(newHistory);

        return {
          success: false,
          status: 'WARNING',
          message: `既に入場済みです / Already checked in`,
          name: name,
          id: id,
          checkInTime: Utilities.formatDate(new Date(checkInTime), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
          ticketType: ticketType,
          startTime: startTime
        };
      }
      
      // Record check-in time
      sheet.getRange(i + 1, 5).setValue(now);
      
      return {
        success: true,
        status: 'SUCCESS',
        message: '入場を受け付けました / Check-in successful',
        name: name,
        id: id,
        checkInTime: nowStr,
        ticketType: ticketType,
        startTime: startTime
      };
    }
  }
  
  // Token not found
  return {
    success: false,
    status: 'ERROR',
    message: '無効なチケットです / Invalid ticket'
  };
}

/**
 * Get dashboard statistics
 */
function getDashboardData() {
  const sheet = getAttendeesSheet();
  const data = sheet.getDataRange().getValues();
  
  let total = 0;
  let checkedIn = 0;
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[0];
    const checkInTime = row[4];
    
    // Only count rows with valid ID
    if (id) {
      total++;
      if (checkInTime) {
        checkedIn++;
      }
    }
  }
  
  return {
    total: total,
    checkedIn: checkedIn,
    notCheckedIn: total - checkedIn
  };
}

/**
 * Manual check-in by ID
 */
function manualCheckIn(memberId) {
  if (!memberId) {
    return {
      success: false,
      message: '会員IDが指定されていません / Member ID not provided'
    };
  }
  
  const sheet = getAttendeesSheet();
  const data = sheet.getDataRange().getValues();
  
  let foundCheckedIn = null;
  let foundCheckedInIndex = -1;
  
  // Find the attendee by ID
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[0];
    const checkInTime = row[4];
    const name = row[1];
    const ticketType = row[6] || 'General';
    const startTime = row[7] || '';
    const reEntryHistory = row[8] || '';
    
    if (id.toString() === memberId.toString()) {
      // If NOT checked in, check them in immediately and return
      if (!checkInTime) {
        // Record check-in time
        const now = new Date();
        const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        sheet.getRange(i + 1, 5).setValue(now);
        
        return {
          success: true,
          status: 'SUCCESS',
          message: '入場を受け付けました / Check-in successful',
          name: name,
          id: id,
          checkInTime: nowStr,
          ticketType: ticketType,
          startTime: startTime
        };
      } else {
        // Keep track of the checked-in record in case we don't find any available ones
        foundCheckedIn = {
          name: name,
          id: id,
          checkInTime: checkInTime,
          ticketType: ticketType,
          startTime: startTime,
          reEntryHistory: reEntryHistory
        };
        foundCheckedInIndex = i;
      }
    }
  }
  
  // If we found a record but it was checked in (and we didn't find any unchecked ones)
  if (foundCheckedIn) {
    // Log re-entry for manual check-in too
    const now = new Date();
    const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const newHistory = foundCheckedIn.reEntryHistory ? `${foundCheckedIn.reEntryHistory}\n${nowStr}` : nowStr;
    sheet.getRange(foundCheckedInIndex + 1, 9).setValue(newHistory);

    return {
      success: false,
      status: 'WARNING',
      message: `既に入場済みです / Already checked in`,
      name: foundCheckedIn.name,
      id: foundCheckedIn.id,
      checkInTime: Utilities.formatDate(new Date(foundCheckedIn.checkInTime), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      ticketType: foundCheckedIn.ticketType,
      startTime: foundCheckedIn.startTime
    };
  }
  
  // ID not found
  return {
    success: false,
    status: 'ERROR',
    message: '会員IDが見つかりません / Member ID not found'
  };
}

// ==================== WEB APP ENDPOINTS ====================

/**
 * Handle GET requests (API endpoints for Next.js)
 */
function doGet(e) {
  const action = e.parameter.action;
  
  let result;
  
  try {
    switch (action) {
      case 'checkIn':
        result = checkInUser(e.parameter.token);
        break;
        
      case 'manualCheckIn':
        result = manualCheckIn(e.parameter.memberId);
        break;
        
      case 'dashboard':
        result = getDashboardData();
        break;
        
      default:
        result = {
          success: false,
          message: 'Invalid action'
        };
    }
  } catch (error) {
    result = {
      success: false,
      message: error.message
    };
  }
  
  // Return JSON response with CORS headers
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests (same as GET for simplicity)
 */
function doPost(e) {
  return doGet(e);
}

/**
 * Syncs EC Data with Member Master to populate Attendees sheet
 */
function syncECData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const attendeesSheet = getAttendeesSheet();
  const ecDataSheet = ss.getSheetByName('ECData') || ss.insertSheet('ECData');
  const memberMasterSheet = ss.getSheetByName('MemberMaster') || ss.insertSheet('MemberMaster');
  
  // Setup headers if empty
  if (ecDataSheet.getLastRow() === 0) {
    // Added TicketType column (C)
    ecDataSheet.getRange(1, 1, 1, 3).setValues([['ID', 'Name', 'TicketType']]);
    Logger.log('Created ECData sheet headers');
    return 'Please fill ECData sheet with data and run again.';
  }
  
  if (memberMasterSheet.getLastRow() === 0) {
    memberMasterSheet.getRange(1, 1, 1, 3).setValues([['ID', 'Name', 'Email']]);
    Logger.log('Created MemberMaster sheet headers');
    return 'Please fill MemberMaster sheet with data and run again.';
  }
  
  // 1. Read MemberMaster
  const masterData = memberMasterSheet.getDataRange().getValues();
  const emailMap = new Map();
  // Skip header
  for (let i = 1; i < masterData.length; i++) {
    const id = String(masterData[i][0]).trim();    // Col A: ID
    // Col B is Name (index 1), skipped
    const email = String(masterData[i][2]).trim(); // Col C: Email
    if (id) emailMap.set(id, email);
  }
  
  // 2. Read ECData
  const ecData = ecDataSheet.getDataRange().getValues();
  const newAttendees = [];
  const processedKeys = new Set(); // Track processed ID+TicketType to prevent exact duplicates
  let matchedCount = 0;
  let missingEmailCount = 0;
  
  // Skip header
  for (let i = 1; i < ecData.length; i++) {
    const id = String(ecData[i][0]).trim();
    const name = ecData[i][1];
    const ticketTypeInput = String(ecData[i][2] || 'General').trim(); // Get TicketType from Col C
    
    if (!id) continue;
    
    // Determine StartTime based on TicketType
    let ticketType = ticketTypeInput;
    let startTime = TICKET_CONFIG[ticketType] || '19:00'; // Default
    
    // Handle price inputs directly
    if (ticketType === '15400' || ticketType === '15,400') {
      ticketType = 'VIP';
      startTime = TICKET_CONFIG['VIP'];
    } else if (ticketType === '13200' || ticketType === '13,200') {
      ticketType = 'General';
      startTime = TICKET_CONFIG['General'];
    }

    // Composite key: ID + TicketType
    const compositeKey = `${id}_${ticketType}`;
    
    // Skip if this exact ticket type for this ID was already processed in this run
    if (processedKeys.has(compositeKey)) {
      Logger.log(`Skipping duplicate ticket in EC Data: ${compositeKey}`);
      continue;
    }
    processedKeys.add(compositeKey);
    
    const email = emailMap.get(id) || '';
    if (email) {
      matchedCount++;
    } else {
      missingEmailCount++;
      Logger.log(`Missing email for ID: ${id}`);
    }
    
    // ID, Name, Email, Token, CheckInTime, EmailSent, TicketType, StartTime, ReEntryHistory
    newAttendees.push([id, name, email, '', '', '', ticketType, startTime, '']);
  }
  
  // 3. Write to Attendees
  const existingKeys = new Set();
  const existingData = attendeesSheet.getDataRange().getValues();
  // Skip header
  for (let i = 1; i < existingData.length; i++) {
    const id = String(existingData[i][0]).trim();
    const type = String(existingData[i][6] || 'General').trim(); // Col G: TicketType
    if (id) existingKeys.add(`${id}_${type}`);
  }
  
  // Filter out tickets that already exist in Attendees sheet
  const rowsToAdd = newAttendees.filter(row => !existingKeys.has(`${row[0]}_${row[6]}`));
  
  if (rowsToAdd.length > 0) {
    // Write 9 columns now
    attendeesSheet.getRange(attendeesSheet.getLastRow() + 1, 1, rowsToAdd.length, 9).setValues(rowsToAdd);
  }
  
  const resultMsg = `Synced. Processed: ${processedKeys.size}. Matched emails: ${matchedCount}. Missing emails: ${missingEmailCount}. Added new rows: ${rowsToAdd.length}.`;
  Logger.log(resultMsg);
  return resultMsg;
}

/**
 * Setup all necessary sheets
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Attendees
  getAttendeesSheet();
  
  // ECData
  let ecSheet = ss.getSheetByName('ECData');
  if (!ecSheet) {
    ecSheet = ss.insertSheet('ECData');
    ecSheet.getRange(1, 1, 1, 3).setValues([['ID', 'Name', 'TicketType']]);
  }
  
  // MemberMaster
  let masterSheet = ss.getSheetByName('MemberMaster');
  if (!masterSheet) {
    masterSheet = ss.insertSheet('MemberMaster');
    // Updated: ID, Name, Email
    masterSheet.getRange(1, 1, 1, 3).setValues([['ID', 'Name', 'Email']]);
  }
  
  Logger.log('All sheets setup complete.');
}
