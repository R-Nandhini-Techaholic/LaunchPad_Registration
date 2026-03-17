import { useEffect, useState } from "react";
import {
  buildExportUrl,
  deleteStudent,
  getMeta,
  getStudents,
  syncGoogleSheet,
  updateStudent
} from "../api.js";
import PassBadge from "../components/PassBadge.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const initialEditForm = {
  name: "",
  email: "",
  phone: "",
  passType: "Startup Pass"
};

export default function DashboardPage({ refreshKey, onStudentsChanged }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [passType, setPassType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [meta, setMeta] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadStudents() {
      setLoading(true);
      setError("");

      try {
        const data = await getStudents({ search, passType });

        if (!ignore) {
          setStudents(data.students);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      ignore = true;
    };
  }, [search, passType, refreshKey]);

  useEffect(() => {
    let ignore = false;

    async function loadMeta() {
      try {
        const data = await getMeta();

        if (!ignore) {
          setMeta(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      }
    }

    loadMeta();

    return () => {
      ignore = true;
    };
  }, []);

  async function reloadStudents() {
    setLoading(true);
    setError("");

    try {
      const data = await getStudents({ search, passType });
      setStudents(data.students);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditing(student) {
    setMessage("");
    setError("");
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      email: student.email,
      phone: student.phone,
      passType: student.passType
    });
  }

  function stopEditing() {
    setEditingStudent(null);
    setEditForm(initialEditForm);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await updateStudent(editingStudent.id, editForm);
      setMessage("Student updated successfully.");
      stopEditing();
      await reloadStudents();
      onStudentsChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(student) {
    const confirmed = window.confirm(`Delete ${student.name} and their attendance record?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteStudent(student.id);
      setMessage("Student deleted successfully.");
      if (editingStudent?.id === student.id) {
        stopEditing();
      }
      await reloadStudents();
      onStudentsChanged();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleGoogleSheetSync() {
    setSyncingSheet(true);
    setError("");
    setMessage("");

    try {
      const data = await syncGoogleSheet();
      setMessage(data.message);
      setMeta((current) =>
        current
          ? {
              ...current,
              googleSheets: {
                ...current.googleSheets,
                ...data.googleSheets
              }
            }
          : current
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSyncingSheet(false);
    }
  }

  return (
    <section className="panel">
      <div className="card">
        <div className="section-heading inline-heading">
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h2>Registered students</h2>
            <p>Search, filter by pass type, review attendance, and export the full list as CSV.</p>
          </div>

          <a className="button-secondary" href={buildExportUrl({ search, passType })}>
            Export CSV
          </a>
        </div>

        <div className="dashboard-actions">
          <button className="button-secondary" type="button" onClick={handleGoogleSheetSync} disabled={syncingSheet}>
            {syncingSheet ? "Syncing Sheet..." : "Sync Google Sheet"}
          </button>

          {meta?.googleSheets?.sheetUrl ? (
            <a className="button-secondary" href={meta.googleSheets.sheetUrl} target="_blank" rel="noreferrer">
              Open Google Sheet
            </a>
          ) : null}
        </div>

        {meta?.googleSheets?.configured ? (
          <p className="message">Google Sheets is configured for quick organizer access.</p>
        ) : (
          <p className="message">
            Google Sheets is not configured yet. Add the Google env vars to enable shared sheet sync.
          </p>
        )}

        <div className="toolbar">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, phone, or registration ID"
            />
          </label>

          <label>
            Pass Type
            <select value={passType} onChange={(event) => setPassType(event.target.value)}>
              <option value="">All Passes</option>
              <option value="Startup Pass">Startup Pass</option>
              <option value="Innovator Pass">Innovator Pass</option>
            </select>
          </label>
        </div>

        {message ? <p className="message message-success">{message}</p> : null}
        {error ? <p className="message message-error">{error}</p> : null}
        {loading ? <p className="message">Loading students...</p> : null}

        {editingStudent ? (
          <form className="edit-panel" onSubmit={handleEditSubmit}>
            <div className="section-heading">
              <p className="eyebrow">Edit Student</p>
              <h2>Update registration details</h2>
              <p>{editingStudent.registrationId}</p>
            </div>

            <div className="form-grid two-column-grid">
              <label>
                Full Name
                <input
                  name="name"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  name="phone"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Pass Type
                <select
                  name="passType"
                  value={editForm.passType}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, passType: event.target.value }))
                  }
                >
                  <option value="Startup Pass">Startup Pass</option>
                  <option value="Innovator Pass">Innovator Pass</option>
                </select>
              </label>
            </div>

            <div className="inline-actions">
              <button className="button-primary" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button className="button-secondary" type="button" onClick={stopEditing}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {!loading && !students.length ? (
          <div className="empty-state compact">
            <p>No students match the current filters.</p>
          </div>
        ) : null}

        {!loading && students.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Registration ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Pass Type</th>
                  <th>Attendance</th>
                  <th>Scanned At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.registrationId}>
                    <td>{student.registrationId}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>{student.phone}</td>
                    <td>
                      <PassBadge passType={student.passType} />
                    </td>
                    <td>
                      <StatusBadge status={student.attendanceStatus} />
                    </td>
                    <td>{student.scannedAt ? new Date(student.scannedAt).toLocaleString() : "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button-small" type="button" onClick={() => startEditing(student)}>
                          Edit
                        </button>
                        <button
                          className="button-small button-small-danger"
                          type="button"
                          onClick={() => handleDelete(student)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
