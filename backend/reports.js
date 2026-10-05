export function escapeCsvCell(value) {
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function calculateDailyTotals(records, period = 'dia') {
  return records.reduce(
    (totals, record) => {
      const quantity = Number(record.quantidade_entregas);
      const note = Number(String(record.nota).replace(',', '.'));
      const output = Number(record.saida) || 0;

      if (!Number.isFinite(note)) {
        throw new Error(`Confira a nota dos registros deste ${period}.`);
      }

      totals.quantity += quantity;
      totals.gain += (quantity - 50) * note + output;
      return totals;
    },
    { quantity: 0, gain: 0 },
  );
}

export function isValidDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}
