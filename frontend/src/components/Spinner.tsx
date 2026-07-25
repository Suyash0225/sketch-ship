interface Props {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 20, className = "" }: Props) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}
