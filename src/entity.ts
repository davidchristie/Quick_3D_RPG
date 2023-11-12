import * as THREE from "three";
import { Component } from "./component";
import { EntityManager } from "./entity-manager";
import { Message } from "./message";
import { Handler } from "./handler";

export class Entity {
  private _name: string | null;
  private _components: Record<string, Component>;
  public _position: THREE.Vector3;
  public _rotation: THREE.Quaternion;
  private _handlers: Record<string, ((message: Message) => void)[]>;
  public _parent: EntityManager | null;

  constructor() {
    this._name = null;
    this._components = {};

    this._position = new THREE.Vector3();
    this._rotation = new THREE.Quaternion();
    this._handlers = {};
    this._parent = null;
  }

  _RegisterHandler(n: string, h: Handler) {
    if (!(n in this._handlers)) {
      this._handlers[n] = [];
    }
    this._handlers[n].push(h);
  }

  SetParent(p: EntityManager) {
    this._parent = p;
  }

  SetName(n: string) {
    this._name = n;
  }

  get Name() {
    return this._name;
  }

  SetActive(b: boolean) {
    if (this._parent === null) {
      throw new Error("Parent is null.");
    }
    this._parent.SetActive(this, b);
  }

  AddComponent(c: Component) {
    c.SetParent(this);
    this._components[c.constructor.name] = c;

    c.InitComponent();
  }

  GetComponent(n: string) {
    return this._components[n];
  }

  FindEntity(n: string) {
    if (this._parent === null) {
      throw new Error("Parent is null.");
    }
    return this._parent.Get(n);
  }

  Broadcast(msg: Message) {
    if (!(msg.topic in this._handlers)) {
      return;
    }

    for (let curHandler of this._handlers[msg.topic]) {
      curHandler(msg);
    }
  }

  SetPosition(p: THREE.Vector3) {
    this._position.copy(p);
    this.Broadcast({
      topic: "update.position",
      value: this._position,
    });
  }

  SetQuaternion(r: THREE.Quaternion) {
    this._rotation.copy(r);
    this.Broadcast({
      topic: "update.rotation",
      value: this._rotation,
    });
  }

  Update(timeElapsed: number) {
    for (let k in this._components) {
      this._components[k].Update(timeElapsed);
    }
  }
}
