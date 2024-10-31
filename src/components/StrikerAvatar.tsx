import { STRIKER_IMAGES } from "@/constants/strikers";

export default function StrikerAvatar(props: {
  striker: any;
  rightMargin?: boolean;
}) {
  const { striker, rightMargin = true } = props; // Destructure with default

  return (
    <img
      // @ts-ignore
      src={`/strikers/${STRIKER_IMAGES[striker]}`}
      alt={striker}
      width={32}
      style={{
        marginRight: rightMargin ? "8px" : "0px",
        borderRadius: "4px",
      }}
    />
  );
}
