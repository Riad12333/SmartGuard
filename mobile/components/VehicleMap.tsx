import { Platform } from "react-native";

import type { Location, PositionHistoryItem } from "@/types";

export interface VehicleMapProps {
  location: Location | null;
  track: PositionHistoryItem[];
  fullScreen?: boolean;
}

const Impl =
  Platform.OS === "web"
    ? require("./VehicleMap.web").VehicleMap
    : require("./VehicleMap.native").VehicleMap;

export function VehicleMap(props: VehicleMapProps) {
  return <Impl {...props} />;
}

export type { Location, PositionHistoryItem };
