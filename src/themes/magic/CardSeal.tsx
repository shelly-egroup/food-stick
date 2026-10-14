/** 預言卡右上角的火漆印：傳說、史詩… */
export function CardSeal({ text, label }: { text: string; label: string }) {
  return (
    <span className="card__seal card__wax" role="img" aria-label={label}>
      <span>{text}</span>
    </span>
  );
}
