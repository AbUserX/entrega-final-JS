// Interfaz: renderizado del DOM, eventos de usuario y arranque de la aplicación

const elementos = {
  buscador: document.getElementById("buscador"),
  filtroCategoria: document.getElementById("filtro-categoria"),
  ordenCatalogo: document.getElementById("orden-catalogo"),
  contadorResultados: document.getElementById("contador-resultados"),
  estadoCatalogo: document.getElementById("estado-catalogo"),
  grillaCatalogo: document.getElementById("grilla-catalogo"),
  insigniaUnidades: document.getElementById("insignia-unidades"),
  cotizacionVacia: document.getElementById("cotizacion-vacia"),
  listaItems: document.getElementById("lista-items"),
  listaServicios: document.getElementById("lista-servicios"),
  listaFormasPago: document.getElementById("lista-formas-pago"),
  resumen: document.getElementById("resumen"),
  sugerenciaDescuento: document.getElementById("sugerencia-descuento"),
  totalCotizacion: document.getElementById("total-cotizacion"),
  detalleCuotas: document.getElementById("detalle-cuotas"),
  formularioCliente: document.getElementById("formulario-cliente"),
  botonVaciar: document.getElementById("boton-vaciar"),
  botonConfirmar: document.getElementById("boton-confirmar"),
  listaHistorial: document.getElementById("lista-historial"),
  historialVacio: document.getElementById("historial-vacio"),
  botonVaciarHistorial: document.getElementById("boton-vaciar-historial"),
  botonRestablecer: document.getElementById("boton-restablecer"),
};

const CAMPOS_CLIENTE = ["institucion", "tipoInstitucion", "responsable", "email", "telefono"];

const COLORES = { primario: "#0e7c74", peligro: "#c2410c", neutro: "#64748b" };

const formatoMoneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" });

/* ---------- Utilidades de presentación ---------- */

const formatearMoneda = (importe) => formatoMoneda.format(importe);

const formatearPorcentaje = (proporcion) =>
  `${(proporcion * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`;

const formatearFecha = (fechaIso) =>
  new Date(fechaIso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const pluralizar = (cantidad, singular, plural) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

function escaparHtml(texto = "") {
  const contenedorTemporal = document.createElement("div");
  contenedorTemporal.textContent = texto;
  return contenedorTemporal.innerHTML;
}

function notificar(mensaje, tipo = "exito") {
  const fondos = {
    exito: "linear-gradient(135deg, #0e7c74, #12968c)",
    aviso: "linear-gradient(135deg, #b45309, #d97706)",
    error: "linear-gradient(135deg, #b91c1c, #dc2626)",
  };
  Toastify({
    text: mensaje,
    duration: 2800,
    gravity: "bottom",
    position: "right",
    stopOnFocus: true,
    style: { background: fondos[tipo] || fondos.exito, borderRadius: "10px" },
  }).showToast();
}

function pedirConfirmacion({ titulo, texto, textoConfirmar, peligroso = false }) {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: peligroso ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: "Cancelar",
    confirmButtonColor: peligroso ? COLORES.peligro : COLORES.primario,
    cancelButtonColor: COLORES.neutro,
    reverseButtons: true,
  });
}

function describirServicio({ tipo, valor }) {
  const descripciones = {
    porUnidad: `${formatearMoneda(valor)} por equipo`,
    fijo: `${formatearMoneda(valor)} · costo único`,
    porcentaje: `${formatearPorcentaje(valor)} del valor de los equipos`,
  };
  return descripciones[tipo] || "";
}

function describirFormaPago({ ajuste }) {
  if (ajuste === 0) return "Sin interés";
  return ajuste < 0
    ? `${formatearPorcentaje(Math.abs(ajuste))} de descuento`
    : `${formatearPorcentaje(ajuste)} de recargo`;
}

function obtenerFilasResumen(resumen) {
  const { subtotalEquipos, porcentajeDescuento, descuentoVolumen, serviciosAplicados, formaPago, ajustePago, alicuotaIva, iva } = resumen;
  const filas = [{ etiqueta: "Equipos", valor: subtotalEquipos }];

  if (descuentoVolumen > 0) {
    filas.push({
      etiqueta: `Descuento por volumen (${formatearPorcentaje(porcentajeDescuento)})`,
      valor: -descuentoVolumen,
      clase: "resumen__fila--ahorro",
    });
  }
  serviciosAplicados.forEach(({ nombre, importe }) => filas.push({ etiqueta: nombre, valor: importe }));
  if (ajustePago !== 0) {
    filas.push({
      etiqueta: ajustePago < 0 ? "Bonificación pago contado" : `Recargo financiación (${formaPago.nombre})`,
      valor: ajustePago,
      clase: ajustePago < 0 ? "resumen__fila--ahorro" : "",
    });
  }
  filas.push({ etiqueta: `IVA (${formatearPorcentaje(alicuotaIva)})`, valor: iva });
  return filas;
}

function crearHtmlFilasResumen(resumen) {
  return obtenerFilasResumen(resumen)
    .map(
      ({ etiqueta, valor, clase = "" }) =>
        `<div class="resumen__fila ${clase}"><dt>${etiqueta}</dt><dd>${formatearMoneda(valor)}</dd></div>`
    )
    .join("");
}

function crearHtmlDetalle(resumen, cliente) {
  const { lineas, formaPago, total, valorCuota } = resumen;
  const { institucion, tipoInstitucion, responsable, email, telefono } = cliente;
  const filasEquipos = lineas
    .map(
      ({ nombre, cantidad, precioUnitario, subtotal }) => `
        <tr>
          <td>${nombre}<small>${formatearMoneda(precioUnitario)} c/u</small></td>
          <td class="detalle__numero">${cantidad}</td>
          <td class="detalle__numero">${formatearMoneda(subtotal)}</td>
        </tr>`
    )
    .join("");

  return `
    <div class="detalle">
      <p class="detalle__cliente">
        <strong>${escaparHtml(institucion)}</strong> · ${escaparHtml(tipoInstitucion)}<br>
        ${escaparHtml(responsable)} · ${escaparHtml(email)}${telefono ? ` · ${escaparHtml(telefono)}` : ""}
      </p>
      <table class="detalle__tabla">
        <thead><tr><th>Equipo</th><th>Cant.</th><th>Subtotal</th></tr></thead>
        <tbody>${filasEquipos}</tbody>
      </table>
      <dl class="resumen">${crearHtmlFilasResumen(resumen)}</dl>
      <div class="total total--detalle"><span>Total</span><strong>${formatearMoneda(total)}</strong></div>
      <p class="texto-suave">Forma de pago: ${formaPago.cuotas > 1 ? `${formaPago.cuotas} cuotas de ${formatearMoneda(valorCuota)}` : formaPago.nombre}</p>
    </div>`;
}

/* ---------- Catálogo ---------- */

function crearTarjetaEquipo(equipo) {
  const { id, nombre, marca, categoria, descripcion, precio, stock, garantiaMeses, imagen } = equipo;
  const cantidadEnCotizacion = buscarItem(id)?.cantidad || 0;
  const sinStockDisponible = cantidadEnCotizacion >= stock;

  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta-equipo";
  tarjeta.innerHTML = `
    <div class="tarjeta-equipo__imagen">
      <img src="${imagen}" alt="" loading="lazy" width="64" height="64">
      ${cantidadEnCotizacion ? `<span class="tarjeta-equipo__en-cotizacion">${cantidadEnCotizacion} en cotización</span>` : ""}
    </div>
    <div class="tarjeta-equipo__cuerpo">
      <p class="tarjeta-equipo__meta"><span class="etiqueta">${categoria}</span><span>${id}</span></p>
      <h3>${nombre}</h3>
      <p class="tarjeta-equipo__marca">${marca}</p>
      <p class="tarjeta-equipo__descripcion">${descripcion}</p>
      <ul class="tarjeta-equipo__datos">
        <li>Garantía ${garantiaMeses} meses</li>
        <li class="${stock <= 3 ? "dato--aviso" : ""}">${stock <= 3 ? `Últimas ${stock} unidades` : `Stock: ${stock}`}</li>
      </ul>
    </div>
    <div class="tarjeta-equipo__pie">
      <p class="tarjeta-equipo__precio">${formatearMoneda(precio)}<small>+ IVA</small></p>
      <button type="button" class="boton boton--primario" data-accion="agregar" data-id="${id}" ${sinStockDisponible ? "disabled" : ""}>
        ${sinStockDisponible ? "Sin stock" : "Agregar"}
      </button>
    </div>`;
  return tarjeta;
}

function renderizarCatalogo() {
  const equiposVisibles = obtenerEquiposFiltrados();
  elementos.contadorResultados.textContent = pluralizar(equiposVisibles.length, "equipo", "equipos");
  elementos.grillaCatalogo.innerHTML = "";

  if (!equiposVisibles.length) {
    elementos.estadoCatalogo.innerHTML = `<p class="estado-catalogo__mensaje">No hay equipos que coincidan con la búsqueda.</p>`;
    return;
  }
  elementos.estadoCatalogo.innerHTML = "";
  equiposVisibles.forEach((equipo) => elementos.grillaCatalogo.append(crearTarjetaEquipo(equipo)));
}

function renderizarFiltros() {
  elementos.filtroCategoria.innerHTML = '<option value="todas">Todas</option>';
  obtenerCategorias().forEach((categoria) => {
    elementos.filtroCategoria.append(new Option(categoria, categoria));
  });
}

/* ---------- Panel de cotización ---------- */

function crearFilaItem({ id, nombre, marca, cantidad, precioUnitario, subtotal }) {
  const { stock } = buscarEquipo(id);
  const fila = document.createElement("li");
  fila.className = "item";
  fila.dataset.id = id;
  fila.innerHTML = `
    <div class="item__info">
      <p class="item__nombre">${nombre}</p>
      <p class="texto-suave">${marca} · ${formatearMoneda(precioUnitario)} c/u</p>
    </div>
    <div class="item__controles">
      <div class="cantidad">
        <button type="button" data-accion="restar" aria-label="Restar una unidad de ${nombre}" ${cantidad <= 1 ? "disabled" : ""}>−</button>
        <input type="number" min="1" max="${stock}" value="${cantidad}" aria-label="Cantidad de ${nombre}" data-accion="cantidad">
        <button type="button" data-accion="sumar" aria-label="Sumar una unidad de ${nombre}" ${cantidad >= stock ? "disabled" : ""}>+</button>
      </div>
      <p class="item__subtotal">${formatearMoneda(subtotal)}</p>
      <button type="button" class="item__quitar" data-accion="quitar" aria-label="Quitar ${nombre}">✕</button>
    </div>`;
  return fila;
}

function renderizarOpcionesCotizacion() {
  const { servicios, formasPago } = estadoApp.condiciones;

  elementos.listaServicios.innerHTML = servicios
    .map(
      (servicio) => `
      <label class="opcion">
        <input type="checkbox" name="servicio" value="${servicio.id}">
        <span class="opcion__texto"><strong>${servicio.nombre}</strong><small>${describirServicio(servicio)}</small></span>
      </label>`
    )
    .join("");

  elementos.listaFormasPago.innerHTML = formasPago
    .map(
      (formaPago) => `
      <label class="opcion">
        <input type="radio" name="formaPago" value="${formaPago.id}">
        <span class="opcion__texto"><strong>${formaPago.nombre}</strong><small>${describirFormaPago(formaPago)}</small></span>
      </label>`
    )
    .join("");
}

function sincronizarOpcionesCotizacion() {
  const { serviciosIds, formaPagoId } = estadoApp.cotizacion;
  elementos.listaServicios.querySelectorAll("input").forEach((casilla) => {
    casilla.checked = serviciosIds.includes(casilla.value);
  });
  elementos.listaFormasPago.querySelectorAll("input").forEach((opcion) => {
    opcion.checked = opcion.value === formaPagoId;
  });
}

function renderizarCotizacion() {
  const resumen = calcularResumen();
  const { lineas, unidades, total, formaPago, valorCuota } = resumen;
  const hayItems = lineas.length > 0;

  elementos.cotizacionVacia.hidden = hayItems;
  elementos.listaItems.innerHTML = "";
  lineas.forEach((linea) => elementos.listaItems.append(crearFilaItem(linea)));

  elementos.resumen.innerHTML = hayItems ? crearHtmlFilasResumen(resumen) : "";
  elementos.totalCotizacion.textContent = formatearMoneda(total);
  elementos.detalleCuotas.textContent =
    hayItems && formaPago.cuotas > 1 ? `${formaPago.cuotas} cuotas de ${formatearMoneda(valorCuota)}` : "";

  const proximoDescuento = hayItems ? obtenerProximoDescuento(unidades) : null;
  elementos.sugerenciaDescuento.hidden = !proximoDescuento;
  if (proximoDescuento) {
    const { unidadesFaltantes, porcentaje } = proximoDescuento;
    elementos.sugerenciaDescuento.textContent = `Sumá ${pluralizar(unidadesFaltantes, "unidad", "unidades")} más y obtené ${formatearPorcentaje(porcentaje)} de descuento por volumen.`;
  }

  elementos.insigniaUnidades.textContent = unidades;
  elementos.botonVaciar.disabled = !hayItems;
  elementos.botonConfirmar.disabled = !hayItems;
  sincronizarOpcionesCotizacion();
}

/* ---------- Historial ---------- */

function crearTarjetaHistorial(cotizacionGuardada) {
  const {
    numero,
    fecha,
    cliente: { institucion },
    resumen: { unidades, total, formaPago },
  } = cotizacionGuardada;

  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta-historial";
  tarjeta.dataset.numero = numero;
  tarjeta.innerHTML = `
    <div class="tarjeta-historial__cabecera">
      <span class="tarjeta-historial__numero">${numero}</span>
      <time datetime="${fecha}">${formatearFecha(fecha)}</time>
    </div>
    <h3 class="tarjeta-historial__cliente">${escaparHtml(institucion)}</h3>
    <p class="texto-suave">${pluralizar(unidades, "unidad", "unidades")} · ${formaPago.nombre}</p>
    <p class="tarjeta-historial__total">${formatearMoneda(total)}</p>
    <div class="tarjeta-historial__acciones">
      <button type="button" class="boton boton--secundario" data-accion="ver">Ver detalle</button>
      <button type="button" class="boton boton--secundario" data-accion="editar">Editar como nueva</button>
      <button type="button" class="boton boton--texto boton--peligro" data-accion="eliminar">Eliminar</button>
    </div>`;
  return tarjeta;
}

function renderizarHistorial() {
  const { historial } = estadoApp;
  elementos.listaHistorial.innerHTML = "";
  elementos.historialVacio.hidden = historial.length > 0;
  elementos.botonVaciarHistorial.disabled = historial.length === 0;
  historial.forEach((cotizacionGuardada) =>
    elementos.listaHistorial.append(crearTarjetaHistorial(cotizacionGuardada))
  );
}

function renderizarTodo() {
  renderizarCatalogo();
  renderizarCotizacion();
  renderizarHistorial();
}

/* ---------- Formulario del cliente ---------- */

function leerFormularioCliente() {
  const datosFormulario = new FormData(elementos.formularioCliente);
  return CAMPOS_CLIENTE.reduce((cliente, campo) => {
    cliente[campo] = String(datosFormulario.get(campo) || "").trim();
    return cliente;
  }, {});
}

function completarFormularioCliente(cliente = {}) {
  CAMPOS_CLIENTE.forEach((campo) => {
    elementos.formularioCliente.elements[campo].value = cliente[campo] || "";
  });
}

function validarCliente({ institucion, tipoInstitucion, responsable, email, telefono }) {
  const errores = {};
  const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const digitosTelefono = telefono.replace(/[\s()+-]/g, "");

  if (institucion.length < 3) errores.institucion = "Ingresá el nombre de la institución.";
  if (!tipoInstitucion) errores.tipoInstitucion = "Seleccioná el tipo de institución.";
  if (responsable.length < 3) errores.responsable = "Ingresá nombre y apellido.";
  if (!patronEmail.test(email)) errores.email = "Ingresá un email válido.";
  if (telefono && !/^\d{8,15}$/.test(digitosTelefono)) errores.telefono = "El teléfono debe tener entre 8 y 15 dígitos.";
  return errores;
}

function mostrarErrores(errores) {
  CAMPOS_CLIENTE.forEach((campo) => {
    const mensaje = errores[campo] || "";
    const control = elementos.formularioCliente.elements[campo];
    document.getElementById(`error-${campo}`).textContent = mensaje;
    control.setAttribute("aria-invalid", mensaje ? "true" : "false");
  });
}

function guardarBorradorCliente() {
  guardarStorage(CLAVES_STORAGE.borradorCliente, leerFormularioCliente(), sessionStorage);
}

function limpiarFormularioCliente() {
  elementos.formularioCliente.reset();
  mostrarErrores({});
  borrarStorage(CLAVES_STORAGE.borradorCliente, sessionStorage);
}

/* ---------- Acciones del usuario ---------- */

function manejarAgregar(idEquipo) {
  const { agregado, equipo } = agregarEquipo(idEquipo);
  if (agregado) {
    notificar(`${equipo.nombre} agregado a la cotización`);
  } else {
    notificar(`Alcanzaste el stock disponible de ${equipo.nombre} (${equipo.stock})`, "aviso");
  }
  renderizarCatalogo();
  renderizarCotizacion();
}

function manejarCambioCantidad(idEquipo, cantidadSolicitada) {
  const { superaStock, stock } = actualizarCantidad(idEquipo, cantidadSolicitada);
  if (superaStock) notificar(`Solo hay ${stock} unidades disponibles`, "aviso");
  renderizarCatalogo();
  renderizarCotizacion();
}

function manejarQuitar(idEquipo) {
  const { nombre } = buscarEquipo(idEquipo);
  quitarEquipo(idEquipo);
  renderizarCatalogo();
  renderizarCotizacion();
  notificar(`${nombre} quitado de la cotización`, "aviso");
}

async function manejarVaciarCotizacion() {
  const { isConfirmed } = await pedirConfirmacion({
    titulo: "¿Vaciar la cotización?",
    texto: "Se quitarán todos los equipos, servicios y la forma de pago elegida.",
    textoConfirmar: "Sí, vaciar",
    peligroso: true,
  });
  if (!isConfirmed) return;
  vaciarCotizacionActual();
  renderizarCatalogo();
  renderizarCotizacion();
  notificar("Cotización vaciada", "aviso");
}

async function manejarConfirmacion(evento) {
  evento.preventDefault();
  if (!estadoApp.cotizacion.items.length) {
    notificar("Agregá al menos un equipo antes de confirmar", "aviso");
    return;
  }

  const cliente = leerFormularioCliente();
  const errores = validarCliente(cliente);
  mostrarErrores(errores);
  const [primerCampoConError] = Object.keys(errores);
  if (primerCampoConError) {
    elementos.formularioCliente.elements[primerCampoConError].focus();
    notificar("Revisá los datos de la institución", "error");
    return;
  }

  const { isConfirmed } = await Swal.fire({
    title: "Revisá tu cotización",
    html: crearHtmlDetalle(calcularResumen(), cliente),
    width: 640,
    showCancelButton: true,
    confirmButtonText: "Confirmar cotización",
    cancelButtonText: "Seguir editando",
    confirmButtonColor: COLORES.primario,
    cancelButtonColor: COLORES.neutro,
    reverseButtons: true,
  });
  if (!isConfirmed) return;

  const { numero, vencimiento } = registrarCotizacion(cliente);
  limpiarFormularioCliente();
  renderizarTodo();

  await Swal.fire({
    icon: "success",
    title: "¡Cotización generada!",
    html: `Número <strong>${numero}</strong><br>Válida hasta el ${new Date(vencimiento).toLocaleDateString("es-AR")}. La encontrás en el historial.`,
    confirmButtonText: "Ver historial",
    confirmButtonColor: COLORES.primario,
  });
  document.getElementById("historial").scrollIntoView({ behavior: "smooth" });
}

function manejarVerDetalle(numero) {
  const { cliente, resumen, fecha, vencimiento } = buscarEnHistorial(numero);
  Swal.fire({
    title: numero,
    html: `<p class="texto-suave">Emitida el ${formatearFecha(fecha)} · válida hasta el ${new Date(vencimiento).toLocaleDateString("es-AR")}</p>${crearHtmlDetalle(resumen, cliente)}`,
    width: 640,
    confirmButtonText: "Cerrar",
    confirmButtonColor: COLORES.primario,
  });
}

async function manejarEditarDesdeHistorial(numero) {
  if (estadoApp.cotizacion.items.length) {
    const { isConfirmed } = await pedirConfirmacion({
      titulo: "¿Reemplazar la cotización en curso?",
      texto: `Los equipos actuales se reemplazarán por los de ${numero}.`,
      textoConfirmar: "Reemplazar",
    });
    if (!isConfirmed) return;
  }

  const { cliente, equiposOmitidos } = cargarDesdeHistorial(numero);
  completarFormularioCliente(cliente);
  guardarBorradorCliente();
  mostrarErrores({});
  renderizarCatalogo();
  renderizarCotizacion();
  document.getElementById("cotizacion").scrollIntoView({ behavior: "smooth" });
  notificar(
    equiposOmitidos ? `${numero} cargada; ${equiposOmitidos} equipo(s) ya no están disponibles` : `${numero} cargada para editar`,
    equiposOmitidos ? "aviso" : "exito"
  );
}

async function manejarEliminarDelHistorial(numero) {
  const { isConfirmed } = await pedirConfirmacion({
    titulo: `¿Eliminar ${numero}?`,
    texto: "Esta acción no se puede deshacer.",
    textoConfirmar: "Eliminar",
    peligroso: true,
  });
  if (!isConfirmed) return;
  eliminarDelHistorial(numero);
  renderizarHistorial();
  notificar(`${numero} eliminada del historial`, "aviso");
}

async function manejarVaciarHistorial() {
  const { isConfirmed } = await pedirConfirmacion({
    titulo: "¿Vaciar el historial?",
    texto: `Se eliminarán ${pluralizar(estadoApp.historial.length, "cotización guardada", "cotizaciones guardadas")}.`,
    textoConfirmar: "Vaciar historial",
    peligroso: true,
  });
  if (!isConfirmed) return;
  vaciarHistorial();
  renderizarHistorial();
  notificar("Historial vaciado", "aviso");
}

async function manejarRestablecer() {
  const { isConfirmed } = await pedirConfirmacion({
    titulo: "¿Restablecer todos los datos?",
    texto: "Se borrarán la cotización en curso, el historial y los datos del formulario guardados en este navegador.",
    textoConfirmar: "Restablecer",
    peligroso: true,
  });
  if (!isConfirmed) return;
  vaciarStorageApp();
  limpiarFormularioCliente();
  if (estadoApp.condiciones) {
    cargarEstadoGuardado();
    renderizarTodo();
  }
  notificar("Datos restablecidos");
}

/* ---------- Eventos ---------- */

function registrarEventos() {
  elementos.buscador.addEventListener("input", ({ target }) => {
    estadoApp.filtros.texto = target.value;
    renderizarCatalogo();
  });
  elementos.filtroCategoria.addEventListener("change", ({ target }) => {
    estadoApp.filtros.categoria = target.value;
    renderizarCatalogo();
  });
  elementos.ordenCatalogo.addEventListener("change", ({ target }) => {
    estadoApp.filtros.orden = target.value;
    renderizarCatalogo();
  });

  elementos.grillaCatalogo.addEventListener("click", ({ target }) => {
    const boton = target.closest('[data-accion="agregar"]');
    if (boton) manejarAgregar(boton.dataset.id);
  });

  elementos.listaItems.addEventListener("click", ({ target }) => {
    const boton = target.closest("button[data-accion]");
    if (!boton) return;
    const { id } = boton.closest(".item").dataset;
    const { cantidad } = buscarItem(id);
    const acciones = {
      sumar: () => manejarCambioCantidad(id, cantidad + 1),
      restar: () => manejarCambioCantidad(id, cantidad - 1),
      quitar: () => manejarQuitar(id),
    };
    acciones[boton.dataset.accion]?.();
  });

  elementos.listaItems.addEventListener("change", ({ target }) => {
    if (target.dataset.accion !== "cantidad") return;
    manejarCambioCantidad(target.closest(".item").dataset.id, target.value);
  });

  elementos.listaServicios.addEventListener("change", ({ target: { value, checked } }) => {
    alternarServicio(value, checked);
    renderizarCotizacion();
  });

  elementos.listaFormasPago.addEventListener("change", ({ target: { value } }) => {
    seleccionarFormaPago(value);
    renderizarCotizacion();
  });

  elementos.formularioCliente.addEventListener("input", guardarBorradorCliente);
  elementos.formularioCliente.addEventListener("change", guardarBorradorCliente);
  elementos.formularioCliente.addEventListener("submit", manejarConfirmacion);
  elementos.botonVaciar.addEventListener("click", manejarVaciarCotizacion);

  elementos.listaHistorial.addEventListener("click", ({ target }) => {
    const boton = target.closest("button[data-accion]");
    if (!boton) return;
    const { numero } = boton.closest(".tarjeta-historial").dataset;
    const acciones = {
      ver: () => manejarVerDetalle(numero),
      editar: () => manejarEditarDesdeHistorial(numero),
      eliminar: () => manejarEliminarDelHistorial(numero),
    };
    acciones[boton.dataset.accion]?.();
  });

  elementos.botonVaciarHistorial.addEventListener("click", manejarVaciarHistorial);
  elementos.botonRestablecer.addEventListener("click", manejarRestablecer);
}

/* ---------- Arranque ---------- */

function mostrarCargando(cargando) {
  elementos.grillaCatalogo.setAttribute("aria-busy", String(cargando));
  if (cargando) {
    elementos.estadoCatalogo.innerHTML = `
      <div class="cargando"><span class="cargando__indicador"></span>Cargando catálogo…</div>`;
  }
}

function mostrarErrorCarga(mensaje) {
  elementos.grillaCatalogo.innerHTML = "";
  elementos.estadoCatalogo.innerHTML = `
    <div class="error-carga">
      <p><strong>No pudimos cargar el catálogo.</strong></p>
      <p class="texto-suave">${escaparHtml(mensaje)}</p>
      <p class="texto-suave">Si abriste el archivo directamente, usá un servidor local (por ejemplo, Live Server) o GitHub Pages.</p>
      <button type="button" class="boton boton--primario" id="boton-reintentar">Reintentar</button>
    </div>`;
  document.getElementById("boton-reintentar").addEventListener("click", iniciarAplicacion);
}

function habilitarControles(habilitados) {
  [elementos.buscador, elementos.filtroCategoria, elementos.ordenCatalogo].forEach((control) => {
    control.disabled = !habilitados;
  });
}

async function iniciarAplicacion() {
  mostrarCargando(true);
  try {
    const { equipos, condiciones } = await cargarDatosIniciales();
    estadoApp.equipos = equipos;
    estadoApp.condiciones = condiciones;

    cargarEstadoGuardado();
    renderizarFiltros();
    renderizarOpcionesCotizacion();
    completarFormularioCliente(leerStorage(CLAVES_STORAGE.borradorCliente, {}, sessionStorage));
    renderizarTodo();
    habilitarControles(true);
  } catch (error) {
    habilitarControles(false);
    mostrarErrorCarga(error.message);
    notificar("Error al cargar los datos del cotizador", "error");
  } finally {
    mostrarCargando(false);
  }
}

registrarEventos();
iniciarAplicacion();
