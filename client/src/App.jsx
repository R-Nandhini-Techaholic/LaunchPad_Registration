import { useState } from "react";
import DashboardPage from "./pages/DashboardPage.jsx";
import RegistrationPage from "./pages/RegistrationPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";

const tabs = [
  { id: "register", label: "Registration" },
  { id: "dashboard", label: "Admin Dashboard" },
  { id: "attendance", label: "Attendance Scanner" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("register");
  const [refreshKey, setRefreshKey] = useState(0);
  const stats = [
    { label: "Pass Types", value: "2" },
    { label: "QR-based Entry", value: "Live" },
    { label: "Attendance Sync", value: "Instant" }
  ];

  function bumpRefreshKey() {
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="hero-kicker">Launch Pad 2026</p>
          <h1>Student registration and attendance system</h1>
          <p className="hero-copy">
            Register participants, generate downloadable QR passes, scan them at the venue, and
            manage the full attendee list from one lightweight dashboard.
          </p>
        </div>

        <div className="hero-stats">
          {stats.map((item) => (
            <div className="stat-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <nav className="tab-bar" aria-label="Launch Pad navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "register" ? <RegistrationPage onRegistered={bumpRefreshKey} /> : null}
      {activeTab === "dashboard" ? (
        <DashboardPage refreshKey={refreshKey} onStudentsChanged={bumpRefreshKey} />
      ) : null}
      {activeTab === "attendance" ? (
        <AttendancePage refreshKey={refreshKey} onAttendanceMarked={bumpRefreshKey} />
      ) : null}
    </div>
  );
}
