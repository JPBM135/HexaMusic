export function conditionalArrayReverse<T>(array: T[], condition: boolean): T[] {
	return condition ? array.reverse() : array;
}
