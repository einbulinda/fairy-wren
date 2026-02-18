import { Loader2 } from "lucide-react";

const sizeMap = {
  small: { icon: 20, text: "text-sm", min: "min-h-[200px]" },
  default: { icon: 32, text: "text-base", min: "min-h-[400px]" },
  large: { icon: 44, text: "text-lg", min: "min-h-[500px]" },
};

const LoadingSpinner = ({ message = "Loading...", size = "default", fullScreen = false }) => {
  const s = sizeMap[size] || sizeMap.default;

  const content = (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? "min-h-screen" : s.min}`}>
      <Loader2
        size={s.icon}
        className="text-primary-400 animate-spin mb-4"
      />
      <p className={`${s.text} text-surface-400 font-medium`}>{message}</p>
    </div>
  );

  return content;
};

export default LoadingSpinner;