import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { DATA_DIR, DATABASE_PROVIDER, DATABASE_URL, DB_PATH } from "./config.js";

const isPostgres = DATABASE_PROVIDER === "postgres";
const sqlite = !isPostgres ? createSqliteClient() : null;
const postgres = isPostgres ? createPostgresClient() : null;
const ready = initializeDatabase();

function createSqliteClient() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return new DatabaseSync(DB_PATH);
}

function createPostgresClient() {
  const databaseUrl = new URL(DATABASE_URL);
  const isLocalHost = ["localhost", "127.0.0.1"].includes(databaseUrl.hostname);

  return new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocalHost || process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false }
  });
}

async function initializeDatabase() {
  if (isPostgres) {
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS students (
        id BIGSERIAL PRIMARY KEY,
        registration_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        pass_type TEXT NOT NULL,
        qr_code_path TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id BIGSERIAL PRIMARY KEY,
        registration_id TEXT NOT NULL UNIQUE REFERENCES students(registration_id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        scanned_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_students_pass_type ON students(pass_type);
      CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
    `);

    return;
  }

  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      pass_type TEXT NOT NULL,
      qr_code_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      FOREIGN KEY (registration_id) REFERENCES students(registration_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_students_pass_type ON students(pass_type);
    CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
  `);
}

function mapStudent(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    registrationId: row.registration_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passType: row.pass_type,
    qrCodePath: row.qr_code_path,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapStudentWithAttendance(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    registrationId: row.registration_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passType: row.pass_type,
    qrCodePath: row.qr_code_path,
    createdAt: new Date(row.created_at).toISOString(),
    attendanceStatus: row.attendance_status,
    scannedAt: row.scanned_at ? new Date(row.scanned_at).toISOString() : null
  };
}

function mapAttendance(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    registrationId: row.registration_id,
    status: row.status,
    scannedAt: new Date(row.scanned_at).toISOString()
  };
}

export async function ensureDatabaseReady() {
  await ready;
}

export async function registrationIdExists(registrationId) {
  await ready;

  if (isPostgres) {
    const result = await postgres.query(
      "SELECT registration_id FROM students WHERE registration_id = $1",
      [registrationId]
    );

    return result.rowCount > 0;
  }

  const row = sqlite
    .prepare("SELECT registration_id FROM students WHERE registration_id = ?")
    .get(registrationId);

  return Boolean(row);
}

export async function createStudent(student) {
  await ready;

  if (isPostgres) {
    const result = await postgres.query(
      `
        INSERT INTO students (
          registration_id,
          name,
          email,
          phone,
          pass_type,
          qr_code_path,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        student.registrationId,
        student.name,
        student.email,
        student.phone,
        student.passType,
        student.qrCodePath,
        student.createdAt
      ]
    );

    return mapStudent(result.rows[0]);
  }

  sqlite
    .prepare(
      `
        INSERT INTO students (
          registration_id,
          name,
          email,
          phone,
          pass_type,
          qr_code_path,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      student.registrationId,
      student.name,
      student.email,
      student.phone,
      student.passType,
      student.qrCodePath,
      student.createdAt
    );

  return getStudentByRegistrationId(student.registrationId);
}

export async function getStudentByRegistrationId(registrationId) {
  await ready;

  if (isPostgres) {
    const result = await postgres.query(
      "SELECT * FROM students WHERE registration_id = $1",
      [registrationId]
    );

    return mapStudent(result.rows[0]);
  }

  const row = sqlite.prepare("SELECT * FROM students WHERE registration_id = ?").get(registrationId);
  return mapStudent(row);
}

export async function getStudentByIdOrRegistrationId(identifier) {
  await ready;

  if (isPostgres) {
    const result = /^\d+$/.test(identifier)
      ? await postgres.query("SELECT * FROM students WHERE id = $1", [Number(identifier)])
      : await postgres.query("SELECT * FROM students WHERE registration_id = $1", [identifier]);

    return mapStudent(result.rows[0]);
  }

  const statement = /^\d+$/.test(identifier)
    ? sqlite.prepare("SELECT * FROM students WHERE id = ?")
    : sqlite.prepare("SELECT * FROM students WHERE registration_id = ?");

  return mapStudent(statement.get(identifier));
}

export async function updateStudentByIdOrRegistrationId(identifier, updates) {
  await ready;

  if (isPostgres) {
    const result = /^\d+$/.test(identifier)
      ? await postgres.query(
          `
            UPDATE students
            SET name = $1, email = $2, phone = $3, pass_type = $4
            WHERE id = $5
            RETURNING *
          `,
          [updates.name, updates.email, updates.phone, updates.passType, Number(identifier)]
        )
      : await postgres.query(
          `
            UPDATE students
            SET name = $1, email = $2, phone = $3, pass_type = $4
            WHERE registration_id = $5
            RETURNING *
          `,
          [updates.name, updates.email, updates.phone, updates.passType, identifier]
        );

    return mapStudent(result.rows[0]);
  }

  const statement = /^\d+$/.test(identifier)
    ? sqlite.prepare(
        `
          UPDATE students
          SET name = ?, email = ?, phone = ?, pass_type = ?
          WHERE id = ?
        `
      )
    : sqlite.prepare(
        `
          UPDATE students
          SET name = ?, email = ?, phone = ?, pass_type = ?
          WHERE registration_id = ?
        `
      );

  statement.run(updates.name, updates.email, updates.phone, updates.passType, identifier);
  return getStudentByIdOrRegistrationId(identifier);
}

export async function deleteStudentByIdOrRegistrationId(identifier) {
  await ready;

  const existingStudent = await getStudentByIdOrRegistrationId(identifier);

  if (!existingStudent) {
    return null;
  }

  if (isPostgres) {
    if (/^\d+$/.test(identifier)) {
      await postgres.query("DELETE FROM students WHERE id = $1", [Number(identifier)]);
    } else {
      await postgres.query("DELETE FROM students WHERE registration_id = $1", [identifier]);
    }

    return existingStudent;
  }

  const statement = /^\d+$/.test(identifier)
    ? sqlite.prepare("DELETE FROM students WHERE id = ?")
    : sqlite.prepare("DELETE FROM students WHERE registration_id = ?");

  statement.run(identifier);
  return existingStudent;
}

export async function listStudents({ search = "", passType = "" } = {}) {
  await ready;

  const normalizedSearch = search.trim();
  const searchPattern = `%${normalizedSearch}%`;

  if (isPostgres) {
    const result = await postgres.query(
      `
        SELECT
          s.*,
          COALESCE(a.status, 'Absent') AS attendance_status,
          a.scanned_at
        FROM students s
        LEFT JOIN attendance a ON a.registration_id = s.registration_id
        WHERE (
          $1 = ''
          OR s.name ILIKE $2
          OR s.email ILIKE $2
          OR s.phone ILIKE $2
          OR s.registration_id ILIKE $2
        )
        AND ($3 = '' OR s.pass_type = $3)
        ORDER BY s.created_at DESC
      `,
      [normalizedSearch, searchPattern, passType]
    );

    return result.rows.map(mapStudentWithAttendance);
  }

  const rows = sqlite
    .prepare(
      `
        SELECT
          s.*,
          COALESCE(a.status, 'Absent') AS attendance_status,
          a.scanned_at
        FROM students s
        LEFT JOIN attendance a ON a.registration_id = s.registration_id
        WHERE (
          ? = ''
          OR s.name LIKE ?
          OR s.email LIKE ?
          OR s.phone LIKE ?
          OR s.registration_id LIKE ?
        )
        AND (? = '' OR s.pass_type = ?)
        ORDER BY s.created_at DESC
      `
    )
    .all(
      normalizedSearch,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      passType,
      passType
    );

  return rows.map(mapStudentWithAttendance);
}

export async function listAttendance() {
  await ready;

  if (isPostgres) {
    const result = await postgres.query(`
      SELECT
        a.id,
        a.registration_id,
        a.status,
        a.scanned_at,
        s.name,
        s.email,
        s.phone,
        s.pass_type
      FROM attendance a
      INNER JOIN students s ON s.registration_id = a.registration_id
      ORDER BY a.scanned_at DESC
    `);

    return result.rows.map((row) => ({
      id: Number(row.id),
      registrationId: row.registration_id,
      status: row.status,
      scannedAt: new Date(row.scanned_at).toISOString(),
      name: row.name,
      email: row.email,
      phone: row.phone,
      passType: row.pass_type
    }));
  }

  const rows = sqlite
    .prepare(
      `
        SELECT
          a.id,
          a.registration_id,
          a.status,
          a.scanned_at,
          s.name,
          s.email,
          s.phone,
          s.pass_type
        FROM attendance a
        INNER JOIN students s ON s.registration_id = a.registration_id
        ORDER BY a.scanned_at DESC
      `
    )
    .all();

  return rows.map((row) => ({
    id: Number(row.id),
    registrationId: row.registration_id,
    status: row.status,
    scannedAt: new Date(row.scanned_at).toISOString(),
    name: row.name,
    email: row.email,
    phone: row.phone,
    passType: row.pass_type
  }));
}

export async function getAttendanceByRegistrationId(registrationId) {
  await ready;

  if (isPostgres) {
    const result = await postgres.query(
      "SELECT * FROM attendance WHERE registration_id = $1",
      [registrationId]
    );

    return mapAttendance(result.rows[0]);
  }

  const row = sqlite
    .prepare("SELECT * FROM attendance WHERE registration_id = ?")
    .get(registrationId);

  return mapAttendance(row);
}

export async function recordAttendance(registrationId) {
  await ready;

  const scannedAt = new Date().toISOString();

  if (isPostgres) {
    const result = await postgres.query(
      `
        INSERT INTO attendance (registration_id, status, scanned_at)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [registrationId, "Present", scannedAt]
    );

    return mapAttendance(result.rows[0]);
  }

  sqlite
    .prepare(
      `
        INSERT INTO attendance (registration_id, status, scanned_at)
        VALUES (?, ?, ?)
      `
    )
    .run(registrationId, "Present", scannedAt);

  return getAttendanceByRegistrationId(registrationId);
}
