// Lógica de negocio: estado de la app, operaciones sobre la cotización, cálculos e historial

const estadoApp = {
  equipos: [],
  condiciones: null,
  filtros: { texto: "", categoria: "todas", orden: "destacados" },
  cotizacion: { items: [], serviciosIds: [], formaPagoId: "" },
  historial: [],
};

const redondear = (importe) => Math.round(importe * 100) / 100;

const normalizarTexto = (texto) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const CRITERIOS_ORDEN = {
  destacados: (equipoA, equipoB) => Number(equipoB.destacado) - Number(equipoA.destacado),
  "precio-asc": (equipoA, equipoB) => equipoA.precio - equipoB.precio,
  "precio-desc": (equipoA, equipoB) => equipoB.precio - equipoA.precio,
  nombre: (equipoA, equipoB) => equipoA.nombre.localeCompare(equipoB.nombre, "es"),
};

const CALCULO_SERVICIOS = {
  porUnidad: (valor, unidades) => valor * unidades,
  fijo: (valor, unidades) => (unidades > 0 ? valor : 0),
  porcentaje: (valor, unidades, subtotalEquipos) => valor * subtotalEquipos,
};

/* ---------- Búsquedas ---------- */

function buscarEquipo(idEquipo) {
  return estadoApp.equipos.find(({ id }) => id === idEquipo);
}

function buscarItem(idEquipo) {
  return estadoApp.cotizacion.items.find(({ id }) => id === idEquipo);
}

function buscarEnHistorial(numeroCotizacion) {
  return estadoApp.historial.find(({ numero }) => numero === numeroCotizacion);
}

function existeFormaPago(idFormaPago) {
  return estadoApp.condiciones.formasPago.some(({ id }) => id === idFormaPago);
}

function obtenerCategorias() {
  return [...new Set(estadoApp.equipos.map(({ categoria }) => categoria))];
}

function obtenerEquiposFiltrados() {
  const { texto, categoria, orden } = estadoApp.filtros;
  const textoBuscado = normalizarTexto(texto);

  return estadoApp.equipos
    .filter((equipo) => categoria === "todas" || equipo.categoria === categoria)
    .filter(({ id, nombre, marca, categoria: categoriaEquipo }) =>
      normalizarTexto(`${id} ${nombre} ${marca} ${categoriaEquipo}`).includes(textoBuscado)
    )
    .sort(CRITERIOS_ORDEN[orden] || CRITERIOS_ORDEN.destacados);
}

/* ---------- Estado persistido ---------- */

function limitarCantidad(cantidad, stock) {
  const cantidadEntera = Math.trunc(Number(cantidad)) || 1;
  return Math.min(Math.max(cantidadEntera, 1), stock);
}

// Descarta equipos que ya no existen y ajusta cantidades al stock disponible
function depurarItems(items) {
  return items
    .filter(({ id }) => buscarEquipo(id))
    .map(({ id, cantidad }) => ({ id, cantidad: limitarCantidad(cantidad, buscarEquipo(id).stock) }));
}

function armarCotizacion({ items = [], serviciosIds = [], formaPagoId } = {}) {
  const { servicios, formasPago } = estadoApp.condiciones;
  return {
    items: depurarItems(items),
    serviciosIds: serviciosIds.filter((idServicio) => servicios.some(({ id }) => id === idServicio)),
    formaPagoId: existeFormaPago(formaPagoId) ? formaPagoId : formasPago[0].id,
  };
}

function cargarEstadoGuardado() {
  estadoApp.cotizacion = armarCotizacion(leerStorage(CLAVES_STORAGE.cotizacionActual, {}) || {});
  estadoApp.historial = leerStorage(CLAVES_STORAGE.historial, []);
  guardarCotizacionActual();
}

function guardarCotizacionActual() {
  guardarStorage(CLAVES_STORAGE.cotizacionActual, estadoApp.cotizacion);
}

function guardarHistorial() {
  guardarStorage(CLAVES_STORAGE.historial, estadoApp.historial);
}

/* ---------- Operaciones sobre la cotización ---------- */

function agregarEquipo(idEquipo) {
  const equipo = buscarEquipo(idEquipo);
  const itemExistente = buscarItem(idEquipo);
  const cantidadActual = itemExistente?.cantidad || 0;

  if (cantidadActual >= equipo.stock) {
    return { agregado: false, equipo };
  }

  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    estadoApp.cotizacion.items.push({ id: idEquipo, cantidad: 1 });
  }
  guardarCotizacionActual();
  return { agregado: true, equipo };
}

function actualizarCantidad(idEquipo, cantidadSolicitada) {
  const item = buscarItem(idEquipo);
  const { stock } = buscarEquipo(idEquipo);
  item.cantidad = limitarCantidad(cantidadSolicitada, stock);
  guardarCotizacionActual();
  return { cantidadFinal: item.cantidad, superaStock: Number(cantidadSolicitada) > stock, stock };
}

function quitarEquipo(idEquipo) {
  estadoApp.cotizacion.items = estadoApp.cotizacion.items.filter(({ id }) => id !== idEquipo);
  guardarCotizacionActual();
}

function vaciarCotizacionActual() {
  estadoApp.cotizacion = armarCotizacion();
  borrarStorage(CLAVES_STORAGE.cotizacionActual);
}

function alternarServicio(idServicio, activo) {
  const { serviciosIds } = estadoApp.cotizacion;
  estadoApp.cotizacion.serviciosIds = activo
    ? [...new Set([...serviciosIds, idServicio])]
    : serviciosIds.filter((id) => id !== idServicio);
  guardarCotizacionActual();
}

function seleccionarFormaPago(idFormaPago) {
  estadoApp.cotizacion.formaPagoId = idFormaPago;
  guardarCotizacionActual();
}

function contarUnidades() {
  return estadoApp.cotizacion.items.reduce((total, { cantidad }) => total + cantidad, 0);
}

/* ---------- Cálculos ---------- */

function obtenerTramoDescuento(unidades) {
  return [...estadoApp.condiciones.descuentosVolumen]
    .sort((tramoA, tramoB) => tramoB.minUnidades - tramoA.minUnidades)
    .find(({ minUnidades }) => unidades >= minUnidades);
}

function obtenerProximoDescuento(unidades) {
  const proximoTramo = [...estadoApp.condiciones.descuentosVolumen]
    .sort((tramoA, tramoB) => tramoA.minUnidades - tramoB.minUnidades)
    .find(({ minUnidades }) => unidades < minUnidades);
  return proximoTramo ? { ...proximoTramo, unidadesFaltantes: proximoTramo.minUnidades - unidades } : null;
}

function calcularResumen() {
  const { items, serviciosIds, formaPagoId } = estadoApp.cotizacion;
  const { alicuotaIva, servicios, formasPago } = estadoApp.condiciones;

  const lineas = items.map(({ id, cantidad }) => {
    const { nombre, marca, precio } = buscarEquipo(id);
    return { id, nombre, marca, cantidad, precioUnitario: precio, subtotal: precio * cantidad };
  });

  const unidades = lineas.reduce((total, { cantidad }) => total + cantidad, 0);
  const subtotalEquipos = lineas.reduce((total, { subtotal }) => total + subtotal, 0);

  const porcentajeDescuento = obtenerTramoDescuento(unidades)?.porcentaje || 0;
  const descuentoVolumen = redondear(subtotalEquipos * porcentajeDescuento);

  const serviciosAplicados = servicios
    .filter(({ id }) => serviciosIds.includes(id))
    .map(({ id, nombre, tipo, valor }) => ({
      id,
      nombre,
      importe: redondear(CALCULO_SERVICIOS[tipo](valor, unidades, subtotalEquipos)),
    }));
  const subtotalServicios = serviciosAplicados.reduce((total, { importe }) => total + importe, 0);

  const formaPago = formasPago.find(({ id }) => id === formaPagoId) || formasPago[0];
  const baseAntesDePago = subtotalEquipos - descuentoVolumen + subtotalServicios;
  const ajustePago = redondear(baseAntesDePago * formaPago.ajuste);
  const neto = redondear(baseAntesDePago + ajustePago);
  const iva = redondear(neto * alicuotaIva);
  const total = redondear(neto + iva);

  return {
    lineas,
    unidades,
    subtotalEquipos,
    porcentajeDescuento,
    descuentoVolumen,
    serviciosAplicados,
    subtotalServicios,
    formaPago,
    ajustePago,
    neto,
    alicuotaIva,
    iva,
    total,
    valorCuota: redondear(total / formaPago.cuotas),
  };
}

/* ---------- Historial ---------- */

function generarNumeroCotizacion() {
  const ultimoCorrelativo = estadoApp.historial.reduce(
    (maximo, { correlativo }) => Math.max(maximo, correlativo),
    0
  );
  const correlativo = ultimoCorrelativo + 1;
  const anio = new Date().getFullYear();
  return { correlativo, numero: `COT-${anio}-${String(correlativo).padStart(4, "0")}` };
}

function registrarCotizacion(cliente) {
  const { correlativo, numero } = generarNumeroCotizacion();
  const { serviciosIds, formaPagoId } = estadoApp.cotizacion;
  const fecha = new Date();
  const vencimiento = new Date(fecha);
  vencimiento.setDate(fecha.getDate() + estadoApp.condiciones.validezDias);

  const cotizacionRegistrada = {
    numero,
    correlativo,
    fecha: fecha.toISOString(),
    vencimiento: vencimiento.toISOString(),
    cliente,
    serviciosIds: [...serviciosIds],
    formaPagoId,
    resumen: calcularResumen(),
  };

  estadoApp.historial.unshift(cotizacionRegistrada);
  guardarHistorial();
  vaciarCotizacionActual();
  return cotizacionRegistrada;
}

function eliminarDelHistorial(numeroCotizacion) {
  estadoApp.historial = estadoApp.historial.filter(({ numero }) => numero !== numeroCotizacion);
  guardarHistorial();
}

function vaciarHistorial() {
  estadoApp.historial = [];
  borrarStorage(CLAVES_STORAGE.historial);
}

// Carga una cotización guardada como borrador editable (respeta stock actual)
function cargarDesdeHistorial(numeroCotizacion) {
  const { resumen, serviciosIds, formaPagoId, cliente } = buscarEnHistorial(numeroCotizacion);
  const items = resumen.lineas.map(({ id, cantidad }) => ({ id, cantidad }));
  estadoApp.cotizacion = armarCotizacion({ items, serviciosIds, formaPagoId });
  guardarCotizacionActual();
  return { cliente, equiposOmitidos: items.length - estadoApp.cotizacion.items.length };
}
