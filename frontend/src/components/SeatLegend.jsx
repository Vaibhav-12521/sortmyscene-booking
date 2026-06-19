const ITEMS = [
  { key: 'available', label: 'Available' },
  { key: 'selected', label: 'Selected' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'booked', label: 'Booked' },
];

export default function SeatLegend() {
  return (
    <ul className="legend">
      {ITEMS.map((item) => (
        <li key={item.key} className="legend__item">
          <span className={`seat seat--${item.key} legend__swatch`} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
