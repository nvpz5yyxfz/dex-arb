import type { SortDirection } from '../types';

interface SortIconProps {
  active: boolean;
  direction: SortDirection;
}

export function SortIcon({ active, direction }: SortIconProps) {
  return (
    <span className={`sort-icon ${active ? 'active' : ''}`}>
      {active ? (direction === 'asc' ? ' \u25B2' : ' \u25BC') : ' \u25BC'}
    </span>
  );
}
