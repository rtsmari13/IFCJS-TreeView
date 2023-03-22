import {proyectos} from "./proyectos.js"

const contenedorPrincipal = document.querySelector(".contenedor-principal")
const contenedorProyectosHTML = contenedorPrincipal.children
const contenedorProyectosArray = Array.from(contenedorProyectosHTML)
const contenedorProyectos = contenedorProyectosArray[0]

const proyectoHTML = contenedorProyectos.children
const proyectoArray = Array.from(proyectoHTML)
const proyecto = proyectoArray[0]
console.log(proyecto)


for (let project of proyectos){
    let newProject = document.createElement("a")
    newProject.classList.add("proyecto")
    contenedorProyectos.appendChild(newProject)

    const nombreProyecto = project.name
    const idProyecto = project.id

    newProject.textContent = nombreProyecto

    const baseURLNextPage = "http://127.0.0.1:5500/proyecto.html"
    const newURL = baseURLNextPage + `?id=${idProyecto}`

    newProject.href = newURL

}