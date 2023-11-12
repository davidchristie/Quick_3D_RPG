import { Entity } from "./entity";
import { Handler } from "./handler";
import { Message } from "./message";

export class Component {
  protected _parent: Entity | null;

  public constructor() {
    this._parent = null;
  }

  public SetParent(p: Entity) {
    this._parent = p;
  }

  public InitComponent() {}

  public GetComponent(n: string) {
    if (this._parent === null) {
      throw new Error("Parent is null.");
    }
    return this._parent.GetComponent(n);
  }

  FindEntity(n: string) {
    if (this._parent === null) {
      throw new Error("Parent is null.");
    }
    return this._parent.FindEntity(n);
  }

  public Broadcast(m: Message) {
    if (this._parent === null) {
      throw new Error("Parent is null.");
    }
    this._parent.Broadcast(m);
  }

  public Update(timeElapsed: number) {}

  public _RegisterHandler(n: string, h: Handler) {
    if (this._parent === null) {
      throw new Error("Parent is null.");
    }
    this._parent._RegisterHandler(n, h);
  }
}
