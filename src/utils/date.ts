export function formatDate(numberOrDate: Date | number) {
	const date = typeof numberOrDate === 'number' ? new Date(numberOrDate) : numberOrDate;

	return date.toISOString().slice(11, 19);
}
