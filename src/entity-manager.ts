import { Entity } from "./entity";

export class EntityManager {
  private _ids: number;
  private _entitiesMap: Record<string, Entity>;
  private _entities: Entity[];

  constructor() {
    this._ids = 0;
    this._entitiesMap = {};
    this._entities = [];
  }

  _GenerateName() {
    this._ids += 1;

    return "__name__" + this._ids;
  }

  Get(n: string) {
    return this._entitiesMap[n];
  }

  Filter(cb: (entity: Entity) => boolean) {
    return this._entities.filter(cb);
  }

  Add(e: Entity, n: string) {
    if (!n) {
      n = this._GenerateName();
    }

    this._entitiesMap[n] = e;
    this._entities.push(e);

    e.SetParent(this);
    e.SetName(n);
  }

  SetActive(e: Entity, b: boolean) {
    const i = this._entities.indexOf(e);
    if (i < 0) {
      return;
    }

    this._entities.splice(i, 1);
  }

  Update(timeElapsed: number) {
    for (let e of this._entities) {
      e.Update(timeElapsed);
    }
  }
}
