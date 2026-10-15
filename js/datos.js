// Acceso a datos: carga de archivos JSON con fetch y persistencia en Web Storage

const RUTAS_DATOS = {
  equipos: "data/equipos.json",
  condiciones: "data/condiciones.json",
};

const CLAVES_STORAGE = {
  cotizacionActual: "medcotiza:cotizacion-actual",
  historial: "medcotiza:historial",
  borradorCliente: "medcotiza:borrador-cliente",
};

async function obtenerJson(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar "${ruta}" (error ${respuesta.status}).`);
  }
  return respuesta.json();
}

async function cargarDatosIniciales() {
  const [equipos, condiciones] = await Promise.all([
    obtenerJson(RUTAS_DATOS.equipos),
    obtenerJson(RUTAS_DATOS.condiciones),
  ]);
  return { equipos, condiciones };
}

function leerStorage(clave, valorPorDefecto, almacen = localStorage) {
  try {
    const contenido = almacen.getItem(clave);
    return contenido ? JSON.parse(contenido) : valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

function guardarStorage(clave, valor, almacen = localStorage) {
  almacen.setItem(clave, JSON.stringify(valor));
}

function borrarStorage(clave, almacen = localStorage) {
  almacen.removeItem(clave);
}

// Se borran solo las claves de la app para no afectar otros sitios del mismo dominio
function vaciarStorageApp() {
  borrarStorage(CLAVES_STORAGE.cotizacionActual);
  borrarStorage(CLAVES_STORAGE.historial);
  borrarStorage(CLAVES_STORAGE.borradorCliente, sessionStorage);
}
