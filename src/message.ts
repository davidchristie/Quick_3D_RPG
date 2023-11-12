import * as THREE from "three";

export type PlayerActionMessage = {
  topic: "player.action";
  action: string;
  time: number;
};

export type UpdatePositionMessage = {
  topic: "update.position";
  value: THREE.Vector3;
};

export type UpdateRotationMessage = {
  topic: "update.rotation";
  value: THREE.Quaternion;
};

export type Message =
  | PlayerActionMessage
  | UpdatePositionMessage
  | UpdateRotationMessage;
