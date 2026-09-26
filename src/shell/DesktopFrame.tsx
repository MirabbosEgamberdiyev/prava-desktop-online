import type { ReactNode } from "react";
import TitleBar from "./TitleBar";
import StatusBar from "./StatusBar";
import GlobalHotkeys from "./GlobalHotkeys";
import "./shell.css";

/**
 * Window chrome for every route (auth pages included — the window is frameless, so the
 * caption must always be present): titlebar · content · status bar, plus the global hotkeys.
 */
export default function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="shell-frame">
      <TitleBar />
      <div className="shell-body">{children}</div>
      <StatusBar />
      <GlobalHotkeys />
    </div>
  );
}
