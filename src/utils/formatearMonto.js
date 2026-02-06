/**
 * Formatea montos con punto como separador de miles y coma para decimales.
 * Ejemplo: 24500.5 → "$24.500,50"
 * @param {number|string} valor - Valor a formatear
 * @param {boolean} conSimbolo - Si incluir el símbolo $ (default: true)
 * @returns {string}
 */
export const formatearMonto = (valor, conSimbolo = true) => {
  const num = parseFloat(valor) || 0;
  const [enteros = '0', decimales = '00'] = num.toFixed(2).split('.');
  const enterosFormateados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const resultado = `${enterosFormateados},${decimales}`;
  return conSimbolo ? `$${resultado}` : resultado;
};
