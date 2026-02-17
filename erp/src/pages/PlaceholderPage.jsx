import { useLocation } from "react-router";

const PlaceholderPage = () => {
  const location = useLocation();

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-surface-400 text-lg mb-2">
          {location.pathname.slice(1).replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()) || "Page"}
        </p>
        <p className="text-surface-500 text-sm">Coming soon</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;