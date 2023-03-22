import { Color, LineBasicMaterial, MeshBasicMaterial} from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import { proyectos } from "./proyectos.js";
import { ifcTraducidoEsp } from "./ifcTranslate";

//ELEMENTOS HTML
const pageTitle = document.querySelector("title");
const container = document.getElementById("viewrer-container");
const projectName = document.getElementById("nombreModelo");
const contextMenu = document.querySelector(".wrapper");
const shareMenu = contextMenu.querySelector(".annotation-menu");
const menuHtml = document.getElementById("ifc-property-menu");
const propMenu = document.createElement("div");
const propContent = document.createElement("div");
const floorContainer = document.getElementById("floor-container");
const exitButton = document.getElementById("exit-button");
const selectButton = document.getElementById("select-button");
const clippingButton = document.getElementById("clipping-button");
const extendButton = document.getElementById("extends-button");
const planFloorButton = document.getElementById("plan-floor-button");
const treeButton = document.getElementById("tree-button");
const treeContainer = document.getElementById("tree-container");
const visionButton = document.getElementById("visibility-button");
const checkboxesOfType = document.getElementById("checkbox-category");

//IDENTIFICACIÓN DEL PROYECTO
const currenturl = window.location.href;
const url = new URL(currenturl);
const idProperty = url.searchParams.get("id");

const projectObjArray = proyectos.filter((model) => {
  if (model.id === idProperty) {
    return model;
  }
});

const projectObj = projectObjArray[0];
const projectTitle = projectObj.name;

projectName.textContent = projectTitle;
pageTitle.innerText=projectTitle;
const modelURL = projectObj.url;

//CONFIGURACION DE LA ESCENA Y SUS ELEMENTOS
const viewer = await setupScene();
setupMultiThreading();
const scene = viewer.context.getScene();
const model = await viewer.IFC.loadIfcUrl(modelURL, true);
const subsetOfModel = await visualSetup();

//MAPEO INICIAL DE PROPIEDADES
//postprocessingPorperties();
let modelProperties;
await loadProperties();
const psets = getAllPsets();
const saceemPsets = getAllSaceem(psets);
const saceemParams = getAllSaceemParameters(saceemPsets);

const saceemTypes = getAllSaceemTypes(saceemParams);
const saceemIds = getAllSaceemIds(saceemParams);
const saceemConcreteDates = getAllSaceemConcreteDates(saceemParams);

let elementsHidden = [];
const categorySubsets={};
const ifcTypes = returnTypesOfElements();
const treeStructure = await viewer.IFC.getSpatialStructure(model.modelID);

window.onmousemove = async () => await viewer.IFC.selector.prePickIfcItem();

//CONFIGURACIÓN BOTONES
let activeSelection = false;
let clippingPlaneActive = false;
let planFloorActive = false;
let treeActive = false;
let specialVisionActive = false;

exitButton.onclick = () => {
  virtualLink("./index.html");
};

selectButton.onclick = () => {
  activeSelection = !activeSelection;
  if (activeSelection) {
    selectButton.classList.add("active-button");
    menuHtml.appendChild(propMenu);
    menuHtml.appendChild(propContent);
  } else {
    selectButton.classList.remove("active-button");
    removeAllChildren(menuHtml);
    menuHtml.classList.remove("ifc-property-menu");
    viewer.IFC.selector.unpickIfcItems();
  }
};

clippingButton.onclick = () => {
  clippingPlaneActive = !clippingPlaneActive;
  if (clippingPlaneActive) {
    clippingButton.classList.add("active-button");
    viewer.clipper.active = clippingPlaneActive;
  } else {
    clippingButton.classList.remove("active-button");
    viewer.clipper.deleteAllPlanes();
  }
};

extendButton.onclick = () => {
  viewer.context.ifcCamera.cameraControls.fitToSphere(model, true);
};

visionButton.onclick = async () => {
  specialVisionActive = !specialVisionActive;
  if (specialVisionActive) {
    visionButton.classList.add("active-button");
    checkboxesOfType.style.zIndex=2;
    await createCheckBoxStructure(checkboxesOfType);
  } else {
    for(let subset in categorySubsets){
      categorySubsets[subset].removeFromParent();
    }
    scene.add(subsetOfModel);
    togglePickable(subsetOfModel, true);
    visionButton.classList.remove("active-button");
    checkboxesOfType.style.zIndex=0;
    removeAllChildren(checkboxesOfType);
  }
};

planFloorButton.onclick = () => {
  planFloorActive = !planFloorActive;
  if (planFloorActive) {
    planFloorButton.classList.add("active-button");
    floorContainer.style.zIndex=2;
    loadPlans(model.modelID);
  } else {
    viewer.plans.exitPlanView();
    viewer.edges.toggle("bordes", false);
    //togglePostProduction(true);
    planFloorButton.classList.remove("active-button");
    floorContainer.style.zIndex=0;
    removeAllChildren(floorContainer);
  }
};

treeButton.onclick = async () => {
  treeActive = !treeActive;
  if (treeActive) {
    treeButton.classList.add("active-button");
    treeContainer.style.zIndex=2;
    viewer.IFC.selector.fadeAwayModels();
    createIFCStructureTree(treeContainer);
  } else {
    treeButton.classList.remove("active-button");
    viewer.IFC.selector.unHighlightIfcItems();
    removeAllChildren(menuHtml);
    menuHtml.classList.remove("ifc-property-menu");
    treeContainer.style.zIndex=0;
    removeAllChildren(treeContainer);
  }
};

//ACCIONES
window.ondblclick = async () => {
  if (activeSelection) {
    const result = await viewer.IFC.selector.pickIfcItem(true);
    propertiesPanel(result);
  }
  if (clippingPlaneActive) {
    viewer.clipper.createPlane();
  }
};

window.onkeydown = (event) => {
  if (event.code === "Delete" && clippingPlaneActive) {
    viewer.clipper.deletePlane();
  }
};

//Acciones a tomar al hacer click en boton derecho. Fuente menú contextual: https://www.codingnepalweb.com/right-click-context-menu-html-javascript/
let rigthClickResult;
window.addEventListener("contextmenu", async (e) => {
  e.preventDefault();
  let x = e.offsetX,
    y = e.offsetY,
    winWidth = window.innerWidth,
    winHeight = window.innerHeight,
    cmWidth = contextMenu.offsetWidth,
    cmHeight = contextMenu.offsetHeight;

  if (x > winWidth - cmWidth - shareMenu.offsetWidth) {
    shareMenu.style.left = "-200px";
  } else {
    shareMenu.style.left = "";
    shareMenu.style.right = "-200px";
  }

  x = x > winWidth - cmWidth ? winWidth - cmWidth - 5 : x;
  y = y > winHeight - cmHeight ? winHeight - cmHeight - 5 : y;

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  //contextMenu.style.visibility = "visible";
  contextMenu.style.display = "unset";

  rigthClickResult = viewer.context.castRayIfc();
  const hideElement = document.getElementById("hide-element");
  const isolateElement = document.getElementById("isolate-element");
  if (rigthClickResult === null){
    hideElement.classList.add("option-close");
    isolateElement.classList.add("option-close");
  } else {
    hideElement.classList.remove("option-close");
    isolateElement.classList.remove("option-close");    
  }

});

document.addEventListener("click", async (e) => {
  //contextMenu.style.visibility = "hidden";
  viewer.IFC.selector.unpickIfcItems();

  if (e.target.getAttribute("id") === "snapshoot-option") {
    contextMenu.style.display = "none";
    const urlImage = viewer.context.renderer.newScreenshot();
    virtualLink(urlImage, "Captura.png");
  }

  if (e.target.getAttribute("id") === "hide-element") {
    contextMenu.style.display = "none";
    if (rigthClickResult === null) return;
    hideClickedItem(rigthClickResult);
    /*const index = rigthClickResult.faceIndex;
    const id = viewer.IFC.loader.ifcManager.getExpressId(model.geometry, index);
    console.log(id);
    viewer.IFC.loader.ifcManager.removeFromSubset(model.modelID, [id]);*/
  }

  if (e.target.getAttribute("id") === "isolate-element") {
    contextMenu.style.display = "none";
    if (rigthClickResult === null) return;
    const index = rigthClickResult.faceIndex;
    const id = viewer.IFC.loader.ifcManager.getExpressId(model.geometry, index);
    console.log(id);
    await viewer.IFC.selector.highlightIfcItemsByID(model.modelID, [id], true);
  }

  if (e.target.getAttribute("id") === "show-element") {
    contextMenu.style.display = "none";
    viewer.IFC.selector.unHighlightIfcItems();
    showAllItems(getAllIds());
  }
});

//FUNCIONES AUXILIARES

async function setupScene() {
  const viewer = new IfcViewerAPI({
    container,
    backgroundColor: new Color(0xffffff),
  });
  viewer.grid.setGrid();
  viewer.axes.setAxes();
  //togglePostProduction(true);
	return viewer;
}

async function setupMultiThreading(){
  await viewer.IFC.loader.ifcManager.useWebWorkers(true,"./IFCWorker.js");
}

async function postprocessingPorperties(){
  const result = await viewer.IFC.properties.serializeAllProperties(model);
  const fileName = `properties_${projectObj.name}`;
  const file = new File(result,"fileName");
  const fileUrl = URL.createObjectURL(file);
  virtualLink(fileUrl,`${fileName}.json`);

}

async function loadProperties(){
  const rawProperties = await fetch(`./resources/json/properties_${projectObj.name}.json`);
  modelProperties = await rawProperties.json();
}

function virtualLink(url, downloadDoc) {
  const link = document.createElement("a");
  document.body.appendChild(link);
  if (downloadDoc) {
    link.download = downloadDoc;
  }
  link.href = url;
  link.click();
  link.remove();
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function togglePostProduction(active) {
  viewer.context.renderer.postProduction.active = active;
}

function returnTypesOfElements() {
  const allTypes = viewer.IFC.loader.ifcManager.typesMap;
  const modelTypes = model.ifcManager.properties.handler.state.models[model.modelID].types;
  const typesArray = [];
  for (let elementOfType in modelTypes) {
    typesArray.push(modelTypes[elementOfType]);
  }
  const typesUnique = Array.from(new Set(typesArray));
  const typesArrayElements = typesUnique.filter((e) => {
    if (e === 103090709 || e === 4097777520 || e === 4031249490 || e === 3124254112) {
      return false;
    } else {
      return true;
    }
  });
  const typeObject = {};
  for (let type of typesArrayElements) {
    typeObject[type] = allTypes[type];
  }
  return typeObject;
}

async function loadPlans(modelID) {
  await viewer.plans.computeAllPlanViews(modelID);
  const allPlans = viewer.plans.getAll(modelID);
  const planList = viewer.plans.planLists;
  const lineMaterial = new LineBasicMaterial({ color: "black" });
  const baseMaterial = new MeshBasicMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: 2,
  });
  viewer.edges.create("bordes", modelID, lineMaterial, baseMaterial);

  for (let plan of allPlans) {
    const currentPlan = planList[modelID][plan];
    const button = document.createElement("button");
    button.setAttribute("id", currentPlan.name);
    button.textContent = `NIVEL ${currentPlan.name}`;
    button.classList.add("floor-item");
    floorContainer.appendChild(button);
    button.onclick = () => {
      viewer.plans.goTo(model.modelID, plan);
      viewer.edges.toggle("bordes", true);
      togglePostProduction(false);
    };
  }
}

async function createIFCStructureTree(container) {
  const treeHeader = document.createElement("div");
  treeHeader.textContent = "Estructura IFC";
  treeHeader.classList.add("tree-header");
  container.appendChild(treeHeader);
  const tree = document.createElement("div");
  tree.classList.add("tree-structure");
  container.appendChild(tree);
  const list = document.createElement("ul");
  const listRoot = document.createElement("li");
  list.setAttribute("id", "myUL");
  listRoot.setAttribute("id", "tree-root");
  tree.appendChild(list);
  list.appendChild(listRoot);
  createTreeMenu(treeStructure, listRoot);
}

async function createTreeMenu(ifcProperties, root) {
  removeAllChildren(root);
  const ifcProject = await createNestedChild(root, ifcProperties);
  for (let child of ifcProperties.children) {
    createTreeMenuNode(ifcProject, child);
  }
}

async function createTreeMenuNode(parent, node) {
  const children = node.children;
  if (children.length === 0) {
    await createSimpleChild(parent, node);
    return;
  }
  const nodeElement = await createNestedChild(parent, node);
  for (let child of children) {
    createTreeMenuNode(nodeElement, child);
  }
}

async function createSimpleChild(parent, node) {
  const content = await nodeToSting(node);
  const childNode = document.createElement("li");
  childNode.classList.add("leaf-node");
  childNode.textContent = content;
  parent.appendChild(childNode);
  childNode.onmouseenter = () => {
    viewer.IFC.selector.prepickIfcItemsByID(model.modelID, [node.expressID]);
  };
  childNode.onclick = async () => {
    await viewer.IFC.selector.highlightIfcItemsByID(
      model.modelID,
      [node.expressID],
      true
    );
    const higlightedItem = {
      modelID: model.modelID,
      id: node.expressID,
    };
    menuHtml.appendChild(propMenu);
    menuHtml.appendChild(propContent);
    propertiesPanel(higlightedItem);
  };
}

async function createNestedChild(parent, node) {
  const content = await nodeToSting(node);
  const root = document.createElement("li");
  createTitle(root, content);
  const childrenContainer = document.createElement("ul");
  childrenContainer.classList.add("nested");
  root.appendChild(childrenContainer);
  parent.appendChild(root);
  return childrenContainer;
}

function createTitle(parent, content) {
  const title = document.createElement("span");
  title.classList.add("caret");
  title.addEventListener("click", function () {
    title.parentElement.querySelector(".nested").classList.toggle("active");
    title.classList.toggle("caret-down");
  });
  title.textContent = content;
  parent.appendChild(title);
}

async function nodeToSting(node) {
  const nameType = node.type;
  const nodeProp = await propertiesOfNode(node);

  if (nameType === "IFCPROJECT"){
    return projectTitle;
  }
  if (nameType === "IFCSITE"){
    return "SITE";
  }
  if (nameType === "IFCBUILDING"){
    return "BUILDING";
  }
  if (nameType === "IFCBUILDINGSTOREY"){
    return nodeProp.Name.value;
  }  
  const ifcTypeName = traslateIfcType(ifcTypes[nodeProp.type]);
  const ifcSaceemType = saceemTypes.filter(item => item.RelatedObjects.includes(node.expressID))[0];
  let ifcTypeDisplay;
  if (ifcSaceemType){
    if(ifcSaceemType.NominalValue.length>3){ifcTypeDisplay=ifcSaceemType.NominalValue}else{ifcTypeDisplay=ifcTypeName};
  }else{
    ifcTypeDisplay=ifcTypeName;
  }
  const ifcId = saceemIds.filter(item => item.RelatedObjects.includes(node.expressID));
  let ifcIdValue="";
  if(ifcId[0]!==undefined){
    ifcIdValue = `- ${ifcId[0].NominalValue}`;
  }
  return `${ifcTypeDisplay} ${ifcIdValue}`;
}

async function propertiesOfNode(node){
  return await viewer.IFC.loader.ifcManager.getItemProperties(model.modelID,node.expressID,false);
}

function traslateIfcType(typeName){
  if(ifcTraducidoEsp.hasOwnProperty(typeName)){
    return ifcTraducidoEsp[typeName];
  } else {
      return typeName;
  }
}

async function propertiesPanel(result) {
  menuHtml.classList.add("ifc-property-menu");
  propMenu.classList.add("ifc-property-item");
  propMenu.style.backgroundColor = "#ffd900";
  propMenu.textContent = "Propiedades";
  if (!result) return;
  let prop = await viewer.IFC.getProperties(
    result.modelID,
    result.id,
    false,
    false
  );
  const propPsets = await viewer.IFC.loader.ifcManager.getPropertySets(
    result.modelID,
    result.id,
    true
  );
  const saceemProps = extractSaceemProperties(propPsets);
  createPropertiesMenu(prop, saceemProps, propContent);
}

function extractSaceemProperties(psets){
  for (let pset of psets) {
    if (pset.Name.value === "IFC_DATOS_SACEEM") {
      return pset.HasProperties;
    }
  }
}

function createPropertiesMenu(properties, saceemProperties, container) {
  removeAllChildren(container);
  if (saceemProperties) {
    const objPropSaceem = {};
    for (let saceemProp of saceemProperties) {
      const propKey = saceemProp.Name.value;
      let propValue = saceemProp.NominalValue.value;
      if (Number.isNaN(parseFloat(propValue))) {
        propValue;
      } else {
        if(propKey==="SC_FECHA DE LLENADO" || propKey==="SC_LOTE HORMIGON"){
          const year = propValue.substring(2,-1);
          const month = propValue.substring(2,4);
          const day = propValue.substring(4);
          propValue = `${day}/${month}/20${year}`;
        }else{
          propValue = parseFloat(propValue).toFixed(2);
        }
      }
      objPropSaceem[propKey] = propValue;
    }
    for (const key in objPropSaceem) {
      createPropertyEntry(key, objPropSaceem[key], container);
    }
  } else {
    for (const key in properties) {
      createPropertyEntry(key, properties[key], container);
    }
  }
}

function createPropertyEntry(key, value, container) {
  const propContainer = document.createElement("div");
  propContainer.classList.add("ifc-property-item");

  if (value === null || value === undefined) {
    value = undefined;
  } else if (value.value) {
    value = value.value;
  }

  const keyElement = document.createElement("div");
  keyElement.textContent = key;
  propContainer.appendChild(keyElement);

  const valueElement = document.createElement("div");
  valueElement.classList.add("ifc-property-value");
  valueElement.textContent = value;
  propContainer.appendChild(valueElement);

  container.appendChild(propContainer);
}

async function createCheckBoxStructure(mainContainer) {
  const categoriesHeader = document.createElement("div");
  categoriesHeader.textContent = "Categorías IFC";
  categoriesHeader.classList.add("categories-header");
  mainContainer.appendChild(categoriesHeader);
  const categoriesContainer = document.createElement("div");
  categoriesContainer.classList.add("categories-structure");
  mainContainer.appendChild(categoriesContainer);
  for (let cat in ifcTypes) {
    const categoryElements = createCheckBoxCat(ifcTypes[cat]);
    categoryElements[0].prepend(categoryElements[1]);
    categoriesContainer.appendChild(categoryElements[0]);
  }
  subsetOfModel.removeFromParent();
  togglePickable(subsetOfModel, false);
  await setupAllCategories();
}

function createCheckBoxCat(categoryName){
  const checkbox = document.createElement("div");
  const input = document.createElement("input");
  input.setAttribute("checked",true);
  input.setAttribute("type","checkbox");
  input.setAttribute("id",categoryName);
  checkbox.textContent = traslateIfcType(categoryName);
  return [checkbox,input];
}

async function getAll(category){
  return await viewer.IFC.loader.ifcManager.getAllItemsOfType(model.modelID,category,false);
}

async function newSubsetOfType(category){
  const ids = await getAll(category);
  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: model.modelID,
    scene,
    ids,
    removePrevious: true,
    customID: category.toString()
  })
}

async function setupAllCategories(){
  const allCategories = Object.keys(ifcTypes);
  for (let categoryValue of allCategories){
    const categoryValueToNumber = parseInt(categoryValue);
    await setupCategory(categoryValueToNumber); 
  }
}

async function setupCategory(category){
  categorySubsets[category] = await newSubsetOfType(category);
  togglePickable(categorySubsets[category], true);
  setupCheckBox(category);
}

function setupCheckBox(category){
  const name = ifcTypes[category];
  const checkbox = document.getElementById(name);
  checkbox.addEventListener("change",(e)=>{
    const checked = e.target.checked;
    const subset = categorySubsets[category];
    if (checked){
      scene.add(subset);
      togglePickable(subset, true);
    }else{
      subset.removeFromParent();
      togglePickable(subset, false);
    }
  })
}

function getAllPsets(){
  const propertyValues = Object.values(modelProperties);
  return propertyValues.filter(item => item.type === "IFCRELDEFINESBYPROPERTIES");
}

function getAllSaceem(psets){
  return psets.filter(item => modelProperties[item.RelatingPropertyDefinition].Name === "IFC_DATOS_SACEEM");
}

function getAllSaceemParameters(propSaceem){
  const saceemChildren = propSaceem.map((item) => {
    const propDefinition = modelProperties[item.RelatingPropertyDefinition];
    propDefinition.RelatedObjects = item.RelatedObjects;
    return propDefinition;
  });
  
  const allsaceemProps = saceemChildren.map((item) => { 
    let hasPropsArray = [];
    for (let hprop of item.HasProperties){
      const childPropDef = modelProperties[hprop];
      childPropDef.RelatedObjects = item.RelatedObjects;
      hasPropsArray.push(childPropDef);
      
    }
    return hasPropsArray;
  }).flat();
  return allsaceemProps;
}

function getAllSaceemIds(parametersList){
  return parametersList.filter(item => item.Name === "SC_ID" || item.Name === "SC_ID.CONJUNTO");
}

function getAllSaceemConcreteDates(parametersList){
  const fechasLote = parametersList.filter(item => item.Name === "SC_LOTE HORMIGON");
  const fechasLlenado = parametersList.filter(item => item.Name === "SC_FECHA DE LLENADO");
  if (fechasLote.filter(item => item !== null).length === 0){
    return fechasLlenado;
  }else{
    return fechasLote;
  }
}

function getAllSaceemTypes(parametersList){
  return parametersList.filter(item => item.Name === "SC_TIPO.PIEZA");
}

function getAllIds() {
	return Array.from(new Set(model.geometry.attributes.expressID.array),
	);
}

async function visualSetup() {
	const allIDs = getAllIds();
	const subset = viewer.IFC.loader.ifcManager.createSubset({
   scene,
   modelID: model.modelID,
   ids: allIDs,
   applyBVH: true,
   removePrevious: true,
   customID: "full-model-subset"
  })
	replaceOriginalModelBySubset(subset);
  return subset;
}

function replaceOriginalModelBySubset(subset) {
	const items = viewer.context.items;
	items.pickableIfcModels = items.pickableIfcModels.filter(ifcModel => ifcModel !== model);
	items.ifcModels = items.ifcModels.filter(ifcModel => ifcModel !== model);
	model.removeFromParent();

	items.ifcModels.push(subset);
	items.pickableIfcModels.push(subset);
}

function showAllItems(ids) {
	viewer.IFC.loader.ifcManager.createSubset({
		scene,
    modelID: 0,
		ids,
		removePrevious: false,
		applyBVH: true,
		customID: "full-model-subset"
	});
}

function hideClickedItem(result) {
	if (!result) return;
	const id = viewer.IFC.loader.ifcManager.getExpressId(result.object.geometry, result.faceIndex);
	viewer.IFC.loader.ifcManager.removeFromSubset(0,[id],"full-model-subset");
}

function togglePickable(mesh, isPeackable) {
  const pickable = viewer.context.items.pickableIfcModels;
  if (isPeackable) {
    pickable.push(mesh);
  } else {
    const index = pickable.indexOf(mesh);
    pickable.splice(index, 1);
  }
}