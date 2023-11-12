import * as THREE from "three";
import { Component } from "./component";
import { Entity } from "./entity";
import { ParticleSystem } from "./particle-system";

export class LevelUpComponentSpawner extends Component {
  constructor(params) {
    super();
    this._params = params;
  }

  Spawn(pos) {
    const e = new Entity();
    e.SetPosition(pos);
    e.AddComponent(new LevelUpComponent(this._params));
    this._parent._parent.Add(e);

    return e;
  }
}

export class LevelUpComponent extends Component {
  constructor(params) {
    super();
    this._params = params;

    this._particles = new ParticleSystem({
      camera: params.camera,
      parent: params.scene,
      texture: "./resources/textures/ball.png",
    });
    this._particles._alphaSpline.AddPoint(0.0, 0.0);
    this._particles._alphaSpline.AddPoint(0.1, 1.0);
    this._particles._alphaSpline.AddPoint(0.7, 1.0);
    this._particles._alphaSpline.AddPoint(1.0, 0.0);

    this._particles._colourSpline.AddPoint(0.0, new THREE.Color(0x00ff00));
    this._particles._colourSpline.AddPoint(0.5, new THREE.Color(0x40c040));
    this._particles._colourSpline.AddPoint(1.0, new THREE.Color(0xff4040));

    this._particles._sizeSpline.AddPoint(0.0, 0.05);
    this._particles._sizeSpline.AddPoint(0.5, 0.25);
    this._particles._sizeSpline.AddPoint(1.0, 0.0);
  }

  InitComponent() {
    this._particles.AddParticles(this._parent._position, 300);
  }

  Update(timeElapsed) {
    this._particles.Step(timeElapsed);
    if (this._particles._particles.length == 0) {
      this._parent.SetActive(false);
    }
  }
}
