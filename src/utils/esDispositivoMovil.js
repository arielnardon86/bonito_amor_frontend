// El selector nativo de "compartir" (navigator.share) solo lleva de forma confiable
// a WhatsApp en celulares/tablets. En Mac/Windows/Linux abre el panel genérico de
// Compartir del sistema operativo, que no siempre incluye WhatsApp -- ahí conviene
// bajar el PDF y abrir WhatsApp Web/Desktop directamente.
export const esDispositivoMovil = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
