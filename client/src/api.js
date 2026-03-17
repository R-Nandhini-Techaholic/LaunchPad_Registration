async function parseJson(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : {};

  if (!response.ok) {
    const error = new Error(body.message || "Request failed.");
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export async function registerStudent(payload) {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJson(response);
}

export async function getMeta() {
  const response = await fetch("/api/meta");
  return parseJson(response);
}

export async function getStudents({ search = "", passType = "" } = {}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (passType) {
    params.set("passType", passType);
  }

  const response = await fetch(`/api/students?${params.toString()}`);
  return parseJson(response);
}

export async function getAttendance() {
  const response = await fetch("/api/attendance");
  return parseJson(response);
}

export async function updateStudent(id, payload) {
  const response = await fetch(`/api/students/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJson(response);
}

export async function deleteStudent(id) {
  const response = await fetch(`/api/students/${id}`, {
    method: "DELETE"
  });

  return parseJson(response);
}

export async function scanAttendance(registrationId) {
  const response = await fetch("/api/attendance/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ registrationId })
  });

  return parseJson(response);
}

export function buildExportUrl({ search = "", passType = "" } = {}) {
  const params = new URLSearchParams({ format: "csv" });

  if (search) {
    params.set("search", search);
  }

  if (passType) {
    params.set("passType", passType);
  }

  return `/api/students?${params.toString()}`;
}
