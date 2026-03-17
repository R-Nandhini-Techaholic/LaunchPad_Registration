export default function StatusBadge({ status }) {
  const isPresent = status === "Present";

  return (
    <span className={`badge ${isPresent ? "badge-present" : "badge-absent"}`}>
      {isPresent ? "Present" : "Absent"}
    </span>
  );
}
