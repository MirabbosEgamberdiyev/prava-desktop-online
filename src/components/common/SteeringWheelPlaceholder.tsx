import { IconSteeringWheel } from "@tabler/icons-react";

interface Props {
  text?: string;
  size?: number;
}

export default function SteeringWheelPlaceholder({ text = "pravaonline.uz", size = 52 }: Props) {
  return (
    <div className="exam-img-placeholder">
      <IconSteeringWheel size={size} stroke={1} color="var(--border)" />
      <span className="exam-placeholder-text">{text}</span>
    </div>
  );
}
