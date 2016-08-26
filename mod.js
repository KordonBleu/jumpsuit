export default function mod(dividend, divisor) {
	return (dividend + divisor*Math.ceil(Math.abs(dividend / divisor))) % divisor;
}
