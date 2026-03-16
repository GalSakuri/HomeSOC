import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { ConnectionStatus } from "../../hooks/useWebSocket";
import { useSettings } from "../../contexts/SettingsContext";

interface LayoutProps {
  status: ConnectionStatus;
  onToggle: () => void;
}

export function Layout({ status, onToggle }: LayoutProps) {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-soc-bg">
      <Sidebar />
      <div className="ml-56">
        <Header status={status} onToggle={onToggle} />
        <main className={settings.compactMode ? "p-3" : "p-6"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
