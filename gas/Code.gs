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
  // New Ticket Types
  'VIP Pass': '18:30-19:00',      // 役員招待枠
  'PriorityPass': '18:30-19:00',  // 15400円
  'StandardPass': '11:00-12:00',  // 13200円
  'GuestPass': '11:00-12:00',     // 1100円 (Guest)
  'FreeGuest': '18:30-19:00',     // 無料招待者

  // Legacy/Price Mappings (for EC Data Sync)
  'VIP': '18:30-19:00',
  'General': '11:00-12:00',
  '15400': '18:30-19:00',
  '13200': '11:00-12:00',
  '1100': '11:00-12:00',
  'Invitation': '18:30-19:00'
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
    // Updated columns: Added ReEntryHistory (I), Inviter (J), Note (K)
    sheet.appendRow(['ID', 'Name', 'Email', 'Token', 'CheckInTime', 'EmailSent', 'TicketType', 'StartTime', 'ReEntryHistory', 'Inviter', 'Note']);
    sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  } else {
    // Check if new columns exist, if not add them (migration)
    const lastCol = sheet.getLastColumn();
    if (lastCol < 11) {
      if (lastCol < 9) {
        // ... previous migrations ...
        sheet.getRange(1, 7).setValue('TicketType');
        sheet.getRange(1, 8).setValue('StartTime');
        sheet.getRange(1, 9).setValue('ReEntryHistory');
      }
      // Add Inviter and Note
      sheet.getRange(1, 10).setValue('Inviter');
      sheet.getRange(1, 11).setValue('Note');
      sheet.getRange('G1:K1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
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
    const ticketType = row[6] || 'StandardPass'; // Default
    const startTime = row[7] || '11:00-12:00';
    
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
    const ticketType = row[6] || 'StandardPass';
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
  const breakdown = {}; // { "VIP Pass": { total: 0, checkedIn: 0 }, ... }
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[0];
    const checkInTime = row[4];
    const ticketType = row[6] || 'Unknown';
    
    // Only count rows with valid ID
    if (id) {
      total++;
      
      // Initialize breakdown for this type if not exists
      if (!breakdown[ticketType]) {
        breakdown[ticketType] = { total: 0, checkedIn: 0 };
      }
      
      breakdown[ticketType].total++;
      
      if (checkInTime) {
        checkedIn++;
        breakdown[ticketType].checkedIn++;
      }
    }
  }
  
  return {
    total: total,
    checkedIn: checkedIn,
    notCheckedIn: total - checkedIn,
    breakdown: breakdown
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
    const ticketType = row[6] || 'StandardPass';
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
    // Added Quantity column (D)
    ecDataSheet.getRange(1, 1, 1, 4).setValues([['ID', 'Name', 'TicketType', 'Quantity']]);
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
    const email = String(masterData[i][2]).trim(); // Col C: Email
    if (id) emailMap.set(id, email);
  }
  
  // 2. Read ECData and Aggregate Requirements
  const ecData = ecDataSheet.getDataRange().getValues();
  const requiredTickets = new Map(); // Key: ID_TicketType, Value: Count
  const ticketInfo = new Map(); // Key: ID_TicketType, Value: {Name, TicketType, StartTime}
  
  // Skip header
  for (let i = 1; i < ecData.length; i++) {
    const id = String(ecData[i][0]).trim();
    const name = ecData[i][1];
    const ticketTypeInput = String(ecData[i][2] || 'StandardPass').trim();
    const quantity = parseInt(ecData[i][3]) || 1; // Default to 1 if empty/invalid
    
    if (!id) continue;
    
    // Determine TicketType and StartTime
    let ticketType = ticketTypeInput;
    
    // Map old/price inputs to new TicketType names
    if (ticketType === '15400' || ticketType === '15,400') {
      ticketType = 'PriorityPass';
    } else if (ticketType === '13200' || ticketType === '13,200') {
      ticketType = 'StandardPass';
    } else if (ticketType === '1100' || ticketType === '1,100' || ticketType === 'Guest') {
      ticketType = 'GuestPass';
    } else if (ticketType === 'Invitation' || ticketType === '無料招待者') {
      ticketType = 'FreeGuest';
    } else if (ticketType === '役員招待枠') {
      ticketType = 'VIP Pass';
    }

    let startTime = TICKET_CONFIG[ticketType] || '11:00-12:00'; // Default

    const compositeKey = `${id}_${ticketType}`;
    
    // Aggregate counts
    const currentCount = requiredTickets.get(compositeKey) || 0;
    requiredTickets.set(compositeKey, currentCount + quantity);
    
    // Store info (overwrite is fine, usually same)
    if (!ticketInfo.has(compositeKey)) {
      ticketInfo.set(compositeKey, {
        id: id,
        name: name,
        ticketType: ticketType,
        startTime: startTime
      });
    }
  }
  
  // 3. Count Existing Tickets in Attendees
  const existingData = attendeesSheet.getDataRange().getValues();
  const existingCounts = new Map(); // Key: ID_TicketType, Value: Count
  
  // Skip header
  for (let i = 1; i < existingData.length; i++) {
    const id = String(existingData[i][0]).trim();
    const type = String(existingData[i][6] || 'StandardPass').trim();
    if (id) {
      const key = `${id}_${type}`;
      existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
    }
  }
  
  // 4. Generate Missing Tickets
  const rowsToAdd = [];
  let matchedCount = 0;
  let missingEmailCount = 0;
  
  requiredTickets.forEach((neededQty, key) => {
    const info = ticketInfo.get(key);
    const haveQty = existingCounts.get(key) || 0;
    const toCreate = neededQty - haveQty;
    
    if (toCreate > 0) {
      const email = emailMap.get(info.id) || '';
      if (email) matchedCount++;
      else {
        missingEmailCount++;
        Logger.log(`Missing email for ID: ${info.id}`);
      }
      
      // Handle Guest Naming
      let displayName = info.name;
      let note = '';
      if (info.ticketType === 'GuestPass') {
        displayName = `${info.name} (Guest)`;
        note = 'Guest Ticket';
      }
      
      // Create 'toCreate' number of rows
      for (let k = 0; k < toCreate; k++) {
        // ID, Name, Email, Token, CheckInTime, EmailSent, TicketType, StartTime, ReEntryHistory, Inviter, Note
        rowsToAdd.push([
          info.id, 
          displayName, 
          email, 
          '', '', '', 
          info.ticketType, 
          info.startTime, 
          '', 
          '', // Inviter (Manual entry for now, or could be Member Name)
          note
        ]);
      }
    }
  });
  
  // 5. Write to Attendees
  if (rowsToAdd.length > 0) {
    // Write 11 columns
    attendeesSheet.getRange(attendeesSheet.getLastRow() + 1, 1, rowsToAdd.length, 11).setValues(rowsToAdd);
  }
  
  const resultMsg = `Synced. Added ${rowsToAdd.length} new tickets. Matched emails: ${matchedCount}. Missing emails: ${missingEmailCount}.`;
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
    // Updated: ID, Name, TicketType, Quantity
    ecSheet.getRange(1, 1, 1, 4).setValues([['ID', 'Name', 'TicketType', 'Quantity']]);
  }
  
  // MemberMaster
  let masterSheet = ss.getSheetByName('MemberMaster');
  if (!masterSheet) {
    masterSheet = ss.insertSheet('MemberMaster');
    masterSheet.getRange(1, 1, 1, 3).setValues([['ID', 'Name', 'Email']]);
  }
  
  Logger.log('All sheets setup complete.');
}
