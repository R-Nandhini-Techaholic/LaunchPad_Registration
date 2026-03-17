import { useState } from "react";
import { registerStudent } from "../api.js";
import PassBadge from "../components/PassBadge.jsx";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  passType: "Startup Pass"
};

export default function RegistrationPage({ onRegistered }) {
  const [form, setForm] = useState(initialForm);
  const [registeredStudent, setRegisteredStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const data = await registerStudent(form);
      setRegisteredStudent(data.student);
      setForm(initialForm);
      onRegistered();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="panel panel-grid">
      <div className="card">
        <div className="section-heading">
          <p className="eyebrow">Student Registration</p>
          <h2>Create a Launch Pad 2026 entry pass</h2>
          <p>
            Capture student details, assign a pass type, and instantly generate a downloadable QR
            code.
          </p>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Aarav Mehta"
              required
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="aarav@example.com"
              required
            />
          </label>

          <label>
            Phone Number
            <input
              name="phone"
              value={form.phone}
              onChange={updateField}
              placeholder="+91 9876543210"
              required
            />
          </label>

          <label>
            Pass Type
            <select name="passType" value={form.passType} onChange={updateField}>
              <option>Startup Pass</option>
              <option>Innovator Pass</option>
            </select>
          </label>

          {error ? <p className="message message-error">{error}</p> : null}

          <button className="button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Generating QR..." : "Register Student"}
          </button>
        </form>
      </div>

      <div className="card qr-card">
        <div className="section-heading">
          <p className="eyebrow">QR Pass</p>
          <h2>Ready for check-in</h2>
          <p>The generated QR code can be scanned at the event gate to mark attendance.</p>
        </div>

        {registeredStudent ? (
          <div className="qr-result">
            <img
              className="qr-image"
              src={registeredStudent.qrCodePath}
              alt={`QR code for ${registeredStudent.registrationId}`}
            />
            <div className="summary-block">
              <h3>{registeredStudent.name}</h3>
              <p>{registeredStudent.registrationId}</p>
              <PassBadge passType={registeredStudent.passType} />
            </div>
            <a
              className="button-secondary"
              href={registeredStudent.qrCodePath}
              download={`${registeredStudent.registrationId}.png`}
            >
              Download QR as PNG
            </a>
          </div>
        ) : (
          <div className="empty-state">
            <p>Register a student to generate their event QR code.</p>
          </div>
        )}
      </div>
    </section>
  );
}
