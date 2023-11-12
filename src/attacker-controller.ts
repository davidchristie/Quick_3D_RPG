import * as THREE from "three";
import { Component } from "./component";
import { math } from "./math";
import { Message, PlayerActionMessage } from "./message";

type Params = {
  timing: number;
};

export class AttackController extends Component {
  public readonly _params: Params;
  public _timeElapsed: number;
  public _action: unknown;

  constructor(params: Params) {
    super();
    this._params = params;
    this._timeElapsed = 0.0;
    this._action = null;
  }

  InitComponent() {
    this._RegisterHandler("player.action", (m: Message) => {
      if (m.topic !== "player.action") {
        throw new Error("Topic must be player.action.");
      }
      this._OnAnimAction(m);
    });
  }

  _OnAnimAction(m: PlayerActionMessage) {
    if (this._parent === null) {
      throw new Error("Parent is null.");
    }

    if (m.action != this._action) {
      this._action = m.action;
      this._timeElapsed = 0.0;
    }

    const oldTiming = this._timeElapsed;
    this._timeElapsed = m.time;

    if (
      oldTiming < this._params.timing &&
      this._timeElapsed >= this._params.timing
    ) {
      const inventory = this.GetComponent("InventoryController");
      const equip = this.GetComponent("EquipWeapon");
      let item = null;
      if (equip) {
        item = inventory.GetItemByName(equip.Name);
        if (item) {
          item = item.GetComponent("InventoryItem");
        }
      }

      const grid = this.GetComponent("SpatialGridController");
      const nearby = grid.FindNearbyEntities(2);

      const _Filter = (c) => {
        if (c.entity == this._parent) {
          return false;
        }

        const h = c.entity.GetComponent("HealthComponent");
        if (!h) {
          return false;
        }

        return h.IsAlive();
      };

      const attackable = nearby.filter(_Filter);
      for (let a of attackable) {
        const target = a.entity;

        const dirToTarget = target._position
          .clone()
          .sub(this._parent._position);
        dirToTarget.normalize();

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this._parent._rotation);
        forward.normalize();

        let damage = this.GetComponent("HealthComponent")._params.strength;
        if (item) {
          damage *= item.Params.damage;
          damage = Math.round(damage);
        }

        const dot = forward.dot(dirToTarget);
        if (math.in_range(dot, 0.9, 1.1)) {
          target.Broadcast({
            topic: "health.damage",
            value: damage,
            attacker: this._parent,
          });
        }
      }
    }
  }
}
