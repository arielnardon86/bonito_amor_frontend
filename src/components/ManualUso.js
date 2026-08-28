// BONITO_AMOR/frontend/src/components/ManualUso.js
import React from 'react';

const ManualUso = () => {
    return (
        <div className="manual-uso">
            <div className="mu-doc">

                <header className="mu-masthead">
                    <img src="/logo-completo.png" alt="Total Stock" className="mu-logo" />
                    <h1 className="mu-title">Manual de uso</h1>
                    <p className="mu-subtitle">Guía completa de todas las secciones del sistema — qué hace cada una, qué problema resuelve y cómo usarla.</p>

                    <div className="mu-role-legend">
                        <span><b>Staff</b> — Punto de Venta, Ventas, Clientes, Presupuesto</span>
                        <span><b>Supervisor</b> — + Productos, Egresos, Compras/Stock</span>
                        <span><b>Administrador</b> — acceso total, incluye Métricas y el Panel de Administración</span>
                    </div>

                    <nav className="mu-toc">
                        <div className="mu-toc-label">En este manual</div>
                        <ol>
                            <li><a href="#mu-s1"><span className="n">01</span> Punto de Venta</a></li>
                            <li><a href="#mu-s2"><span className="n">02</span> Listado de Ventas</a></li>
                            <li><a href="#mu-s3"><span className="n">03</span> Clientes</a></li>
                            <li><a href="#mu-s4"><span className="n">04</span> Presupuesto</a></li>
                            <li><a href="#mu-s5"><span className="n">05</span> Gestión de Productos</a></li>
                            <li><a href="#mu-s6"><span className="n">06</span> Registro de Egresos</a></li>
                            <li><a href="#mu-s7"><span className="n">07</span> Compras / Stock</a></li>
                            <li><a href="#mu-s8"><span className="n">08</span> Métricas de Ventas</a></li>
                            <li><a href="#mu-s9"><span className="n">09</span> Panel de Administración</a></li>
                            <li><a href="#mu-planes"><span className="n">·</span> Planes y precios</a></li>
                        </ol>
                    </nav>
                    <div className="mu-masthead-rule" />
                </header>

                {/* ============ 1. PUNTO DE VENTA ============ */}
                <section className="mu-chapter" id="mu-s1">
                    <div className="mu-eyebrow"><span className="mu-num">01</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Punto de Venta</h2>
                    <p className="mu-what">La pantalla donde se registra una venta: buscar productos, armar el carrito, cobrar y entregar el comprobante. Es el corazón del sistema, el que más se usa día a día.</p>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Buscar productos</strong> por nombre, código de barras o Código Interno, escaneando o tipeando. Con lector de código de barras, el producto se agrega solo al carrito.</li>
                            <li><strong>Atender varios clientes a la vez</strong>, con pestañas de carrito: podés dejar uno a medias y atender a otro cliente sin perder nada.</li>
                            <li><strong>Editar el carrito</strong>: sumar o restar cantidades, o sacar un producto.</li>
                            <li><strong>Elegir cómo cobra</strong>: efectivo, transferencia, QR, tarjeta (con su plan de cuotas), o <strong>combinar dos o más métodos</strong> en la misma venta.</li>
                            <li><strong>Vender a Cuenta Corriente</strong> ("fiado"): requiere elegir un cliente ya cargado, y podés poner una fecha límite de pago.</li>
                            <li><strong>Asociar cualquier venta a un cliente</strong>, para que le quede en su historial.</li>
                            <li><strong>Aplicar descuento o recargo</strong>, en pesos o porcentaje.</li>
                            <li><strong>Redondear el total</strong> hacia arriba o abajo.</li>
                            <li><strong>Emitir factura electrónica o recibo</strong> al cerrar la venta.</li>
                            <li><strong>Abrir y cerrar tu caja</strong> al empezar y terminar el turno (si tenés el permiso): anotás el efectivo inicial, registrás gastos/retiros/ingresos durante el turno, y al cerrar contás el efectivo real — el sistema te dice si coincide con lo esperado.</li>
                        </ul>

                        <h3>Por qué existe cada cosa</h3>
                        <p>El <strong>pago combinado</strong> existe porque en el mostrador es habitual que un cliente pague parte en efectivo y parte con tarjeta — sin esta opción se perdería el registro real de cómo se cobró. <strong>Elegir el plan de cuotas</strong> permite calcular cuánto te cobra el banco por esa venta, para que tu ganancia real en Métricas sea correcta. La <strong>Cuenta Corriente exige un cliente</strong> porque una venta fiada necesita saber a quién cobrarle después. El <strong>cierre de caja</strong> permite controlar, turno a turno, si el efectivo del cajón coincide con lo que el sistema espera.</p>

                        <h3>Cómo se usa</h3>
                        <ol className="mu-steps">
                            <li>Si tenés caja habilitada, "Abrir Caja" y cargá el efectivo inicial.</li>
                            <li>Escaneá o buscá cada producto y agregalo al carrito.</li>
                            <li>Elegí el método de pago (si es Cuenta Corriente, seleccioná el cliente).</li>
                            <li>Cargá descuento/recargo o redondeo si corresponde.</li>
                            <li>"Procesar venta" y confirmá.</li>
                            <li>Elegí factura o solo recibo.</li>
                            <li>Al terminar el turno, "Cerrar Caja" y contá el efectivo.</li>
                        </ol>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill staff">Staff</span>
                                <span className="mu-pill supervisor">Supervisor</span>
                                <span className="mu-pill admin">Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <span className="mu-pill-none">Disponible en todos los planes</span>
                        </div>
                    </div>
                </section>

                {/* ============ 2. LISTADO DE VENTAS ============ */}
                <section className="mu-chapter" id="mu-s2">
                    <div className="mu-eyebrow"><span className="mu-num">02</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Listado de Ventas</h2>
                    <p className="mu-what">El historial completo de ventas: filtrarlas, ver el detalle de cada una, y actuar sobre una venta ya cerrada (anular, reimprimir, facturar, iniciar un cambio o devolución).</p>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Filtrar</strong> por fecha, franja horaria, vendedor, si está anulada, o buscar por número de venta / código de barras (podés escanear el ticket).</li>
                            <li><strong>Ver el detalle</strong> de productos, precios y descuentos de cada venta.</li>
                            <li><strong>Reimprimir el recibo</strong> de cualquier venta, en cualquier momento.</li>
                            <li><strong>Ver la factura electrónica</strong>, si la venta tiene una asociada.</li>
                            <li><strong>Anular una venta completa</strong> (devuelve el stock de todo lo vendido) o <strong>anular solo un producto</strong> dentro de una venta.</li>
                            <li><strong>Iniciar un Cambio o Devolución</strong> sobre una venta cerrada.</li>
                            <li><strong>Descargar el listado filtrado en Excel</strong>, con resumen y detalle.</li>
                        </ul>

                        <h3>Cómo funciona un cambio o devolución</h3>
                        <p>Si el producto nuevo <strong>vale menos</strong> que el devuelto, se genera una <strong>Nota de Crédito</strong> con saldo a favor del cliente (no se devuelve en efectivo, queda para una próxima compra). Si <strong>vale más</strong>, se genera una <strong>venta nueva por la diferencia</strong>, que el cliente paga en el momento — vas a verla marcada "Diferencia abonada" en el listado. Si el valor es igual, no se genera ningún comprobante extra. Anular la venta correspondiente revierte automáticamente todo lo relacionado.</p>

                        <div className="mu-callout">Staff solo puede buscar por número/código, ver el detalle, reimprimir e iniciar un cambio — no puede filtrar por fecha/vendedor, exportar a Excel ni anular nada. Esas acciones son de Supervisor y Administrador.</div>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill staff">Staff (limitado)</span>
                                <span className="mu-pill supervisor">Supervisor</span>
                                <span className="mu-pill admin">Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <span className="mu-pill-none">Disponible en todos los planes</span>
                        </div>
                    </div>
                </section>

                {/* ============ 3. CLIENTES ============ */}
                <section className="mu-chapter" id="mu-s3">
                    <div className="mu-eyebrow"><span className="mu-num">03</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Clientes</h2>
                    <p className="mu-what">La base de tus clientes, con su ficha, su historial de compras y el manejo de la Cuenta Corriente.</p>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Cargar un cliente</strong> con Nombre/Razón Social y CUIT/CUIL (obligatorios), teléfono, mail y dirección (opcionales).</li>
                            <li><strong>Buscar</strong> por nombre o CUIT/CUIL, y <strong>desactivar</strong> a quien ya no opera con vos (no se borra: conserva el historial).</li>
                            <li>Ver el <strong>saldo pendiente</strong> de cada uno (rojo si debe, verde si está al día) y si tiene una deuda <strong>vencida</strong>, con aviso general arriba del listado.</li>
                            <li>Dentro de la ficha: <strong>editar sus datos</strong> en el momento, <strong>cobrar su deuda</strong> (genera un recibo de cobro), y ver su historial de <strong>Consumos</strong> y de <strong>Cuenta Corriente</strong> (débitos y créditos).</li>
                        </ul>

                        <h3>Por qué existe cada cosa</h3>
                        <p>El <strong>CUIT/CUIL obligatorio</strong> permite encontrar al cliente rápido desde Punto de Venta y es el dato que va en la factura. El <strong>saldo nunca se edita a mano</strong>: se calcula solo de lo que compró a cuenta corriente menos lo que pagó, para que sea confiable. Cobrar una deuda <strong>no genera una venta nueva</strong> — esa venta ya se contabilizó el día que se entregó la mercadería.</p>

                        <h3>Cómo se usa</h3>
                        <ol className="mu-steps">
                            <li>Si el cliente no existe, "+ Nuevo Cliente" con nombre y CUIT/CUIL.</li>
                            <li>Buscalo y "Ver" para entrar a su ficha.</li>
                            <li>Si tiene saldo, "Cobrar deuda", cargá monto y método, y confirmá.</li>
                            <li>Revisá "Consumos" o "Movimientos" para reimprimir comprobantes.</li>
                        </ol>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill staff">Staff</span>
                                <span className="mu-pill supervisor">Supervisor</span>
                                <span className="mu-pill admin">Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <span className="mu-pill-none">Disponible en todos los planes</span>
                        </div>
                    </div>
                </section>

                {/* ============ 4. PRESUPUESTO ============ */}
                <section className="mu-chapter" id="mu-s4">
                    <div className="mu-eyebrow"><span className="mu-num">04</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Presupuesto</h2>
                    <p className="mu-what">Una cotización formal para un cliente que <b>no descuenta stock</b> hasta que efectivamente se convierta en una venta.</p>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Armar un presupuesto</strong>: cliente obligatorio, productos, y opcionalmente descuento/recargo, medio de pago sugerido, vigencia y notas.</li>
                            <li><strong>Ver/imprimir el PDF</strong> (con la leyenda de que no tiene validez fiscal) o <strong>enviarlo por mail</strong> al cliente.</li>
                            <li><strong>Buscar</strong> presupuestos por número, cliente o fecha, y <strong>editarlos</strong> mientras estén "Pendientes".</li>
                            <li><strong>Convertirlo en venta</strong>: "Generar carrito de venta" te lleva a Punto de Venta con todo precargado, listo para cobrar.</li>
                        </ul>

                        <h3>Por qué existe cada cosa</h3>
                        <p>No descuenta stock al crearse porque, si lo hiciera, se podría "reservar" mercadería que en realidad todavía no se vendió. El precio queda <strong>congelado</strong> tal cual se cotizó, aunque el producto cambie de precio después. "Generar carrito de venta" evita tener que recargar todo a mano cuando el cliente confirma.</p>

                        <h3>Cómo se usa</h3>
                        <ol className="mu-steps">
                            <li>"Nuevo presupuesto" → elegir cliente → agregar productos.</li>
                            <li>Opcional: descuento/recargo, medio sugerido, vigencia, notas.</li>
                            <li>"Generar Presupuesto".</li>
                            <li>"Ver/Imprimir PDF" o "Enviar por mail".</li>
                            <li>Cuando confirma la compra: "Generar carrito de venta" y cobrar en Punto de Venta.</li>
                        </ol>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill staff">Staff</span>
                                <span className="mu-pill supervisor">Supervisor</span>
                                <span className="mu-pill admin">Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <span className="mu-pill-none">Disponible en todos los planes</span>
                        </div>
                    </div>
                </section>

                {/* ============ 5. GESTIÓN DE PRODUCTOS ============ */}
                <section className="mu-chapter" id="mu-s5">
                    <div className="mu-eyebrow"><span className="mu-num">05</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Gestión de Productos</h2>
                    <p className="mu-what">Tu catálogo completo: todos los productos que vendés, con precio, costo, stock, código de barras y demás datos.</p>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Buscar</strong> por nombre, código de barras o <strong>Código Interno</strong> (el mismo que se usa en la carga masiva), y <strong>crear productos nuevos</strong> — si no tenés código de barras, el sistema te genera uno. El Código Interno de cada producto también se ve en su propia columna en el listado.</li>
                            <li><strong>Productos con variantes</strong> (mismo modelo en distintos talles, colores, u otro valor que uses en tu rubro), agrupados bajo un producto "padre", cada uno con su propio stock y código. Además del talle, cada variante admite un <strong>segundo valor opcional</strong> (por ejemplo color) para distinguir variantes que comparten el mismo talle.</li>
                            <li><strong>Editar, eliminar o sumar stock</strong> a un producto existente — desde el mismo formulario podés corregir su código de barras a mano si hace falta.</li>
                            <li><strong>Transferir stock entre tus tiendas</strong> si administrás más de un local — funciona también para varias variantes de una familia a la vez.</li>
                            <li><strong>Importar productos en lote desde Excel/CSV</strong>, con vista previa antes de confirmar y aviso de filas con error. Podés elegir si sumar stock a los existentes o solo actualizar precio/IVA/rubro sin tocarlo. Archivos de más de 5.000 filas hay que dividirlos.</li>
                            <li><strong>Descargar todo tu catálogo en Excel</strong> (mismo formato que la importación).</li>
                            <li><strong>Filtrar por rubro</strong> y ver productos con <strong>stock bajo</strong>.</li>
                            <li><strong>Imprimir etiquetas con código de barras</strong> — uno, varios, o "Todos" los de la página, en hoja A4 o impresora térmica.</li>
                            <li><strong>Mostrar en la etiqueta el precio con descuento por pago en efectivo</strong>, destacado en un recuadro debajo del precio de lista. Usa el % que configures en Panel de Administración, pero lo podés tildar/destildar y ajustar antes de cada impresión.</li>
                            <li><strong>Editar en masa por rubro</strong>: IVA o precio de todo un rubro de una vez.</li>
                            <li><strong>Vincular o publicar productos en Tienda Nube</strong> de forma manual y selectiva (solo si tu tienda tiene la integración conectada) — ver el detalle abajo.</li>
                        </ul>

                        <h3>Por qué existe cada cosa</h3>
                        <p>La <strong>importación por Excel</strong> evita cargar producto por producto al armar el catálogo. La opción de <strong>"no sumar stock" al reimportar</strong> permite corregir datos sin arriesgarse a duplicar cantidades. La <strong>transferencia entre tiendas</strong> es para negocios con más de una sucursal, que antes tenían que editar el stock a mano en las dos puntas.</p>

                        <div className="mu-callout warn">El Supervisor puede sumar stock a productos existentes, pero <b>no</b> puede cambiar precio, costo u otros datos, ni eliminar productos, ni transferir stock entre tiendas — esas acciones son solo del Administrador.</div>

                        <h3>Vincular o publicar en Tienda Nube (manual y selectivo)</h3>
                        <p>Si preferís armar la ficha del producto directamente en Tienda Nube (fotos, descripción, SEO) en vez de usar la publicación masiva, o si solo querés subir algunos productos puntuales y no todo el catálogo de una vez, tenés estas dos opciones — ambas aparecen <strong>solo si tu tienda tiene Tienda Nube conectado</strong> (Panel de Administración → Tienda Nube):</p>
                        <ul>
                            <li><strong>Vincular un producto ya creado en Tienda Nube:</strong> editá el producto en Total Stock, y en la sección "Tienda Nube" del formulario pegá el ID de ese producto (se ve en la URL cuando lo editás en el admin de Tienda Nube) y tocá "Vincular". Desde ese momento el stock se sincroniza solo.</li>
                            <li><strong>Publicar productos elegidos (crearlos en Tienda Nube):</strong> tildá el checkbox de uno o varios productos en el listado (el mismo que usás para "Imprimir Etiquetas") y tocá "Publicar seleccionados en Tienda Nube" — crea solo esos, sin tocar el resto del catálogo.</li>
                        </ul>
                        <div className="mu-callout">Si el producto de Tienda Nube tiene varios talles/colores y en Total Stock lo tenías cargado como un producto suelto (sin variantes), al vincularlo el sistema lo convierte automáticamente en una familia con una variante por cada una de Tienda Nube. El stock de las nuevas variantes arranca en <b>0</b> — hay que redistribuirlo a mano según lo que tengas físicamente de cada una, porque no hay forma de saber cómo se repartía el número que tenías antes.</div>
                        <div className="mu-callout">Si el producto local <b>ya tiene variantes cargadas</b> (por ejemplo, ya armaste vos la familia con sus talles), la vinculación se hace <b>variante por variante</b>: entrá a "Editar variante" en cada una y pegá siempre el <b>mismo ID de producto</b> de Tienda Nube — no cambia entre variantes, porque en Tienda Nube ese ID identifica a toda la familia, no a un talle puntual. Después de tocar "Vincular", Total Stock te muestra un desplegable para elegir qué talle de Tienda Nube le corresponde a esa variante — repetí este paso en cada variante local.</div>
                        <div className="mu-callout warn">Si tildás una sola variante de una familia (por ejemplo, solo el talle S) para publicarla, Tienda Nube <b>no permite crear una familia a medias</b>: el sistema va a publicar juntas todas las variantes pendientes de esa misma familia, no solo la que tildaste.</div>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill supervisor">Supervisor (limitado)</span>
                                <span className="mu-pill admin">Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill starter">Starter · 1.000 prod.</span>
                                <span className="mu-pill pro">Pro · 2.500 prod.</span>
                                <span className="mu-pill advanced">Advanced · ilimitado</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============ 6. REGISTRO DE EGRESOS ============ */}
                <section className="mu-chapter" id="mu-s6">
                    <div className="mu-eyebrow"><span className="mu-num">06</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Registro de Egresos</h2>
                    <p className="mu-what">La planilla de gastos del negocio que <b>no son</b> compra de mercadería para vender: alquiler, servicios, sueldos, impuestos.</p>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Registrar un egreso</strong>: fecha, monto, categoría (Alquiler, Servicios, Impuestos, Sueldos, Otros) y descripción.</li>
                            <li><strong>Editar o eliminar</strong> un egreso ya cargado.</li>
                            <li><strong>Filtrar</strong> por fecha (con atajo "Mes actual"), por categoría, o buscar por texto.</li>
                            <li>Ver un <strong>resumen</strong> del total gastado en el período, con desglose por categoría.</li>
                        </ul>
                        <p>Cada egreso queda con el nombre de quién lo cargó, y estos totales son los que se descuentan en Métricas de Ventas para calcular tu ganancia real.</p>

                        <h3>Cómo se usa</h3>
                        <ol className="mu-steps">
                            <li>"+ Nuevo egreso".</li>
                            <li>Elegí categoría, cargá fecha, monto y descripción.</li>
                            <li>Confirmá.</li>
                            <li>Usá los filtros para revisar un período puntual.</li>
                        </ol>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill supervisor">Supervisor</span>
                                <span className="mu-pill admin">Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <span className="mu-pill-none">Disponible en todos los planes</span>
                        </div>
                    </div>
                </section>

                {/* ============ 7. COMPRAS / STOCK ============ */}
                <section className="mu-chapter" id="mu-s7">
                    <div className="mu-eyebrow"><span className="mu-num">07</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Compras / Stock</h2>
                    <p className="mu-what">Control de presupuesto para lo que le comprás a tus proveedores.</p>

                    <div className="mu-callout warn">Esta pantalla solo lleva la cuenta del dinero gastado en mercadería — <b>no suma stock automáticamente</b> a tus productos. Para cargar el stock que llega, hacelo desde Gestión de Productos.</div>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Navegar mes a mes</strong> y ver el <strong>presupuesto sugerido</strong> (calculado según el costo de lo que vendiste ese mes), lo <strong>comprometido</strong> (compras cargadas) y el <strong>saldo disponible</strong> — si es negativo, te avisa que te excediste.</li>
                            <li><strong>Registrar una compra</strong>: fecha, proveedor, monto y nota.</li>
                            <li><strong>Marcar como "Recibida" o "Pendiente"</strong>, para hacer seguimiento de pedidos que todavía no llegaron.</li>
                            <li><strong>Editar o eliminar</strong> una compra.</li>
                        </ul>
                        <p>Te ayuda a no gastar de más reponiendo mercadería, comparando lo que vendiste contra lo que ya comprometiste en compras nuevas.</p>

                        <h3>Cómo se usa</h3>
                        <ol className="mu-steps">
                            <li>Revisá las tres tarjetas de arriba.</li>
                            <li>"+ Nueva compra" con fecha, proveedor, monto y nota.</li>
                            <li>Cuando llega, marcala "Recibida".</li>
                            <li>Cargá el stock correspondiente en Gestión de Productos.</li>
                        </ol>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill supervisor">Supervisor</span>
                                <span className="mu-pill admin">Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <span className="mu-pill-none">Disponible en todos los planes</span>
                        </div>
                    </div>
                </section>

                {/* ============ 8. MÉTRICAS DE VENTAS ============ */}
                <section className="mu-chapter" id="mu-s8">
                    <div className="mu-eyebrow"><span className="mu-num">08</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Métricas de Ventas</h2>
                    <p className="mu-what">El tablero de resultados: cuánto vendiste, cuánto gastaste y cuánto ganaste realmente, para el período que elijas.</p>

                    <div className="mu-body">
                        <h3>Qué podés hacer</h3>
                        <ul>
                            <li><strong>Navegar por mes</strong> o elegir un rango de fechas, y <strong>filtrar</strong> por vendedor o método de pago.</li>
                            <li>Ver <strong>Total de ventas</strong>, <strong>Total de egresos</strong> y <strong>Rentabilidad</strong> (ventas menos costo de mercadería, egresos y comisiones), comparados contra el mes anterior. Si la rentabilidad da negativa, te avisa.</li>
                            <li>Ver el <strong>detalle</strong>: costo de mercadería vendida, comisiones, margen en porcentaje con semáforo de color, y valor de tu stock actual a costo.</li>
                            <li><strong>Ranking de productos más vendidos</strong>, <strong>ranking por vendedor</strong>, <strong>ventas por método de pago</strong> y <strong>gráfico de egresos mes a mes</strong>.</li>
                            <li><strong>Descargar el reporte en Excel</strong>, con los filtros aplicados.</li>
                        </ul>
                        <p>Te evita armar planillas a mano para saber si el negocio da ganancia real: descuenta automáticamente costo de mercadería, gastos fijos y comisiones. Es el reporte que le podés llevar directo a tu contador.</p>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill admin">Solo Administrador</span>
                            </div>
                        </div>
                        <div className="mu-meta-block">
                            <span className="mu-label">Plan</span>
                            <span className="mu-pill-none">Disponible en todos los planes</span>
                        </div>
                    </div>
                </section>

                {/* ============ 9. PANEL DE ADMINISTRACIÓN ============ */}
                <section className="mu-chapter" id="mu-s9">
                    <div className="mu-eyebrow"><span className="mu-num">09</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Panel de Administración</h2>
                    <p className="mu-what">La sala de máquinas de tu tienda: usuarios, medios de pago, facturación electrónica, integraciones y tu plan de suscripción. Exclusivo del Administrador.</p>

                    <div className="mu-body">
                        <h3>Usuarios</h3>
                        <p>Editá el logo y nombre de tu tienda. Creá usuarios nuevos eligiendo sus permisos (Staff / Supervisor / Administrador / Habilitar cierre de caja), editalos, cambiales la contraseña o eliminalos. Si manejás más de una tienda, podés autorizar a un usuario a operar en varias con el mismo login.</p>

                        <h3>Descuento por pago en efectivo</h3>
                        <p>Cargá un % de descuento por pago en efectivo para tu tienda. Se usa en Imprimir Etiquetas para mostrar, además del precio de lista, el precio con ese descuento destacado en un recuadro ("Precio con descuento"). Opcionalmente podés tildar que ese precio se redondee a múltiplo de 100 (hacia arriba o hacia abajo), igual que el redondeo del total en Punto de Venta.</p>

                        <h3>Medios de pago y aranceles</h3>
                        <p>Configurá qué medios aceptás y el arancel (comisión %) de cada uno según el plan de cuotas — así el sistema calcula tu ganancia real.</p>

                        <h3>Habilitar facturador (Factura electrónica ARCA)</h3>
                        <p>Asistente guiado de 6 pasos: cargar CUIT y condición de IVA, generar clave y archivo para ARCA, cargar el certificado, configurar tu punto de venta, y probar con una factura de $1. <span className="mu-pill pro inline">Requiere Pro o Advanced</span></p>

                        <h3>Notas de Crédito</h3>
                        <p>Anulá o ajustá una factura ya emitida, buscándola por número. Disponible una vez que la facturación está operativa.</p>

                        <h3>Tienda Nube y Mercado Libre</h3>
                        <p>Conectá tu tienda online o tu cuenta de Mercado Libre, sincronizá productos y stock en ambos sentidos, y activá la facturación automática de esas ventas. <span className="mu-pill advanced inline">Requiere Advanced</span></p>

                        <h3>Mi Plan</h3>
                        <p>Vé tu plan actual, su estado y cuánto uso llevás de productos/usuarios. <strong>Mejorá tu plan</strong> en el momento (te redirige a Mercado Pago si hace falta pagar), o <strong>dá de baja</strong> tu suscripción — tus datos se conservan 30 días antes de eliminarse definitivamente.</p>

                        <h3>Historial</h3>
                        <p>Auditoría de acciones sensibles (ajustes de stock, anulaciones, cambios/devoluciones) con fecha, usuario y detalle.</p>
                    </div>

                    <div className="mu-meta">
                        <div className="mu-meta-block">
                            <span className="mu-label">Quién lo usa</span>
                            <div className="mu-pill-row">
                                <span className="mu-pill admin">Exclusivo Administrador</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============ PLANES ============ */}
                <section className="mu-chapter" id="mu-planes">
                    <div className="mu-eyebrow"><span className="mu-num">·</span><span className="line" /></div>
                    <h2 className="mu-chapter-title">Planes y precios</h2>
                    <p className="mu-what">Los tres planes disponibles, con 7 días de prueba gratis y sin permanencia mínima.</p>

                    <div className="mu-table-wrap">
                        <table className="mu-plan-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Starter — $35.000/mes</th>
                                    <th>Pro — $40.000/mes</th>
                                    <th>Advanced — $60.000/mes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Productos</td>
                                    <td>Hasta 1.000</td>
                                    <td>Hasta 2.500</td>
                                    <td>Ilimitados</td>
                                </tr>
                                <tr>
                                    <td>Usuarios</td>
                                    <td>Hasta 2</td>
                                    <td>Hasta 4</td>
                                    <td>Ilimitados</td>
                                </tr>
                                <tr>
                                    <td>Punto de venta y stock</td>
                                    <td className="center yes">✓</td>
                                    <td className="center yes">✓</td>
                                    <td className="center yes">✓</td>
                                </tr>
                                <tr>
                                    <td>Factura electrónica (ARCA)</td>
                                    <td className="center no">—</td>
                                    <td className="center yes">✓</td>
                                    <td className="center yes">✓</td>
                                </tr>
                                <tr>
                                    <td>Mercado Libre / Tienda Nube</td>
                                    <td className="center no">—</td>
                                    <td className="center no">—</td>
                                    <td className="center yes">✓</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mu-callout">Si un pago no se acredita a tiempo, tenés <b>5 días de gracia</b> para regularizarlo antes de que la cuenta se pause — durante esos días seguís operando con normalidad. El sistema avisa visualmente cuando te acercás al límite de productos o usuarios de tu plan, pero eso no bloquea la carga por sí solo; el bloqueo real (con opción de mejorar el plan al instante) ocurre solo al intentar usar Factura electrónica o las integraciones de e-commerce sin el plan correspondiente.</div>
                </section>

                <footer className="mu-footer">
                    Manual generado a partir del funcionamiento real del sistema. Ante cualquier duda, escribinos a <a href="mailto:info@totalstock.com.ar">info@totalstock.com.ar</a>.
                </footer>

            </div>

            <style>{`
                .manual-uso {
                    background: var(--ts-bg);
                    color: var(--ts-text);
                    font-family: var(--ts-font);
                    line-height: 1.6;
                    min-height: 100vh;
                }
                .manual-uso .mu-doc {
                    max-width: 760px;
                    margin: 0 auto;
                    padding: 48px 24px 100px;
                }

                .manual-uso .mu-masthead { margin-bottom: 56px; }
                .manual-uso .mu-logo { height: 56px; display: block; margin-bottom: 22px; }
                .manual-uso h1.mu-title {
                    font-family: var(--ts-font);
                    font-size: clamp(30px, 5vw, 40px);
                    line-height: 1.15;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    text-wrap: balance;
                    margin: 0 0 12px;
                    color: var(--ts-text);
                }
                .manual-uso .mu-subtitle {
                    font-size: 16px;
                    color: var(--ts-text-muted);
                    max-width: 56ch;
                    margin: 0;
                }
                .manual-uso .mu-masthead-rule {
                    height: 1px;
                    background: linear-gradient(to right, var(--ts-border), transparent 85%);
                    margin-top: 36px;
                }

                .manual-uso .mu-role-legend {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px 28px;
                    margin: 26px 0 0;
                    padding: 16px 20px;
                    background: var(--ts-surface);
                    border: 1px solid var(--ts-border);
                    border-radius: var(--ts-radius);
                    box-shadow: var(--ts-shadow-sm);
                    font-size: 13.5px;
                    color: var(--ts-text-2);
                }
                .manual-uso .mu-role-legend b { color: var(--ts-text); font-weight: 700; }

                .manual-uso nav.mu-toc { margin: 40px 0 8px; }
                .manual-uso .mu-toc-label {
                    font-size: 11.5px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: var(--ts-text-muted);
                    margin-bottom: 12px;
                }
                .manual-uso nav.mu-toc ol {
                    list-style: none; margin: 0; padding: 0;
                    display: grid; grid-template-columns: 1fr 1fr; gap: 2px 28px;
                    border-top: 1px solid var(--ts-border);
                }
                @media (max-width: 560px) { .manual-uso nav.mu-toc ol { grid-template-columns: 1fr; } }
                .manual-uso nav.mu-toc li { border-bottom: 1px solid var(--ts-border); }
                .manual-uso nav.mu-toc a {
                    display: flex; align-items: baseline; gap: 10px;
                    padding: 9px 2px; color: var(--ts-text); text-decoration: none; font-size: 14.5px;
                }
                .manual-uso nav.mu-toc a:hover { color: var(--ts-green-dark); text-decoration: none; }
                .manual-uso nav.mu-toc .n {
                    font-variant-numeric: tabular-nums;
                    color: var(--ts-green-dark); font-weight: 700; font-size: 13px; min-width: 18px;
                }

                .manual-uso section.mu-chapter { margin-top: 68px; scroll-margin-top: 20px; }
                .manual-uso .mu-eyebrow { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; }
                .manual-uso .mu-num { font-size: 14px; font-weight: 800; color: var(--ts-green-dark); }
                .manual-uso .mu-eyebrow .line { flex: 1; height: 1px; background: var(--ts-border); }
                .manual-uso h2.mu-chapter-title {
                    font-size: 25px; font-weight: 800; letter-spacing: -0.005em;
                    margin: 0 0 6px; text-wrap: balance; color: var(--ts-text);
                }
                .manual-uso p.mu-what { font-size: 15.5px; color: var(--ts-text-2); max-width: 62ch; margin: 0 0 26px; }
                .manual-uso p.mu-what b { color: var(--ts-text); font-weight: 700; }

                .manual-uso h3 {
                    font-size: 11.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
                    color: var(--ts-green-dark); margin: 28px 0 12px;
                }
                .manual-uso .mu-body p { margin: 0 0 14px; max-width: 68ch; color: var(--ts-text-2); }
                .manual-uso .mu-body ul, .manual-uso .mu-body ol.mu-steps { margin: 0 0 4px; padding-left: 22px; }
                .manual-uso .mu-body li { margin-bottom: 9px; max-width: 66ch; color: var(--ts-text-2); }
                .manual-uso .mu-body li::marker { color: var(--ts-green-dark); }
                .manual-uso .mu-body strong { color: var(--ts-text); font-weight: 700; }

                .manual-uso ol.mu-steps { counter-reset: step; list-style: none; padding-left: 0; }
                .manual-uso ol.mu-steps li { counter-increment: step; position: relative; padding-left: 34px; margin-bottom: 12px; }
                .manual-uso ol.mu-steps li::before {
                    content: counter(step);
                    position: absolute; left: 0; top: 0.5px;
                    width: 22px; height: 22px; border-radius: 50%;
                    background: var(--ts-success-bg); color: var(--ts-green-dark);
                    font-size: 12px; font-weight: 700;
                    display: flex; align-items: center; justify-content: center;
                    font-variant-numeric: tabular-nums;
                }

                .manual-uso .mu-callout {
                    background: var(--ts-success-bg);
                    border: 1px solid var(--ts-success-border);
                    border-radius: var(--ts-radius-sm);
                    padding: 13px 18px;
                    font-size: 14px;
                    color: var(--ts-success-text);
                    margin: 14px 0 22px;
                }
                .manual-uso .mu-callout b { color: var(--ts-success-text); }
                .manual-uso .mu-callout::before {
                    content: "Nota"; display: block;
                    font-size: 10.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
                    color: var(--ts-green-dark); margin-bottom: 6px;
                }
                .manual-uso .mu-callout.warn {
                    background: var(--ts-warning-bg);
                    border-color: var(--ts-warning-border);
                    color: var(--ts-warning-text);
                }
                .manual-uso .mu-callout.warn b { color: var(--ts-warning-text); }
                .manual-uso .mu-callout.warn::before { content: "Importante"; color: var(--ts-warning); }

                .manual-uso .mu-meta {
                    display: flex; flex-wrap: wrap; gap: 10px 32px;
                    margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--ts-border);
                }
                .manual-uso .mu-meta-block { font-size: 13px; }
                .manual-uso .mu-label {
                    color: var(--ts-text-muted); font-size: 11px; font-weight: 700;
                    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; display: block;
                }
                .manual-uso .mu-pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
                .manual-uso .mu-pill {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 3px 10px 4px; border-radius: 100px;
                    font-size: 12.5px; font-weight: 700; color: #fff; white-space: nowrap;
                }
                .manual-uso .mu-pill.inline { margin-left: 4px; }
                .manual-uso .mu-pill.staff { background: var(--ts-info); }
                .manual-uso .mu-pill.supervisor { background: var(--ts-warning); }
                .manual-uso .mu-pill.admin { background: var(--ts-heading); }
                .manual-uso .mu-pill.starter { background: var(--ts-green); color: #123420; }
                .manual-uso .mu-pill.pro { background: var(--ts-heading-light); }
                .manual-uso .mu-pill.advanced { background: var(--ts-teal-dark); }
                .manual-uso .mu-pill-none {
                    display: inline-flex; padding: 3px 10px 4px; border-radius: 100px;
                    font-size: 12.5px; font-weight: 700;
                    background: var(--ts-success-bg); color: var(--ts-green-dark);
                }

                .manual-uso .mu-table-wrap { overflow-x: auto; margin: 6px 0 22px; }
                .manual-uso table {
                    border-collapse: collapse; width: 100%; min-width: 480px; font-size: 13.5px;
                }
                .manual-uso th, .manual-uso td {
                    text-align: left; padding: 11px 16px; border-bottom: 1px solid var(--ts-border);
                    font-variant-numeric: tabular-nums;
                }
                .manual-uso th {
                    font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
                    color: var(--ts-text-muted); border-bottom: 1px solid var(--ts-border);
                }
                .manual-uso td.center, .manual-uso th.center { text-align: center; }
                .manual-uso .yes { color: var(--ts-green-dark); font-weight: 700; }
                .manual-uso .no { color: var(--ts-text-muted); }
                .manual-uso .mu-plan-table td:first-child, .manual-uso .mu-plan-table th:first-child {
                    color: var(--ts-text-2); font-weight: 600;
                }

                .manual-uso footer.mu-footer {
                    margin-top: 80px; padding-top: 24px; border-top: 1px solid var(--ts-border);
                    font-size: 13px; color: var(--ts-text-muted);
                }
                .manual-uso footer.mu-footer a { color: var(--ts-green-dark); text-decoration: none; }
                .manual-uso footer.mu-footer a:hover { text-decoration: underline; }

                @media print {
                    .manual-uso .mu-doc { max-width: none; }
                    .manual-uso section.mu-chapter { break-inside: avoid-page; }
                }
            `}</style>
        </div>
    );
};

export default ManualUso;
