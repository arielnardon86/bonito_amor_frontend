/**
 * Redimensiona/recorta una imagen a un cuadrado chico y la devuelve como data URI
 * base64 (JPEG), lista para mostrarse circular vía CSS (border-radius: 50%).
 */
export function resizeLogoToBase64(file, tamano = 160) {
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

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
