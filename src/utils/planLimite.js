// Los endpoints que enforzan límites de plan (crear producto, crear usuario,
// procesar venta, carga masiva) devuelven 403 con el mismo shape cuando se
// llega al tope: { limite: true, tipo, plan_actual, planes_sugeridos, mensaje, ... }
// (ver backend/inventario/plan_enforcement.py). Este helper detecta ese shape
// en un error de axios y devuelve los datos ya normalizados para <ModalUpgrade>,
// o null si el error no es por límite de plan (para que el caller siga con su
// manejo de error genérico de siempre).
export const extraerLimitePlan = (err) => {
    const data = err?.response?.data;
    if (!data || data.limite !== true) return null;
    return {
        planActual: data.plan_actual,
        planesSugeridos: data.planes_sugeridos || [],
        mensaje: data.mensaje || '',
    };
};
