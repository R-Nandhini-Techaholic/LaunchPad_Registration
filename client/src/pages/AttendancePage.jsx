import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import qrWorkerPath from "qr-scanner/qr-scanner-worker.min.js?url";
import { getAttendance, scanAttendance } from "../api.js";
import PassBadge from "../components/PassBadge.jsx";

QrScanner.WORKER_PATH = qrWorkerPath;

export default function AttendancePage({ refreshKey, onAttendanceMarked }) {
  const videoRef = useRef(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef({ value: "", timestamp: 0 });
  const onAttendanceMarkedRef = useRef(onAttendanceMarked);

  const [cameraError, setCameraError] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanTone, setScanTone] = useState("neutral");
  const [latestRecord, setLatestRecord] = useState(null);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadAttendance() {
      try {
        const data = await getAttendance();

        if (!ignore) {
          setAttendance(data.attendance);
        }
      } catch (error) {
        if (!ignore) {
          setCameraError(error.message);
        }
      }
    }

    loadAttendance();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    onAttendanceMarkedRef.current = onAttendanceMarked;
  }, [onAttendanceMarked]);

  useEffect(() => {
    if (!videoRef.current) {
      return undefined;
    }

    let active = true;

    // The scanner is mounted once and cleaned up on unmount so camera access is stable.
    const scanner = new QrScanner(
      videoRef.current,
      async (result) => {
        const registrationId = typeof result === "string" ? result : result.data;
        const now = Date.now();

        if (
          processingRef.current ||
          (lastScanRef.current.value === registrationId && now - lastScanRef.current.timestamp < 2000)
        ) {
          return;
        }

        processingRef.current = true;
        lastScanRef.current = { value: registrationId, timestamp: now };

        try {
          const data = await scanAttendance(registrationId);

          if (!active) {
            return;
          }

          setScanTone("success");
          setScanMessage(`${data.student.name} marked present.`);
          setLatestRecord({
            ...data.student,
            scannedAt: data.attendance.scannedAt
          });
          onAttendanceMarkedRef.current();

          const attendanceData = await getAttendance();

          if (active) {
            setAttendance(attendanceData.attendance);
          }
        } catch (error) {
          if (!active) {
            return;
          }

          if (error.status === 409) {
            setScanTone("warning");
            setScanMessage(error.message);
            setLatestRecord({
              ...error.body.student,
              scannedAt: error.body.attendance.scannedAt
            });
          } else {
            setScanTone("error");
            setScanMessage(error.message);
          }
        } finally {
          processingRef.current = false;
        }
      },
      {
        preferredCamera: "environment",
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true
      }
    );

    scanner
      .start()
      .then(() => {
        if (active) {
          setCameraError("");
        }
      })
      .catch((error) => {
        if (active) {
          setCameraError(error.message || "Could not start the camera.");
        }
      });

    return () => {
      active = false;
      scanner.stop();
      scanner.destroy();
    };
  }, []);

  return (
    <section className="panel panel-grid">
      <div className="card">
        <div className="section-heading">
          <p className="eyebrow">Admin Attendance</p>
          <h2>Scan event QR codes</h2>
          <p>Use the device camera to mark participants present. Duplicate scans are blocked.</p>
        </div>

        <div className="scanner-frame">
          <video ref={videoRef} className="scanner-video" muted playsInline />
        </div>

        {cameraError ? <p className="message message-error">{cameraError}</p> : null}
        {scanMessage ? <p className={`message message-${scanTone}`}>{scanMessage}</p> : null}

        {latestRecord ? (
          <div className="summary-block">
            <h3>{latestRecord.name}</h3>
            <p>{latestRecord.registrationId}</p>
            <PassBadge passType={latestRecord.passType} />
            <small>Last scan: {new Date(latestRecord.scannedAt).toLocaleString()}</small>
          </div>
        ) : (
          <div className="empty-state compact">
            <p>Point the camera at a Launch Pad 2026 QR code to begin scanning.</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-heading">
          <p className="eyebrow">Recent Check-ins</p>
          <h2>Attendance log</h2>
          <p>Latest successful scans appear here with pass classification for quick verification.</p>
        </div>

        {!attendance.length ? (
          <div className="empty-state compact">
            <p>No attendance has been marked yet.</p>
          </div>
        ) : (
          <div className="stack-list">
            {attendance.slice(0, 8).map((entry) => (
              <article className="list-card" key={entry.registrationId}>
                <div>
                  <h3>{entry.name}</h3>
                  <p>{entry.registrationId}</p>
                </div>
                <div className="list-meta">
                  <PassBadge passType={entry.passType} />
                  <small>{new Date(entry.scannedAt).toLocaleString()}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
