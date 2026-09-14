import { NetworkModeSelector, type NetworkModeSelectorProps } from "./NetworkModeSelector";

export function SyncButton(props: NetworkModeSelectorProps) {
  return <NetworkModeSelector {...props} />;
}

export default SyncButton;
