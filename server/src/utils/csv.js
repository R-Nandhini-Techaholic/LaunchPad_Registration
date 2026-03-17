function escapeCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

export function toCsv(rows) {
  if (!rows.length) {
    return "Registration ID,Name,Email,Phone,Pass Type,Attendance Status,Scanned At,Created At\n";
  }

  const headers = [
    "Registration ID",
    "Name",
    "Email",
    "Phone",
    "Pass Type",
    "Attendance Status",
    "Scanned At",
    "Created At"
  ];

  const lines = rows.map((row) =>
    [
      row.registrationId,
      row.name,
      row.email,
      row.phone,
      row.passType,
      row.attendanceStatus ?? "Absent",
      row.scannedAt ?? "",
      row.createdAt
    ]
      .map(escapeCell)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}
