import * as THREE from "three";
import { EntityManager } from "./entity-manager";
import { SpatialHashGrid } from "./spatial-hash-grid";
import { Entity } from "./entity";
import { UIController } from "./ui-controller";
import { math } from "./math";
import { AnimatedModelComponent, StaticModelComponent } from "./gltf-component";
import { SpatialGridController } from "./spatial-grid-controller";
import { LevelUpComponentSpawner } from "./level-up-component";
import { InventoryController, InventoryItem } from "./inventory-controller";
import {
  BasicCharacterControllerInput,
  PickableComponent,
} from "./player-input";
import { QuestComponent } from "./quest-component";
import { BasicCharacterController } from "./player-entity";
import { EquipWeapon } from "./equip-weapon-component";
import { HealthComponent } from "./health-component";
import { AttackController } from "./attacker-controller";
import { ThirdPersonCamera } from "./third-person-camera";
import { NPCController } from "./npc-entity";
import { HealthBar } from "./health-bar";
// import { AttackController } from "./attacker-controller";
// import { entity_manager } from "./entity-manager";
// import { entity } from "./entity";
// import { equip_weapon_component } from "./equip-weapon-component";
// import { gltf_component } from "./gltf-component";
// import { health_bar } from "./health-bar";
// import { health_component } from "./health-component";
// import { inventory_controller } from "./inventory-controller";
// import { level_up_component } from "./level-up-component";
// import { math } from "./math";
// import { npc_entity } from "./npc-entity";
// import { player_entity } from "./player-entity";
// import { player_input } from "./player-input";
// import { quest_component } from "./quest-component";
// import { spatial_grid_controller } from "./spatial-grid-controller";
// import { spatial_hash_grid } from "./spatial-hash-grid";
// import { third_person_camera } from "./third-person-camera";
// import { ui_controller } from "./ui-controller";

const _VS = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

class HackNSlashDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.gammaFactor = 2.2;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);
    this._threejs.domElement.id = "threejs";

    document.getElementById("container").appendChild(this._threejs.domElement);

    window.addEventListener(
      "resize",
      () => {
        this._OnWindowResize();
      },
      false
    );

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 10000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xffffff);
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

    let light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-10, 500, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    this._sun = light;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1e601c,
      })
    );
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    this._entityManager = new EntityManager();
    this._grid = new SpatialHashGrid(
      [
        [-1000, -1000],
        [1000, 1000],
      ],
      [100, 100]
    );

    this._LoadControllers();
    this._LoadPlayer();
    this._LoadFoliage();
    this._LoadClouds();
    this._LoadSky();

    this._previousRAF = null;
    this._RAF();
  }

  _LoadControllers() {
    const ui = new Entity();
    ui.AddComponent(new UIController());
    this._entityManager.Add(ui, "ui");
  }

  _LoadSky() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xfffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    this._scene.add(hemiLight);

    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 },
    };
    uniforms["topColor"].value.copy(hemiLight.color);

    this._scene.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(sky);
  }

  _LoadClouds() {
    for (let i = 0; i < 20; ++i) {
      const index = math.rand_int(1, 3);
      const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        100,
        (Math.random() * 2.0 - 1.0) * 500
      );

      const e = new Entity();
      e.AddComponent(
        new StaticModelComponent({
          scene: this._scene,
          resourcePath: "./resources/nature2/GLTF/",
          resourceName: "Cloud" + index + ".glb",
          position: pos,
          scale: Math.random() * 5 + 10,
          emissive: new THREE.Color(0x808080),
        })
      );
      e.SetPosition(pos);
      this._entityManager.Add(e);
      e.SetActive(false);
    }
  }

  _LoadFoliage() {
    for (let i = 0; i < 100; ++i) {
      const names = [
        "CommonTree_Dead",
        "CommonTree",
        "BirchTree",
        "BirchTree_Dead",
        "Willow",
        "Willow_Dead",
        "PineTree",
      ];
      const name = names[math.rand_int(0, names.length - 1)];
      const index = math.rand_int(1, 5);

      const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        0,
        (Math.random() * 2.0 - 1.0) * 500
      );

      const e = new Entity();
      e.AddComponent(
        new StaticModelComponent({
          scene: this._scene,
          resourcePath: "./resources/nature/FBX/",
          resourceName: name + "_" + index + ".fbx",
          scale: 0.25,
          emissive: new THREE.Color(0x000000),
          specular: new THREE.Color(0x000000),
          receiveShadow: true,
          castShadow: true,
        })
      );
      e.AddComponent(new SpatialGridController({ grid: this._grid }));
      e.SetPosition(pos);
      this._entityManager.Add(e);
      e.SetActive(false);
    }
  }

  _LoadPlayer() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };

    const levelUpSpawner = new Entity();
    levelUpSpawner.AddComponent(
      new LevelUpComponentSpawner({
        camera: this._camera,
        scene: this._scene,
      })
    );
    this._entityManager.Add(levelUpSpawner, "level-up-spawner");

    const axe = new Entity();
    axe.AddComponent(
      new InventoryItem({
        type: "weapon",
        damage: 3,
        renderParams: {
          name: "Axe",
          scale: 0.25,
          icon: "war-axe-64.png",
        },
      })
    );
    this._entityManager.Add(axe);

    const sword = new Entity();
    sword.AddComponent(
      new InventoryItem({
        type: "weapon",
        damage: 3,
        renderParams: {
          name: "Sword",
          scale: 0.25,
          icon: "pointy-sword-64.png",
        },
      })
    );
    this._entityManager.Add(sword);

    const girl = new Entity();
    girl.AddComponent(
      new AnimatedModelComponent({
        scene: this._scene,
        resourcePath: "./resources/girl/",
        resourceName: "peasant_girl.fbx",
        resourceAnimation: "Standing Idle.fbx",
        scale: 0.035,
        receiveShadow: true,
        castShadow: true,
      })
    );
    girl.AddComponent(
      new SpatialGridController({
        grid: this._grid,
      })
    );
    girl.AddComponent(new PickableComponent());
    girl.AddComponent(new QuestComponent());
    girl.SetPosition(new THREE.Vector3(30, 0, 0));
    this._entityManager.Add(girl);

    const player = new Entity();
    player.AddComponent(new BasicCharacterControllerInput(params));
    player.AddComponent(new BasicCharacterController(params));
    player.AddComponent(new EquipWeapon({ anchor: "RightHandIndex1" }));
    player.AddComponent(new InventoryController(params));
    player.AddComponent(
      new HealthComponent({
        updateUI: true,
        health: 100,
        maxHealth: 100,
        strength: 50,
        wisdomness: 5,
        benchpress: 20,
        curl: 100,
        experience: 0,
        level: 1,
      })
    );
    player.AddComponent(new SpatialGridController({ grid: this._grid }));
    player.AddComponent(new AttackController({ timing: 0.7 }));
    this._entityManager.Add(player, "player");

    player.Broadcast({
      topic: "inventory.add",
      value: axe.Name,
      added: false,
    });

    player.Broadcast({
      topic: "inventory.add",
      value: sword.Name,
      added: false,
    });

    player.Broadcast({
      topic: "inventory.equip",
      value: sword.Name,
      added: false,
    });

    const camera = new Entity();
    camera.AddComponent(
      new ThirdPersonCamera({
        camera: this._camera,
        target: this._entityManager.Get("player"),
      })
    );
    this._entityManager.Add(camera, "player-camera");

    for (let i = 0; i < 50; ++i) {
      const monsters = [
        {
          resourceName: "Ghost.fbx",
          resourceTexture: "Ghost_Texture.png",
        },
        {
          resourceName: "Alien.fbx",
          resourceTexture: "Alien_Texture.png",
        },
        {
          resourceName: "Skull.fbx",
          resourceTexture: "Skull_Texture.png",
        },
        {
          resourceName: "GreenDemon.fbx",
          resourceTexture: "GreenDemon_Texture.png",
        },
        {
          resourceName: "Cyclops.fbx",
          resourceTexture: "Cyclops_Texture.png",
        },
        {
          resourceName: "Cactus.fbx",
          resourceTexture: "Cactus_Texture.png",
        },
      ];
      const m = monsters[math.rand_int(0, monsters.length - 1)];

      const npc = new Entity();
      npc.AddComponent(
        new NPCController({
          camera: this._camera,
          scene: this._scene,
          resourceName: m.resourceName,
          resourceTexture: m.resourceTexture,
        })
      );
      npc.AddComponent(
        new HealthComponent({
          health: 50,
          maxHealth: 50,
          strength: 2,
          wisdomness: 2,
          benchpress: 3,
          curl: 1,
          experience: 0,
          level: 1,
          camera: this._camera,
          scene: this._scene,
        })
      );
      npc.AddComponent(new SpatialGridController({ grid: this._grid }));
      npc.AddComponent(
        new HealthBar({
          parent: this._scene,
          camera: this._camera,
        })
      );
      npc.AddComponent(new AttackController({ timing: 0.35 }));
      npc.SetPosition(
        new THREE.Vector3(
          (Math.random() * 2 - 1) * 500,
          0,
          (Math.random() * 2 - 1) * 500
        )
      );
      this._entityManager.Add(npc);
    }
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _UpdateSun() {
    const player = this._entityManager.Get("player");
    const pos = player._position;

    this._sun.position.copy(pos);
    this._sun.position.add(new THREE.Vector3(-10, 500, -10));
    this._sun.target.position.copy(pos);
    this._sun.updateMatrixWorld();
    this._sun.target.updateMatrixWorld();
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);

    this._UpdateSun();

    this._entityManager.Update(timeElapsedS);
  }
}

let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new HackNSlashDemo();
});
