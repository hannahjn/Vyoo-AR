/// <reference types="@argonjs/argon" />
/// <reference types="three" />
/// <reference types="stats" />

// the line below defines INERTIAL frames for the SunMoonLights
var CESIUM_BASE_URL = './cesium/';
var Cesium = Argon.Cesium;
var Cartesian3 = Argon.Cesium.Cartesian3;
var ReferenceFrame = Argon.Cesium.ReferenceFrame;
var JulianDate = Argon.Cesium.JulianDate;
var CesiumMath = Argon.Cesium.CesiumMath;
var app = Argon.init();
// enable geolocation updates
app.context.subscribeGeolocation({ enableHighAccuracy: true });
// creates a CSS 3D perspective element for HTML content
var renderer = new THREE.WebGLRenderer({
    alpha: true,
    logarithmicDepthBuffer: true,
    antialias: Argon.suggestedWebGLContextAntialiasAttribute
});
// account for the pixel density of the device
renderer.setPixelRatio(window.devicePixelRatio);
renderer.sortObjects = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
//creates an absolutely positioned and sized HTML element as a container for the 2D content on the display. 
var hud = new THREE.CSS3DArgonHUD();
// retrieve elements from index.html and move to HUD
var crosshair = document.getElementById('crosshair-wrapper');
hud.appendChild(crosshair);
var hudContainer = document.getElementById('hud');
hud.hudElements[0].appendChild(hudContainer);
var description = document.getElementById('description');
hud.hudElements[0].appendChild(description);
// add layers to the view
app.view.setLayers([
    { source: renderer.domElement },
    { source: hud.domElement }
]);
// uncomment performance stats to see FPS
// var stats = new Stats();
// hud.hudElements[0].appendChild(stats.dom);
// Add button event listener.  Toggle better interaction style.
var isCrosshair = true;
var button = document.getElementById('controls');
button.addEventListener('click', function (event) {
    if (isCrosshair) {
        button.innerText = "Click to switch to crosshair selection";
        isCrosshair = false;
        crosshair.setAttribute('class', 'crosshair hide-crosshair');
    }
    else {
        button.innerText = "Click to switch to touch selection";
        isCrosshair = true;
        crosshair.setAttribute('class', 'crosshair show-crosshair');
    }
    if (INTERSECTED)
        INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
    INTERSECTED = null;
}, false);
// set up scene, camera and objects for the user's location and the chair
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera();
var user = new THREE.Object3D;
var boxScene = new THREE.Object3D;
scene.add(camera);
scene.add(user);
scene.add(boxScene);
// an entity for the collection of objects, which are rooted to the world together
var boxSceneEntity = new Argon.Cesium.Entity({
    name: "box scene",
    position: Cartesian3.ZERO,
    orientation: Cesium.Quaternion.IDENTITY
});
// create simple lighting based on the position of the sun and moon
var sunMoonLights = new THREE.SunMoonLights();

scene.add(sunMoonLights.lights);
// make the sun cast shadows
sunMoonLights.sun.castShadow = true;
sunMoonLights.sun.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(50, 1, 200, 10000));
sunMoonLights.sun.shadow.bias = -0.00022;
sunMoonLights.sun.shadow.mapSize.width = 2048;
sunMoonLights.sun.shadow.mapSize.height = 2048;
// add lighting to the object
var ambientlight = new THREE.AmbientLight(0x404040);
scene.add(ambientlight);

var spotLight = new THREE.SpotLight( 0xffffff );
spotLight.position.set( 45, 2500, 45 );
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.camera.near = 500;
spotLight.shadow.camera.far = 4000;
spotLight.shadow.camera.fov = 30;
scene.add( spotLight );

var spotLight = new THREE.SpotLight( 0xffffff, 0.5 );
spotLight.position.set( -100, -1000, -100 );
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.camera.near = 500;
spotLight.shadow.camera.far = 4000;
spotLight.shadow.camera.fov = 30;
scene.add( spotLight );

var light = new THREE.PointLight( 0xff0000, 1, 100 );
light.position.set( 50, 50, 50 );
scene.add( light );

var light = new THREE.PointLight( 0xff0000, 1, 100 );
light.position.set( -50, -50, -50 );
scene.add( light );

// application variables.
var objects = [];
var plane = new THREE.Plane();
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var offset = new THREE.Vector3();
var intersection = new THREE.Vector3();
var tempPos = new THREE.Vector3();
var INTERSECTED, SELECTED, userContact = false;
var touchID; 
var boxInit = false;
var geoLocked = false;

var loader = new THREE.GLTFLoader();

var chair =  new THREE.Group();

loader.load(
	// load 3D object from the path below
	'./vitra_eames_plastic_chair/scene.gltf',
	function ( importedObject ) {
        var group = [];
        importedObject.scene.traverse( function ( object ) {
            console.log('obj.mat', object, object.material);
            if ( object.material ) {
                if ( object.material  ) {
                    for ( var i = 0, il = object.material.length; i < il; i ++ ) {
                        var material = new THREE.MeshPhongMaterial();
                        THREE.Material.prototype.copy.call( material, object.material[ i ] );
                        material.color.copy( object.material[ i ].color );
                        material.map = object.material[ i ].map;
                        material.lights = false;
                        material.skinning = object.material[ i ].skinning;
                        material.morphTargets = object.material[ i ].morphTargets;
                        material.morphNormals = object.material[ i ].morphNormals;
                        object.material[ i ] = material;
                    }
                } else {
                    var material = new THREE.MeshStandardMaterial({});
                    THREE.Material.prototype.copy.call( material, object.material );
                    material.color.copy( object.material.color );
                    material.map = object.material.map;
                    material.lights = false;
                    material.skinning = object.material.skinning;
                    material.morphTargets = object.material.morphTargets;
                    material.morphNormals = object.material.morphNormals;
                    object.material = material;
                }
                group.push( object );
            }
        } );

        group.forEach((obj) => {
            chair.add(obj)
        })
        //set the initial position of the chair
        chair.position.x = 0;
        chair.position.y = 0;
        chair.position.z = -100;
        chair.rotation.x = 100;
        chair.rotation.y = 0;
        chair.rotation.z = 0;
        chair.scale.x = .2;
        chair.scale.y = .2;
        chair.scale.z = .2;
        chair.castShadow = true;
        chair.receiveShadow = true;
        
        boxScene.add(chair);
        objects.push(chair);
	},
	// called while loading is progressing
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( 'An error happened', error );
	}
);
//The following code controls the behaviour of the object according to user input
app.view.uiEvent.addEventListener(function (evt) {
    var event = evt.event;
    if (event.defaultPrevented) {
        evt.forwardEvent();
        return; // Should do nothing if the key event was already consumed.
    }
    // handles user input
    var ti, tx, ty;
    switch (event.type) {
        case "touchmove":
            if (window.PointerEvent) {
                evt.forwardEvent();
                return; // ignore duplicate events
            }
            event.preventDefault();
            for (ti = 0; ti < event.changedTouches.length; ti++) {
                if (event.changedTouches[ti].identifier == touchID && !SELECTED) {
                    handlePointerMove(x, y);
                    handleSelection();
                }
                break;
            } 
            // if didn't find a move for the first touch, skip
            if (ti == event.changedTouches.length) {
                evt.forwardEvent();
                return;
            }
        case "pointermove":
        case "mousemove":
            // if crosshair interaction, mousemove passed on
            if (isCrosshair) {
                evt.forwardEvent();
                return;
            }
            if (event.type == "touchmove") {
                tx = event.changedTouches[ti].clientX;
                ty = event.changedTouches[ti].clientY;
            }
            else {
                tx = event.clientX;
                ty = event.clientY;
            }
            var x = (tx / window.innerWidth) * 2 - 1;
            var y = -(ty / window.innerHeight) * 2 + 1;
            if (SELECTED) {
                mouse.x = x;
                mouse.y = y;
                raycaster.setFromCamera(mouse, camera);
                // recompute the plane each time, in case the camera moved
                var worldLoc = user.localToWorld(tempPos.copy(SELECTED.position));
                plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(plane.normal), worldLoc);
                if (raycaster.ray.intersectPlane(plane, intersection)) {
                    // planes, rays and intersections are in the local world 3D coordinates
                    var ptInWorld = user.worldToLocal(intersection).sub(offset);
                    SELECTED.position.copy(ptInWorld);
                } 
            }
            else if(userContact)
            {      
                handlePointerMove(x, y);
                handleSelection();
                evt.forwardEvent();
            }
            return;
            case "touchstart":
            userContact = true
            if (window.PointerEvent) {
                handleSelection();
                evt.forwardEvent();
                return; // ignore duplicate events
            }
            event.preventDefault();
            ti = 0;
        case 'pointerdown':
        case 'mousedown':
            // ignore additional touches or pointer down events after the first selection
            userContact = true
            if (SELECTED) {
                // incase of two touches from multitouch device
                evt.forwardEvent();
                return;
            }
            if (isCrosshair) {
                if (event.type == "mousedown") {
                    // ignore mouse down events for selection in crosshair mode
                    evt.forwardEvent();
                    return;
                }
                mouse.x = mouse.y = 0;
            } 
            else {
                if (event.type == "touchstart") {
                    tx = event.changedTouches[ti].clientX;
                    ty = event.changedTouches[ti].clientY;
                }
                else {
                    tx = event.clientX;
                    ty = event.clientY;
                }
                mouse.x = (tx / window.innerWidth) * 2 - 1;
                mouse.y = -(ty / window.innerHeight) * 2 + 1;
            }
            if (handleSelection()) {
                if (event.type == "touchstart") {
                    touchID = event.changedTouches[ti].identifier;
                }
                if (event.type == "touchstart" || event.type == "pointerdown") {
                    if (!isCrosshair) {
                        if (INTERSECTED) {
                        INTERSECTED.mesh.material.color.setHex(INTERSECTED.currentHex);
                        INTERSECTED = SELECTED;
                        INTERSECTED.currentHex = INTERSECTED.materials.color.getHex();
                        INTERSECTED.mesh.material.color.setHex(0xffff33);
                        }
                    }
                }
            }
            else {
                evt.forwardEvent();
            }
            break;
        case "touchend":
            if (window.PointerEvent) {
                evt.forwardEvent();
                return; // ignore duplicate events
            }
            event.preventDefault();
            for (ti = 0; ti < event.changedTouches.length; ti++) {
                if (event.changedTouches[ti].identifier == touchID)
                    break;
            }
            // if no move for the first touch, skip
            if (ti == event.changedTouches.length) {
                evt.forwardEvent();
                return;
            }
        case 'pointerup':
        case 'mouseup':
            userContact = false
            if (isCrosshair && event.type == "mouseup") {
                // ignore mouse up events for selection in crosshair mode
                evt.forwardEvent();
                return;
            }
            if (SELECTED) {
                if (handleRelease()) {
                    if ((event.type == "touchend" || event.type == "pointerup") && !isCrosshair) {
                        if (INTERSECTED)
                            INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                        INTERSECTED = null;
                    }
                }
            }
            else {
                evt.forwardEvent();
            }
            break;
        default:
            evt.forwardEvent();
    }
});
// handles chair translation
function handleRelease() {
    THREE.SceneUtils.detach(SELECTED, user, scene);
    THREE.SceneUtils.attach(SELECTED, scene, boxScene);
    SELECTED = null;
    touchID = null;
    return true;
}
// handle chair rotation
function handleSelection() {
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(mouse, camera);
    chair.rotation.z = 180 * mouse.x
    chair.rotation.x = 180 * mouse.y
    var intersects = raycaster.intersectObjects(objects, true);
    if (intersects.length > 0) {
        var object = chair;
        THREE.SceneUtils.detach(object, boxScene, scene);
        THREE.SceneUtils.attach(object, scene, user);
        SELECTED = object;
        if (!isCrosshair) {
            var worldLoc = user.localToWorld(tempPos.copy(SELECTED.position));
            plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(plane.normal), worldLoc);
            if (raycaster.ray.intersectPlane(plane, intersection)) {
                //offset.copy( user.worldToLocal(( intersection ).sub( worldLoc )));
                offset.copy(user.worldToLocal(intersection).sub(SELECTED.position));
            }
        }
        return true;
    }
    return false;
}

function handlePointerMove(x, y) {
    if (SELECTED) {
        return;
    }
    mouse.x = x;
    mouse.y = y;
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(objects, true);
    if (intersects.length > 0) {
        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED)
                INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
            INTERSECTED = intersects[0].object;
            INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
            INTERSECTED.material.color.setHex(0xffff33);
        }
    }
    else {
        if (INTERSECTED)
            INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        INTERSECTED = null;
    }
}
// update boxScene position when the origin changes
app.context.originChangeEvent.addEventListener(function () {
    if (boxInit) {
        var boxPose = app.context.getEntityPose(boxSceneEntity);
        boxScene.position.copy(boxPose.position);
        boxScene.quaternion.copy(boxPose.orientation);
    }
});
// the updateEvent is called each time the 3D world is rendered, before the renderEvent. update state here.
app.updateEvent.addEventListener(function (frame) {
    // get pose of user and set the THREE user object to match it
    var userPose = app.context.getEntityPose(app.context.user);
    if (userPose.poseStatus & Argon.PoseStatus.KNOWN) {
        user.position.copy(userPose.position);
        user.quaternion.copy(userPose.orientation);
    }
    else {
        return;
    }
    // get sun and moon positions, add/remove lights as necessary
    var defaultFrame = app.context.getDefaultReferenceFrame();
    sunMoonLights.update(frame.time, defaultFrame);
    // create geospatial position to render boxScene
    if (!boxInit) {
        boxSceneEntity.position.setValue(userPose.position, defaultFrame);
        boxSceneEntity.orientation.setValue(userPose.orientation);
        boxInit = true;
        geoLocked = false;
    }
    // if geo coordinates are lost, recenter the scene on the user
    if (geoLocked) {
        var userPoseFIXED = app.context.getEntityPose(app.context.user, ReferenceFrame.FIXED);
        if (!(userPoseFIXED.poseStatus & Argon.PoseStatus.KNOWN)) {
            boxSceneEntity.position.setValue(userPose.position, defaultFrame);
            boxSceneEntity.orientation.setValue(userPose.orientation);
            geoLocked = false;
        }
    }
    else {
        // else convert to world coordinates
        var boxPoseFIXED = app.context.getEntityPose(boxSceneEntity, ReferenceFrame.FIXED);
        if (boxPoseFIXED.poseStatus & Argon.PoseStatus.KNOWN) {
            if (Argon.convertEntityReferenceFrame(boxSceneEntity, frame.time, ReferenceFrame.FIXED)) {
                geoLocked = true;
            }
        }
    }
    // get the pose of the boxscene in local coordinates
    var boxPose = app.context.getEntityPose(boxSceneEntity);
    boxScene.position.copy(boxPose.position);
    boxScene.quaternion.copy(boxPose.orientation);
    if (isCrosshair) {
        handlePointerMove(0, 0);
    }
});
// renderEvent is fired when display is updated
app.renderEvent.addEventListener(function (frame) {
    var monoMode = (app.view.subviews).length == 1;
    if (!monoMode) {
        button.style.display = 'none';
    }
    else {
        button.style.display = 'inline-block';
    }
    //following code handles different view modes
    var view = app.view;
    renderer.setSize(view.renderWidth, view.renderHeight, false);
    renderer.setPixelRatio(app.suggestedPixelRatio);
    var viewport = view.viewport;
    hud.setSize(viewport.width, viewport.height);
    for (var _i = 0, _a = app.view.subviews; _i < _a.length; _i++) {
        var subview = _a[_i];
        camera.position.copy(subview.pose.position);
        camera.quaternion.copy(subview.pose.orientation);
        camera.projectionMatrix.fromArray(subview.frustum.projectionMatrix);
        var _b = subview.renderViewport, x = _b.x, y = _b.y, width = _b.width, height = _b.height;
        renderer.setViewport(x, y, width, height);
        renderer.setScissor(x, y, width, height);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
        var _c = subview.viewport, x = _c.x, y = _c.y, width = _c.width, height = _c.height;
        hud.setViewport(x, y, width, height, subview.index);
        hud.render(subview.index);
    }
    stats.update();
});
