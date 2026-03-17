import cors from "cors";
import express from "express";
import QRCode from "qrcode";
import { CLIENT_ORIGINS, DATABASE_PROVIDER } from "./config.js";
import {
  createStudent,
  deleteStudentByIdOrRegistrationId,
  ensureDatabaseReady,
  getAttendanceByRegistrationId,
  getStudentByIdOrRegistrationId,
  getStudentByRegistrationId,
  listAttendance,
  listStudents,
  recordAttendance,
  registrationIdExists,
  updateStudentByIdOrRegistrationId
} from "./database.js";
import { toCsv } from "./utils/csv.js";
import {
  isValidRegistrationId,
  PASS_TYPES,
  validateRegistrationInput,
  validateStudentUpdateInput
} from "./utils/validation.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !CLIENT_ORIGINS.length || CLIENT_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    }
  })
);
app.use(express.json());

app.use(async (_request, response, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (error) {
    next(error);
  }
});

function buildQrCodePath(registrationId) {
  return `/api/qrcode?registrationId=${encodeURIComponent(registrationId)}`;
}

async function generateRegistrationId() {
  let registrationId = "";

  // Keep trying until we find an unused ID so every QR points to a single student record.
  do {
    const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    registrationId = `LP26-${seed}`;
  } while (await registrationIdExists(registrationId));

  return registrationId;
}

app.get("/api/meta", (_request, response) => {
  response.json({
    eventName: "Launch Pad 2026",
    passTypes: PASS_TYPES,
    databaseProvider: DATABASE_PROVIDER
  });
});

app.get("/api/qrcode", async (request, response, next) => {
  const registrationId = request.query.registrationId?.toString().trim();

  if (!isValidRegistrationId(registrationId)) {
    response.status(400).json({ message: "Invalid registration ID." });
    return;
  }

  try {
    const student = await getStudentByRegistrationId(registrationId);

    if (!student) {
      response.status(404).json({ message: "QR code not found." });
      return;
    }

    const buffer = await QRCode.toBuffer(registrationId, {
      type: "png",
      width: 320,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    });

    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.send(buffer);
  } catch (error) {
    next(error);
  }
});

app.post("/api/register", async (request, response, next) => {
  const { errors, values } = validateRegistrationInput(request.body);

  if (errors.length) {
    response.status(400).json({ message: errors.join(" ") });
    return;
  }

  try {
    const registrationId = await generateRegistrationId();
    const student = await createStudent({
      registrationId,
      ...values,
      qrCodePath: buildQrCodePath(registrationId),
      createdAt: new Date().toISOString()
    });

    response.status(201).json({
      message: "Registration completed successfully.",
      student
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/students", async (request, response, next) => {
  try {
    const search = request.query.search?.toString() ?? "";
    const passType =
      request.query.passType?.toString() &&
      PASS_TYPES.includes(request.query.passType.toString())
        ? request.query.passType.toString()
        : "";
    const students = await listStudents({ search, passType });

    if (request.query.format === "csv") {
      response.setHeader("Content-Type", "text/csv; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        "attachment; filename=\"launch-pad-2026-students.csv\""
      );
      response.send(toCsv(students));
      return;
    }

    response.json({ students });
  } catch (error) {
    next(error);
  }
});

app.get("/api/students/:id", async (request, response, next) => {
  try {
    const student = await getStudentByIdOrRegistrationId(request.params.id);

    if (!student) {
      response.status(404).json({ message: "Student not found." });
      return;
    }

    const attendance = await getAttendanceByRegistrationId(student.registrationId);

    response.json({
      student: {
        ...student,
        attendanceStatus: attendance?.status ?? "Absent",
        scannedAt: attendance?.scannedAt ?? null
      }
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/students/:id", async (request, response, next) => {
  const { errors, values } = validateStudentUpdateInput(request.body);

  if (errors.length) {
    response.status(400).json({ message: errors.join(" ") });
    return;
  }

  try {
    const student = await updateStudentByIdOrRegistrationId(request.params.id, values);

    if (!student) {
      response.status(404).json({ message: "Student not found." });
      return;
    }

    response.json({
      message: "Student updated successfully.",
      student
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/students/:id", async (request, response, next) => {
  try {
    const student = await deleteStudentByIdOrRegistrationId(request.params.id);

    if (!student) {
      response.status(404).json({ message: "Student not found." });
      return;
    }

    response.json({
      message: "Student deleted successfully.",
      student
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/attendance/scan", async (request, response, next) => {
  const registrationId = request.body?.registrationId?.trim();

  if (!isValidRegistrationId(registrationId)) {
    response.status(400).json({ message: "Invalid registration ID." });
    return;
  }

  try {
    const student = await getStudentByRegistrationId(registrationId);

    if (!student) {
      response.status(404).json({ message: "No student found for this QR code." });
      return;
    }

    const existingAttendance = await getAttendanceByRegistrationId(registrationId);

    if (existingAttendance) {
      response.status(409).json({
        message: "Attendance already marked for this student.",
        duplicate: true,
        student,
        attendance: existingAttendance
      });
      return;
    }

    const attendance = await recordAttendance(registrationId);

    response.json({
      message: "Attendance marked successfully.",
      duplicate: false,
      student,
      attendance
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/attendance", async (_request, response, next) => {
  try {
    response.json({
      attendance: await listAttendance()
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    message: "Internal server error."
  });
});

export default app;
