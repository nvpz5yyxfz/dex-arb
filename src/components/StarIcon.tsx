interface StarIconProps {
  filled: boolean;
  onClick: () => void;
}

export function StarIcon({ filled, onClick }: StarIconProps) {
  return (
    <button
      onClick={onClick}
      className="star-button"
      aria-label={filled ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={filled ? '#f5c842' : 'none'}
        stroke={filled ? '#f5c842' : '#6b7280'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
