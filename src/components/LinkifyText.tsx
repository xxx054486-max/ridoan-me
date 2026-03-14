interface LinkifyTextProps {
  text: string;
  className?: string;
}

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

export default function LinkifyText({ text, className }: LinkifyTextProps) {
  const parts = text.split(URL_REGEX);

  return (
    <p className={className}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
