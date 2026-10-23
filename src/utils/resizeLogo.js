/**
 * Redimensiona/recorta una imagen a un cuadrado chico y la devuelve como data URI
 * base64, lista para mostrarse circular vía CSS (border-radius: 50%).
 *
 * Formato de salida: si el archivo original soporta transparencia (PNG, WEBP,
 * GIF), se exporta como PNG para no perderla -- importante para el logo, que
 * en el navbar se recorta en círculo (ahí la transparencia no se nota), pero
 * en los comprobantes (recibo/factura) se muestra como rectángulo, y un fondo
 * sólido metido a la fuerza quedaba como un recuadro feo alrededor del logo.
 * Para el resto (JPEG, fotos de producto) se mantiene JPEG: comprime mucho
 * mejor que PNG en fotografías, y esas imágenes viajan embebidas en cada fila
 * del listado de productos, donde el tamaño sí importa.
 */
export function resizeLogoToBase64(file, tamano = 160) {
  const soportaTransparencia = ['image/png', 'image/webp', 'image/gif'].includes(file.type);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const offsetX = (img.width - lado) / 2;
        const offsetY = (img.height - lado) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = tamano;
        canvas.height = tamano;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, offsetX, offsetY, lado, lado, 0, 0, tamano, tamano);

        resolve(soportaTransparencia ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
