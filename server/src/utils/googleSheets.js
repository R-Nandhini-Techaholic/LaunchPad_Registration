import { google } from "googleapis";
import {
  getGoogleSheetsUrl,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  GOOGLE_SHEETS_SPREADSHEET_ID,
  GOOGLE_SHEETS_TAB_NAME
} from "../config.js";

function getPrivateKey() {
  return GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
}

export function getGoogleSheetsConfig() {
  const configured = Boolean(
    GOOGLE_SHEETS_SPREADSHEET_ID && GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );

  return {
    configured,
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    tabName: GOOGLE_SHEETS_TAB_NAME,
    sheetUrl: getGoogleSheetsUrl()
  };
}

async function getSheetsClient() {
  const config = getGoogleSheetsConfig();

  if (!config.configured) {
    throw new Error("Google Sheets integration is not configured.");
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  await auth.authorize();

  return google.sheets({
    version: "v4",
    auth
  });
}

function buildSheetRows(students) {
  return [
    [
      "Registration ID",
      "Name",
      "Email",
      "Phone",
      "Pass Type",
      "Attendance Status",
      "Scanned At",
      "Created At"
    ],
    ...students.map((student) => [
      student.registrationId,
      student.name,
      student.email,
      student.phone,
      student.passType,
      student.attendanceStatus ?? "Absent",
      student.scannedAt ?? "",
      student.createdAt
    ])
  ];
}

export async function syncStudentsToGoogleSheets(students) {
  const config = getGoogleSheetsConfig();

  if (!config.configured) {
    return {
      synced: false,
      configured: false,
      sheetUrl: config.sheetUrl
    };
  }

  const sheets = await getSheetsClient();
  const range = `${config.tabName}!A:H`;
  const values = buildSheetRows(students);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values
    }
  });

  return {
    synced: true,
    configured: true,
    rowCount: Math.max(students.length, 0),
    sheetUrl: config.sheetUrl
  };
}
