const SPOKES =
	"M12 12L12 1.5M12 12L19.42 4.58M12 12L22.5 12M12 12L19.42 19.42M12 12L12 22.5M12 12L4.58 19.42M12 12L1.5 12M12 12L4.58 4.58";
const RINGS =
	"M12 8.8L14.26 9.74L15.2 12L14.26 14.26L12 15.2L9.74 14.26L8.8 12L9.74 9.74Z" +
	"M12 5.4L16.67 7.33L18.6 12L16.67 16.67L12 18.6L7.33 16.67L5.4 12L7.33 7.33Z" +
	"M12 1.5L19.42 4.58L22.5 12L19.42 19.42L12 22.5L4.58 19.42L1.5 12L4.58 4.58Z";

/** The Arachne mark: an octagonal web with the spider on the middle ring. */
export function Mark(props: { size?: number }) {
	const size = props.size ?? 20;
	return (
		<svg class="mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
			<path
				d={`${SPOKES}${RINGS}`}
				fill="none"
				stroke="currentColor"
				stroke-width="1.1"
				stroke-linejoin="round"
			/>
			<circle cx="16.67" cy="7.33" r="2" class="mark-spider" />
		</svg>
	);
}
