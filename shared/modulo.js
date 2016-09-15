export default function(dividend, divisor) {
	return (dividend + divisor*Math.ceil(Math.abs(dividend / divisor))) % divisor;
}
