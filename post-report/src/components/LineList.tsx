export function LineList({
  items,
  className,
}: {
  items: { key: string; text: string }[];
  className?: string;
}) {
  return (
    <ul
      className={className}
      style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.55 }}
    >
      {items.map((i) => (
        <li key={i.key}>{i.text}</li>
      ))}
    </ul>
  );
}