export default function PassBadge({ passType }) {
  const tone = passType === "Startup Pass" ? "startup" : "innovator";

  return <span className={`badge badge-${tone}`}>{passType}</span>;
}
